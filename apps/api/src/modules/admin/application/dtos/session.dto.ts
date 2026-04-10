import { SessionStatus } from '../../domain/session.entity';

export interface ContenderInfoDto {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface SessionDto {
  id: string;
  name: string;
  scheduledAt: string;
  status: SessionStatus;
  home: ContenderInfoDto;
  away: ContenderInfoDto;
}
