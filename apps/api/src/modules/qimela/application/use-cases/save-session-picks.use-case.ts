import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PickDto } from '../dtos/session-with-pick.dto';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { PickInput, SESSION_PICK_REPOSITORY, SessionPickRepository } from '../../domain/session-pick.repository';
import { getFloatingNow } from '../utils/session-time';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const PICKS_DEADLINE_MS = 3 * 60 * 1000;

type SessionPickCategoryRow = {
  pickCategory: {
    id: string;
    name: string;
    label: string;
    valueType: 'CONTENDER' | 'SCALAR';
  };
};

export interface SaveSessionPicksCommand {
  qimelaId: string;
  sessionId: string;
  userId: string;
  picks: PickInput[];
}

export interface SaveSessionPicksResponse {
  data: {
    sessionId: string;
    picks: PickDto[];
  };
}

@Injectable()
export class SaveSessionPicksUseCase {

  constructor(
    @InjectPinoLogger(SaveSessionPicksUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(SESSION_PICK_REPOSITORY)
    private readonly sessionPickRepository: SessionPickRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: SaveSessionPicksCommand): Promise<SaveSessionPicksResponse> {
    this.logger.info(`Saving session picks for qimela ${command.qimelaId}, session ${command.sessionId}, user ${command.userId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) {
      throw new NotFoundException('La qimela no existe');
    }

    if (!qimela.eventId) {
      throw new UnprocessableEntityException({
        code: 'QIMELA_NO_EVENT',
        message: 'Esta qimela no tiene un evento asociado',
      });
    }

    await this.assertUserHasAccess(command.userId, qimela.id, qimela.creatorId);

    const session = await this.prisma.session.findUnique({
      where: { id: command.sessionId },
      include: {
        phase: {
          select: { eventId: true },
        },
        sessionCategories: {
          include: {
            pickCategory: {
              select: { id: true, name: true, label: true, valueType: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('La sesión no existe');
    }

    if (session.phase.eventId !== qimela.eventId) {
      throw new UnprocessableEntityException('La sesión no pertenece al evento de esta qimela');
    }

    if (session.scheduledAt.getTime() - getFloatingNow().getTime() < PICKS_DEADLINE_MS) {
      throw new UnprocessableEntityException({
        code: 'PICKS_DEADLINE_PASSED',
        message: 'No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos',
      });
    }

    if (session.status !== 'SCHEDULED') {
      throw new UnprocessableEntityException({
        code: 'PICKS_SESSION_NOT_OPEN',
        message: 'Solo puedes registrar pronósticos en sesiones programadas',
      });
    }

    const categoriesById = new Map(
      session.sessionCategories.map((sessionCategory: SessionPickCategoryRow) => [
        sessionCategory.pickCategory.id,
        sessionCategory.pickCategory,
      ]),
    );

    for (const pick of command.picks) {
      const category = categoriesById.get(pick.pickCategoryId);

      if (!category) {
        throw new UnprocessableEntityException({
          code: 'PICK_CATEGORY_NOT_IN_SESSION',
          message: 'La categoría de pronóstico no pertenece a esta sesión',
        });
      }

      if (category.valueType === 'SCALAR') {
        const value = pick.value ?? '';
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
          throw new BadRequestException('El marcador debe ser un número entero entre 0 y 99');
        }
      }
    }

    const picks = await this.sessionPickRepository.savePicksForSession({
      userId: command.userId,
      sessionId: command.sessionId,
      picks: command.picks,
    });

    this.logger.info(`Saved ${picks.length} picks for session ${command.sessionId} and user ${command.userId}`);

    return {
      data: {
        sessionId: command.sessionId,
        picks,
      },
    };
  }

  private async assertUserHasAccess(userId: string, qimelaId: string, creatorId: string): Promise<void> {
    if (creatorId === userId) {
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, qimelaId },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No tienes acceso a esta qimela');
    }
  }
}
