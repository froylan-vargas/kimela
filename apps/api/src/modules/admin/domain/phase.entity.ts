export type PhaseType = 'REGULAR_SEASON' | 'PLAYOFFS' | 'OTHER';

export interface PhaseProps {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
  eventId: string;
}

export class PhaseEntity {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly type: PhaseType;
  readonly eventId: string;

  constructor(props: PhaseProps) {
    this.id = props.id;
    this.name = props.name;
    this.order = props.order;
    this.type = props.type;
    this.eventId = props.eventId;
  }
}
