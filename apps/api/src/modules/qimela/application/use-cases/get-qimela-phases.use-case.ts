import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export type QimelaPhaseStatus = 'UPCOMING' | 'COMPLETED' | 'ACTIVE';

export interface QimelaPhaseDto {
  id: string;
  name: string;
  order: number;
  status: QimelaPhaseStatus;
}

export interface GetQimelaPhasesQuery {
  qimelaId: string;
  userId: string;
}

export interface GetQimelaPhasesResponse {
  data: QimelaPhaseDto[];
}

@Injectable()
export class GetQimelaPhasesUseCase {

  constructor(
    @InjectPinoLogger(GetQimelaPhasesUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetQimelaPhasesQuery): Promise<GetQimelaPhasesResponse> {
    this.logger.info(`Fetching phases for qimela ${query.qimelaId} and user ${query.userId}`);

    const qimela = await this.qimelaRepository.findById(query.qimelaId);
    if (!qimela) {
      throw new NotFoundException('La qimela no existe');
    }

    if (!qimela.eventId) {
      throw new UnprocessableEntityException({
        code: 'QIMELA_NO_EVENT',
        message: 'Esta qimela no tiene un evento asociado',
      });
    }

    await this.assertUserHasAccess(query.userId, qimela.id, qimela.creatorId);

    let phases = await this.prisma.phase.findMany({
      where: {
        eventId: qimela.eventId,
        status: { in: ['COMPLETED', 'ACTIVE'] },
      },
      select: { id: true, name: true, order: true, status: true },
      orderBy: { order: 'asc' },
    });

    if (phases.length === 0) {
      phases = await this.prisma.phase.findMany({
        where: { eventId: qimela.eventId },
        select: { id: true, name: true, order: true, status: true },
        orderBy: { order: 'asc' },
        take: 1,
      });
    }

    const data: QimelaPhaseDto[] = phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      order: phase.order,
      status: phase.status as QimelaPhaseStatus,
    }));

    return { data };
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
