export type PhaseType = 'REGULAR_SEASON' | 'PLAYOFFS' | 'OTHER';
export type PhaseStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface PhaseProps {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
  status: PhaseStatus;
  eventId: string;
}

export class PhaseEntity {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly type: PhaseType;
  readonly status: PhaseStatus;
  readonly eventId: string;

  constructor(props: PhaseProps) {
    this.id = props.id;
    this.name = props.name;
    this.order = props.order;
    this.type = props.type;
    this.status = props.status;
    this.eventId = props.eventId;
  }
}
