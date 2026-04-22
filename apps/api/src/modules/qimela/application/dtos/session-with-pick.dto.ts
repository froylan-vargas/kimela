import { SessionStatus } from '../../../admin/domain/session.entity';

export interface SessionContenderDto {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface PickDto {
  pickCategoryId: string;
  name: string;
  label: string;
  valueType: 'CONTENDER' | 'SCALAR';
  value: string | null;
  pickedContenderId: string | null;
}

export interface SessionWithPickDto {
  id: string;
  name: string;
  scheduledAt: string;
  status: SessionStatus;
  phaseId: string;
  phaseName: string;
  home: SessionContenderDto;
  away: SessionContenderDto;
  picks: PickDto[];
  hasUserPicks: boolean;
}

export interface PhaseSessionsGroupDto {
  phaseId: string;
  phaseName: string;
  phaseOrder: number;
  sessions: SessionWithPickDto[];
}
