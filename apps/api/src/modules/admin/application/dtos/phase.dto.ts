import { PhaseStatus, PhaseType } from '../../domain/phase.entity';

export interface PhaseDto {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
  status: PhaseStatus;
  eventId: string;
}
