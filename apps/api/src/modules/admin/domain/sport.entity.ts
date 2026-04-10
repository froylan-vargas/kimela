export type SessionFormat = 'MATCHUP' | 'RACE';

export interface SportProps {
  id: string;
  name: string;
  imgUrl: string | null;
  sessionFormat: SessionFormat;
}

export class SportEntity {
  readonly id: string;
  readonly name: string;
  readonly imgUrl: string | null;
  readonly sessionFormat: SessionFormat;

  constructor(props: SportProps) {
    this.id = props.id;
    this.name = props.name;
    this.imgUrl = props.imgUrl;
    this.sessionFormat = props.sessionFormat;
  }
}
