import { ContenderInfo, SessionEntity, SessionStatus } from '../../domain/session.entity';

interface PrismaSessionContender {
  role: string | null;
  contender: {
    id: string;
    name: string;
    imgUrl: string | null;
  };
}

interface PrismaSessionWithContenders {
  id: string;
  name: string;
  scheduledAt: Date;
  status: string;
  phaseId: string;
  sportId: string;
  contenders: PrismaSessionContender[];
}

export class SessionPersistenceMapper {
  static toDomain(raw: PrismaSessionWithContenders): SessionEntity {
    const homeContender = raw.contenders.find((c) => c.role === 'home');
    const awayContender = raw.contenders.find((c) => c.role === 'away');

    if (!homeContender || !awayContender) {
      throw new Error(
        `Session ${raw.id} is missing home or away contender`,
      );
    }

    const home: ContenderInfo = {
      id: homeContender.contender.id,
      name: homeContender.contender.name,
      imgUrl: homeContender.contender.imgUrl,
    };

    const away: ContenderInfo = {
      id: awayContender.contender.id,
      name: awayContender.contender.name,
      imgUrl: awayContender.contender.imgUrl,
    };

    return new SessionEntity({
      id: raw.id,
      name: raw.name,
      scheduledAt: raw.scheduledAt,
      status: raw.status as SessionStatus,
      phaseId: raw.phaseId,
      sportId: raw.sportId,
      home,
      away,
    });
  }
}
