import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface QimelaOpenQuestionDto {
  id: string;
  prompt: string;
  answered: boolean;
  answer: {
    id: string;
    answer: string;
    createdAt: string;
  } | null;
}

export interface GetQimelaOpenQuestionsResponse {
  data: QimelaOpenQuestionDto[];
}

@Injectable()
export class GetQimelaOpenQuestionsUseCase {
  constructor(
    @InjectPinoLogger(GetQimelaOpenQuestionsUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: { qimelaId: string; userId: string }): Promise<GetQimelaOpenQuestionsResponse> {
    this.logger.info(`Fetching open questions for qimela ${command.qimelaId} and user ${command.userId}`);

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

    const questions = await this.prisma.openQuestion.findMany({
      where: { eventId: qimela.eventId, status: 'VISIBLE' },
      include: {
        responses: {
          where: { userId: command.userId },
          select: { id: true, answer: true, createdAt: true },
          take: 1,
        },
      },
      orderBy: { order: 'asc' },
    });

    return {
      data: questions.map((question) => {
        const response = question.responses[0] ?? null;
        return {
          id: question.id,
          prompt: question.prompt,
          answered: response !== null,
          answer: response
            ? {
                id: response.id,
                answer: response.answer,
                createdAt: response.createdAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }

  private async assertUserHasAccess(userId: string, qimelaId: string, creatorId: string): Promise<void> {
    if (creatorId === userId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, qimelaId },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No tienes acceso a esta qimela');
    }
  }
}
