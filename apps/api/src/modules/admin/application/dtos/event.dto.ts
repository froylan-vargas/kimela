export interface EventDto {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  leagueId: string;
  leagueName: string;
}
