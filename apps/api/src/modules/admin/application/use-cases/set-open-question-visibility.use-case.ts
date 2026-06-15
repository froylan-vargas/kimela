import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AdminOpenQuestionDto } from './get-open-questions-by-event.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface SetOpenQuestionVisibilityResponse {
  data: AdminOpenQuestionDto;
}

@Injectable()
export class SetOpenQuestionVisibilityUseCase {
  constructor(
    @InjectPinoLogger(SetOpenQuestionVisibilityUseCase.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: {
    eventId: string;
    questionId: string;
    status: 'HIDDEN' | 'VISIBLE';
  }): Promise<SetOpenQuestionVisibilityResponse> {
    this.logger.info(`Setting open question ${command.questionId} to ${command.status}`);

    const existing = await this.prisma.openQuestion.findFirst({
      where: { id: command.questionId, eventId: command.eventId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('La pregunta no existe');
    }

    const question = await this.prisma.openQuestion.update({
      where: { id: command.questionId },
      data: { status: command.status },
      include: { _count: { select: { responses: true } } },
    });

    return {
      data: {
        id: question.id,
        eventId: question.eventId,
        prompt: question.prompt,
        status: question.status,
        order: question.order,
        responseCount: question._count.responses,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      },
    };
  }
}
