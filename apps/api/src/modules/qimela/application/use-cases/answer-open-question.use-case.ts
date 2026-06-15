import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { QimelaOpenQuestionDto } from './get-qimela-open-questions.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface AnswerOpenQuestionResponse {
  data: QimelaOpenQuestionDto;
}

@Injectable()
export class AnswerOpenQuestionUseCase {
  constructor(
    @InjectPinoLogger(AnswerOpenQuestionUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: {
    qimelaId: string;
    questionId: string;
    userId: string;
    answer: string;
  }): Promise<AnswerOpenQuestionResponse> {
    this.logger.info(`Answering open question ${command.questionId} for qimela ${command.qimelaId} and user ${command.userId}`);

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

    const question = await this.prisma.openQuestion.findFirst({
      where: { id: command.questionId, eventId: qimela.eventId },
      select: { id: true, prompt: true, status: true },
    });

    if (!question) {
      throw new NotFoundException('La pregunta no existe');
    }

    if (question.status !== 'VISIBLE') {
      throw new UnprocessableEntityException('Esta pregunta no está disponible');
    }

    const existing = await this.prisma.openQuestionResponse.findUnique({
      where: {
        questionId_userId: {
          questionId: command.questionId,
          userId: command.userId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya respondiste esta pregunta.');
    }

    try {
      const response = await this.prisma.openQuestionResponse.create({
        data: {
          questionId: command.questionId,
          userId: command.userId,
          answer: command.answer,
        },
      });

      return {
        data: {
          id: question.id,
          prompt: question.prompt,
          answered: true,
          answer: {
            id: response.id,
            answer: response.answer,
            createdAt: response.createdAt.toISOString(),
          },
        },
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya respondiste esta pregunta.');
      }
      throw error;
    }
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

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
