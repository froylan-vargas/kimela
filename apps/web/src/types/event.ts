export interface SportEvent {
  id: string;
  name: string;
  sportId: string;
  startsAt: string;
  endsAt: string | null;
  status: "ACTIVE" | string;
  leagueId: string;
  leagueName: string;
}
