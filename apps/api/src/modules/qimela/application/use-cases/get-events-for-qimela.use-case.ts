import { Injectable, Logger } from '@nestjs/common';
import { EventStatus, PhaseType, SessionStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CoveredStages } from '../../domain/covered-stages.enum';

export interface QimelaEventDto {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  leagueId: string;
  leagueName: string;
  availableCoveredStages: CoveredStages[];
}

export interface GetEventsForQimelaResponse {
  data: QimelaEventDto[];
}

type PhaseWithSessions = {
  type: PhaseType;
  sessions: { status: SessionStatus }[];
};

@Injectable()
export class GetEventsForQimelaUseCase {
  private readonly logger = new Logger(GetEventsForQimelaUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(sportId: string): Promise<GetEventsForQimelaResponse> {
    this.logger.log(`Fetching events for sport ${sportId}`);

    const records = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.UPCOMING, EventStatus.ACTIVE] },
        league: { sportId },
      },
      include: {
        league: { select: { name: true } },
        phases: {
          select: {
            type: true,
            sessions: { select: { status: true } },
          },
        },
      },
    });

    const data: QimelaEventDto[] = records.map((record) => ({
      id: record.id,
      name: record.name,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      status: record.status,
      leagueId: record.leagueId,
      leagueName: record.league.name,
      availableCoveredStages: this.computeAvailableCoveredStages(
        record.phases as PhaseWithSessions[],
      ),
    }));

    return { data };
  }

  /**
   * Determines which CoveredStages options are still available for an event.
   *
   * - REGULAR_SEASON: event has at least one REGULAR_SEASON phase that is not fully completed.
   * - PLAYOFFS: event has at least one PLAYOFFS phase that is not fully completed.
   * - FULL: both REGULAR_SEASON and PLAYOFFS are available.
   *
   * "Not fully completed" means the phase has no sessions OR at least one session
   * with a status other than COMPLETED / CANCELLED.
   */
  private computeAvailableCoveredStages(phases: PhaseWithSessions[]): CoveredStages[] {
    const isPhaseAvailable = (phase: PhaseWithSessions): boolean => {
      if (phase.sessions.length === 0) return true;
      return phase.sessions.some(
        (s) => s.status !== SessionStatus.COMPLETED && s.status !== SessionStatus.CANCELLED,
      );
    };

    const hasAvailableRegularSeason = phases
      .filter((p) => p.type === PhaseType.REGULAR_SEASON)
      .some(isPhaseAvailable);

    const hasAvailablePlayoffs = phases
      .filter((p) => p.type === PhaseType.PLAYOFFS)
      .some(isPhaseAvailable);

    const available: CoveredStages[] = [];

    if (hasAvailableRegularSeason) available.push(CoveredStages.REGULAR_SEASON);
    if (hasAvailablePlayoffs) available.push(CoveredStages.PLAYOFFS);
    if (hasAvailableRegularSeason && hasAvailablePlayoffs) available.push(CoveredStages.FULL);

    return available;
  }
}
