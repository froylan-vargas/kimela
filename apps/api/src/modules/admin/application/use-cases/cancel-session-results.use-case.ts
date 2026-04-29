import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface CancelSessionResultsCommand {
  eventId: string;
  phaseId: string;
  sessionId: string;
  cancelledByUserId: string;
}

@Injectable()
export class CancelSessionResultsUseCase {

  constructor(
    @InjectPinoLogger(CancelSessionResultsUseCase.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CancelSessionResultsCommand): Promise<void> {
    const { eventId, phaseId, sessionId, cancelledByUserId } = command;

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

    if (session.status !== 'COMPLETED') {
      throw new ConflictException(`Session ${sessionId} is not completed — nothing to cancel`);
    }

    const sessionPickCategories = await this.prisma.sessionPickCategory.findMany({
      where: { sessionId },
      include: { pickCategory: { select: { id: true, name: true } } },
    });

    const homeCategory = sessionPickCategories.find((spc) => spc.pickCategory.name === 'score_home');
    const awayCategory = sessionPickCategories.find((spc) => spc.pickCategory.name === 'score_away');

    const results = await this.prisma.sessionResult.findMany({
      where: { sessionId },
      select: { pickCategoryId: true, value: true },
    });

    const homeResult = results.find((r) => r.pickCategoryId === homeCategory?.pickCategoryId);
    const awayResult = results.find((r) => r.pickCategoryId === awayCategory?.pickCategoryId);

    const previousHomeScore = homeResult?.value ?? '';
    const previousAwayScore = awayResult?.value ?? '';

    const qimelas = await this.prisma.qimela.findMany({
      where: { eventId },
      include: { subscriptions: { select: { userId: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionResult.deleteMany({ where: { sessionId } });

      await tx.session.update({
        where: { id: sessionId },
        data: { status: 'SCHEDULED' },
      });

      await tx.sessionResultAudit.create({
        data: {
          sessionId,
          cancelledById: cancelledByUserId,
          previousHomeScore,
          previousAwayScore,
        },
      });

      for (const qimela of qimelas) {
        await tx.userSessionPoints.deleteMany({ where: { sessionId, qimelaId: qimela.id } });

        const subscriberIds = new Set(qimela.subscriptions.map((s) => s.userId));
        subscriberIds.add(qimela.creatorId);

        for (const userId of subscriberIds) {
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
      }
    });

    this.logger.info(`Session ${sessionId} result cancelled by ${cancelledByUserId}, points cleared`);
  }
}
