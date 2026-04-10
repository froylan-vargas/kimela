import { Event as PrismaEvent } from '@prisma/client';
import { EventEntity } from '../../domain/event.entity';

type PrismaEventWithLeague = PrismaEvent & {
  league: {
    name: string;
  };
};

export class EventPersistenceMapper {
  static toDomain(raw: PrismaEventWithLeague): EventEntity {
    return new EventEntity({
      id: raw.id,
      name: raw.name,
      startsAt: raw.startsAt,
      endsAt: raw.endsAt,
      status: raw.status,
      leagueId: raw.leagueId,
      leagueName: raw.league.name,
    });
  }
}
