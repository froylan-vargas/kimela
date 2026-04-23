import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PgBossService } from '../../../../shared/queue/pgboss.service';

export const SESSION_SCORE_PICKS_QUEUE = 'session.score-picks';

export interface SaveSessionResultsCommand {
  eventId: string;
  phaseId: string;
  sessionId: string;
  homeScore: string;
  awayScore: string;
}

@Injectable()
export class SaveSessionResultsUseCase {
  private readonly logger = new Logger(SaveSessionResultsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pgBoss: PgBossService,
  ) {}

  async execute(command: SaveSessionResultsCommand): Promise<void> {
    const { eventId, phaseId, sessionId, homeScore, awayScore } = command;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, phaseId: true, phase: { select: { eventId: true } } },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.phaseId !== phaseId || session.phase.eventId !== eventId) {
      throw new NotFoundException(`Session ${sessionId} does not belong to phase ${phaseId} or event ${eventId}`);
    }

    if (session.status === 'COMPLETED') {
      throw new ConflictException(`Session ${sessionId} is already completed`);
    }

    const sessionPickCategories = await this.prisma.sessionPickCategory.findMany({
      where: { sessionId },
      include: { pickCategory: { select: { id: true, name: true } } },
    });

    const homeCategory = sessionPickCategories.find((spc) => spc.pickCategory.name === 'score_home');
    const awayCategory = sessionPickCategories.find((spc) => spc.pickCategory.name === 'score_away');

    if (!homeCategory || !awayCategory) {
      throw new UnprocessableEntityException('Session is missing score_home or score_away pick categories');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionResult.upsert({
        where: { sessionId_pickCategoryId: { sessionId, pickCategoryId: homeCategory.pickCategoryId } },
        create: { sessionId, pickCategoryId: homeCategory.pickCategoryId, value: homeScore, contenderId: null },
        update: { value: homeScore },
      });

      await tx.sessionResult.upsert({
        where: { sessionId_pickCategoryId: { sessionId, pickCategoryId: awayCategory.pickCategoryId } },
        create: { sessionId, pickCategoryId: awayCategory.pickCategoryId, value: awayScore, contenderId: null },
        update: { value: awayScore },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });
    });

    this.logger.log(`Session ${sessionId} marked COMPLETED, enqueueing scoring job`);

    try {
      await this.pgBoss.boss.send(SESSION_SCORE_PICKS_QUEUE, { sessionId }, { retryLimit: 3 });
    } catch (err) {
      this.logger.error(`Failed to enqueue scoring job for session ${sessionId}`, err);
    }
  }
}
