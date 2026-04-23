import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { SessionEntity } from '../../domain/session.entity';
import {
  FindSessionsByPhaseOptions,
  ReplaceSessionsForPhaseOptions,
  SessionRepository,
} from '../../domain/session.repository';
import { SessionPersistenceMapper } from './session-persistence.mapper';

const SESSION_WITH_CONTENDERS_INCLUDE = {
  contenders: {
    include: {
      contender: {
        select: {
          id: true,
          name: true,
          imgUrl: true,
        },
      },
    },
  },
  results: {
    include: {
      pickCategory: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  private readonly logger = new Logger(PrismaSessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByPhase(options: FindSessionsByPhaseOptions): Promise<SessionEntity[]> {
    const { phaseId } = options;

    this.logger.debug(`Finding sessions for phase ${phaseId}`);

    const records = await this.prisma.session.findMany({
      where: { phaseId },
      include: SESSION_WITH_CONTENDERS_INCLUDE,
      orderBy: { scheduledAt: 'asc' },
    });

    return records.map((record) => SessionPersistenceMapper.toDomain(record));
  }

  async replaceForPhase(options: ReplaceSessionsForPhaseOptions): Promise<SessionEntity[]> {
    const { phaseId, eventId, rows } = options;

    this.logger.debug(`Replacing sessions for phase ${phaseId}`);

    // Load event with league and sport (sessionFormat needed for format guard)
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        league: {
          include: {
            sport: { select: { sessionFormat: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Only MATCHUP format is supported for CSV session upload.
    // RACE format (F1, NASCAR, etc.) will be implemented separately.
    if (event.league.sport.sessionFormat !== 'MATCHUP') {
      throw new BadRequestException(
        `CSV session upload is only supported for MATCHUP format sports. RACE format is not yet implemented.`,
      );
    }

    // Validate phase belongs to event
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId, eventId },
    });

    if (!phase) {
      throw new NotFoundException(`Phase ${phaseId} not found for event ${eventId}`);
    }

    const leagueId = event.leagueId;
    const sportId = event.league.sportId;

    // Load all contenders for the event's league
    const contenderLeagues = await this.prisma.contenderLeague.findMany({
      where: { leagueId },
      include: {
        contender: {
          select: { id: true, name: true, imgUrl: true },
        },
      },
    });

    const contenderByName = new Map(
      contenderLeagues.map((cl) => [cl.contender.name.toLowerCase(), cl.contender]),
    );

    // Validate all contender names exist
    const missingNames: string[] = [];
    for (const row of rows) {
      if (!contenderByName.has(row.homeName.toLowerCase())) {
        missingNames.push(row.homeName);
      }
      if (!contenderByName.has(row.awayName.toLowerCase())) {
        missingNames.push(row.awayName);
      }
    }

    if (missingNames.length > 0) {
      const unique = [...new Set(missingNames)];
      throw new BadRequestException(
        `The following contenders were not found in the event's league: ${unique.join(', ')}`,
      );
    }

    // Load default pick categories for the sport
    const defaultPickCategories = await this.prisma.pickCategory.findMany({
      where: { sportId, isDefault: true },
      select: { id: true },
    });

    // Execute replace in a single transaction
    const createdSessionIds = await this.prisma.$transaction(async (tx) => {
      // Delete all existing sessions (cascades to SessionContender and SessionPickCategory)
      await tx.session.deleteMany({ where: { phaseId } });

      const ids: string[] = [];

      for (const row of rows) {
        const homeContender = contenderByName.get(row.homeName.toLowerCase())!;
        const awayContender = contenderByName.get(row.awayName.toLowerCase())!;

        const sessionName = `${homeContender.name} vs ${awayContender.name}`;

        const session = await tx.session.create({
          data: {
            name: sessionName,
            scheduledAt: row.scheduledAt,
            phaseId,
            sportId,
            contenders: {
              create: [
                { role: 'home', contenderId: homeContender.id },
                { role: 'away', contenderId: awayContender.id },
              ],
            },
            sessionCategories: {
              create: defaultPickCategories.map((pc) => ({ pickCategoryId: pc.id })),
            },
          },
          select: { id: true },
        });

        ids.push(session.id);
      }

      return ids;
    });

    this.logger.debug(`Created ${createdSessionIds.length} sessions for phase ${phaseId}`);

    // Fetch and return the full session records with contenders
    const records = await this.prisma.session.findMany({
      where: { id: { in: createdSessionIds } },
      include: SESSION_WITH_CONTENDERS_INCLUDE,
      orderBy: { scheduledAt: 'asc' },
    });

    return records.map((record) => SessionPersistenceMapper.toDomain(record));
  }
}
