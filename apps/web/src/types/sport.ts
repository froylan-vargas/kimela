export type SessionFormat = 'MATCHUP' | 'RACE';

export interface Sport {
  id: string;
  name: string;
  imgUrl?: string | null;
  sessionFormat: SessionFormat;
}
