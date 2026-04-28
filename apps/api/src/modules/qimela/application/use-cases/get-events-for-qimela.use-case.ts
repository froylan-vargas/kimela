import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface PhaseDto {
  id: string;
  name: string;
  order: number;
  status: string;
}

export interface QimelaEventDto {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  leagueId: string;
  leagueName: string;
  phases: PhaseDto[];
}

export interface GetEventsForQimelaResponse {
  data: QimelaEventDto[];
}

@Injectable()
export class GetEventsForQimelaUseCase {

  constructor(
    @InjectPinoLogger(GetEventsForQimelaUseCase.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(sportId: string): Promise<GetEventsForQimelaResponse> {
    this.logger.info(`Fetching events for sport ${sportId}`);

    const records = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.UPCOMING, EventStatus.ACTIVE] },
        league: { sportId },
      },
      include: {
        league: { select: { name: true } },
        phases: {
          where: { status: { not: 'ACTIVE' } },
          select: {
            id: true,
            name: true,
            order: true,
            status: true,
          },
          orderBy: { order: 'asc' },
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
      phases: record.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        order: phase.order,
        status: phase.status,
      })),
    }));

    return { data };
  }
}
