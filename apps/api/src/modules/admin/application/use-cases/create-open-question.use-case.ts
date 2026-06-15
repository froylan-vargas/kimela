import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AdminOpenQuestionDto } from './get-open-questions-by-event.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface CreateOpenQuestionResponse {
  data: AdminOpenQuestionDto;
}

@Injectable()
export class CreateOpenQuestionUseCase {
  constructor(
    @InjectPinoLogger(CreateOpenQuestionUseCase.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: { eventId: string; prompt: string }): Promise<CreateOpenQuestionResponse> {
    this.logger.info(`Creating open question for event ${command.eventId}`);

    const event = await this.prisma.event.findUnique({
      where: { id: command.eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    const max = await this.prisma.openQuestion.aggregate({
      where: { eventId: command.eventId },
      _max: { order: true },
    });

    const question = await this.prisma.openQuestion.create({
      data: {
        eventId: command.eventId,
        prompt: command.prompt,
        order: (max._max.order ?? 0) + 1,
      },
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
