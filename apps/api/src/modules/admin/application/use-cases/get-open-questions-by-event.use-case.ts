import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface AdminOpenQuestionDto {
  id: string;
  eventId: string;
  prompt: string;
  status: 'HIDDEN' | 'VISIBLE';
  order: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetOpenQuestionsByEventResponse {
  data: AdminOpenQuestionDto[];
}

@Injectable()
export class GetOpenQuestionsByEventUseCase {
  constructor(
    @InjectPinoLogger(GetOpenQuestionsByEventUseCase.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(eventId: string): Promise<GetOpenQuestionsByEventResponse> {
    this.logger.info(`Fetching open questions for event ${eventId}`);

    const questions = await this.prisma.openQuestion.findMany({
      where: { eventId },
      include: { _count: { select: { responses: true } } },
      orderBy: { order: 'asc' },
    });

    return {
      data: questions.map((question) => ({
        id: question.id,
        eventId: question.eventId,
        prompt: question.prompt,
        status: question.status,
        order: question.order,
        responseCount: question._count.responses,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
    };
  }
}
