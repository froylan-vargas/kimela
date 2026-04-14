import { PhaseEntity, PhaseStatus, PhaseType } from './phase.entity';

export const PHASE_REPOSITORY = Symbol('PHASE_REPOSITORY');

export interface FindPhasesByEventOptions {
  eventId: string;
}

export interface CreatePhaseOptions {
  eventId: string;
  name: string;
  type: PhaseType;
}

export interface ReorderPhaseItem {
  id: string;
  order: number;
}

export interface PhaseRepository {
  findByEvent(options: FindPhasesByEventOptions): Promise<PhaseEntity[]>;
  getMaxOrderForEvent(eventId: string): Promise<number>;
  create(options: CreatePhaseOptions): Promise<PhaseEntity>;
  reorder(items: ReorderPhaseItem[]): Promise<PhaseEntity[]>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: PhaseStatus): Promise<PhaseEntity>;
  findById(id: string): Promise<PhaseEntity | null>;
}
