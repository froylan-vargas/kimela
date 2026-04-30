import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PgBossService } from '../../../shared/queue/pgboss.service';
import { PickScoringService } from './pick-scoring.service';
import { SESSION_SCORE_PICKS_QUEUE } from '../../admin/application/use-cases/save-session-results.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const RETRY_LIMIT = 3;
const DELETE_AFTER_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class ScoringWorkerService implements OnModuleInit {

  constructor(
    @InjectPinoLogger(ScoringWorkerService.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly pgBoss: PgBossService,
    private readonly pickScoring: PickScoringService,
  ) {}

  async onModuleInit(): Promise<void> {
    const { boss } = this.pgBoss;

    await boss.createQueue(SESSION_SCORE_PICKS_QUEUE, {
      retryLimit: RETRY_LIMIT,
      retryBackoff: true,
      deleteAfterSeconds: DELETE_AFTER_SECONDS,
    });

    await boss.work<{ sessionId: string }>(SESSION_SCORE_PICKS_QUEUE, async (jobs) => {
      for (const job of jobs) {
        await this.processJob(job.data.sessionId);
      }
    });

    this.logger.info('Scoring worker registered');
  }

  private async processJob(sessionId: string): Promise<void> {
    this.logger.info(`Scoring picks for session ${sessionId}`);

    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          phase: { select: { eventId: true } },
          results: {
            include: {
              pickCategory: { select: { id: true, name: true, valueType: true } },
            },
          },
          sessionCategories: {
            include: {
              pickCategory: { select: { id: true, name: true, valueType: true } },
            },
          },
        },
      });

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found, skipping scoring`);
        return;
      }

      if (session.status !== 'COMPLETED') {
        this.logger.info(`Session ${sessionId} is ${session.status}, clearing points without re-scoring`);
        await this.clearSessionPoints(sessionId, session.phase.eventId);
        return;
      }

      const { eventId } = session.phase;
      const categories = session.sessionCategories.map((sc) => sc.pickCategory);
      const results = session.results.map((r) => ({
        pickCategoryId: r.pickCategoryId,
        value: r.value,
        contenderId: r.contenderId,
      }));

      const qimelas = await this.prisma.qimela.findMany({
        where: { eventId },
        include: {
          rules: {
            include: { rule: { select: { slug: true } } },
          },
          subscriptions: { select: { userId: true } },
        },
      });

      for (const qimela of qimelas) {
        await this.scoreQimela({ qimela, sessionId, categories, results });
      }

      this.logger.info(`Scoring complete for session ${sessionId}`);
    } catch (err) {
      this.logger.error(`Scoring failed for session ${sessionId}`, err);
      throw err;
    }
  }

  private async scoreQimela(params: {
    qimela: {
      id: string;
      creatorId: string;
      rules: { points: number; rule: { slug: string } }[];
      subscriptions: { userId: string }[];
    };
    sessionId: string;
    categories: { id: string; name: string; valueType: 'CONTENDER' | 'SCALAR' }[];
    results: { pickCategoryId: string; value: string | null; contenderId: string | null }[];
  }): Promise<void> {
    const { qimela, sessionId, categories, results } = params;

    const rules = qimela.rules.map((qr) => ({ slug: qr.rule.slug, points: qr.points }));

    const subscriberIds = new Set(qimela.subscriptions.map((s) => s.userId));
    subscriberIds.add(qimela.creatorId);
    const userIds = [...subscriberIds];

    const allPicks = await this.prisma.userPick.findMany({
      where: { sessionId, qimelaId: qimela.id, userId: { in: userIds } },
      select: {
        userId: true,
        pickCategoryId: true,
        value: true,
        pickedContenderId: true,
      },
    });

    const picksByUser = new Map<string, typeof allPicks>();
    for (const userId of userIds) {
      picksByUser.set(userId, []);
    }
    for (const pick of allPicks) {
      picksByUser.get(pick.userId)?.push(pick);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userSessionPoints.deleteMany({
        where: { sessionId, qimelaId: qimela.id },
      });

      const sessionPointRows: { userId: string; points: number; exactResult: boolean }[] = [];

      for (const userId of userIds) {
        const userPicks = picksByUser.get(userId) ?? [];
        const scored = this.pickScoring.computePoints(userPicks, results, categories, rules);

        await tx.userSessionPoints.create({
          data: {
            userId,
            sessionId,
            qimelaId: qimela.id,
            points: scored.points,
            exactResult: scored.exactResult,
            correctPick: scored.correctPick,
          },
        });

        sessionPointRows.push({ userId, points: scored.points, exactResult: scored.exactResult });
      }

      for (const { userId } of sessionPointRows) {
        const aggregate = await tx.userSessionPoints.aggregate({
          where: { userId, qimelaId: qimela.id },
          _sum: { points: true },
        });

        const exactCount = await tx.userSessionPoints.count({
          where: { userId, qimelaId: qimela.id, exactResult: true },
        });

        const correctCount = await tx.userSessionPoints.count({
          where: { userId, qimelaId: qimela.id, correctPick: true },
        });

        await tx.userQimelaPoints.upsert({
          where: { userId_qimelaId: { userId, qimelaId: qimela.id } },
          create: {
            userId,
            qimelaId: qimela.id,
            totalPoints: aggregate._sum.points ?? 0,
            correctPicksCount: correctCount,
            exactResultsCount: exactCount,
          },
          update: {
            totalPoints: aggregate._sum.points ?? 0,
            correctPicksCount: correctCount,
            exactResultsCount: exactCount,
          },
        });
      }
    });

    this.logger.info(`Scored ${userIds.length} users for qimela ${qimela.id}, session ${sessionId}`);
  }

  private async clearSessionPoints(sessionId: string, eventId: string): Promise<void> {
    const qimelas = await this.prisma.qimela.findMany({
      where: { eventId },
      include: { subscriptions: { select: { userId: true } } },
    });

    for (const qimela of qimelas) {
      const subscriberIds = new Set(qimela.subscriptions.map((s) => s.userId));
      subscriberIds.add(qimela.creatorId);
      const userIds = [...subscriberIds];

      await this.prisma.$transaction(async (tx) => {
        await tx.userSessionPoints.deleteMany({ where: { sessionId, qimelaId: qimela.id } });

        for (const userId of userIds) {
          const aggregate = await tx.userSessionPoints.aggregate({
            where: { userId, qimelaId: qimela.id },
            _sum: { points: true },
          });
          const exactCount = await tx.userSessionPoints.count({
            where: { userId, qimelaId: qimela.id, exactResult: true },
          });
          const correctCount = await tx.userSessionPoints.count({
            where: { userId, qimelaId: qimela.id, correctPick: true },
          });

          await tx.userQimelaPoints.upsert({
            where: { userId_qimelaId: { userId, qimelaId: qimela.id } },
            create: {
              userId,
              qimelaId: qimela.id,
              totalPoints: aggregate._sum.points ?? 0,
              correctPicksCount: correctCount,
              exactResultsCount: exactCount,
            },
            update: {
              totalPoints: aggregate._sum.points ?? 0,
              correctPicksCount: correctCount,
              exactResultsCount: exactCount,
            },
          });
        }
      });
    }

    this.logger.info(`Cleared session points for session ${sessionId} across ${qimelas.length} qimelas`);
  }
}
