export interface EventProps {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  leagueId: string;
  leagueName: string;
}

export class EventEntity {
  readonly id: string;
  readonly name: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly status: string;
  readonly leagueId: string;
  readonly leagueName: string;

  constructor(props: EventProps) {
    this.id = props.id;
    this.name = props.name;
    this.startsAt = props.startsAt;
    this.endsAt = props.endsAt;
    this.status = props.status;
    this.leagueId = props.leagueId;
    this.leagueName = props.leagueName;
  }
}
