export const SESSION_PICK_REPOSITORY = Symbol('SESSION_PICK_REPOSITORY');

export interface PickInput {
  pickCategoryId: string;
  value: string | null;
  pickedContenderId: string | null;
}

export interface SavePicksOptions {
  userId: string;
  sessionId: string;
  picks: PickInput[];
}

export interface PickRow {
  pickCategoryId: string;
  name: string;
  label: string;
  valueType: 'CONTENDER' | 'SCALAR';
  value: string | null;
  pickedContenderId: string | null;
}

export interface SessionPickRepository {
  savePicksForSession(options: SavePicksOptions): Promise<PickRow[]>;
  findPicksForUserAndSession(userId: string, sessionId: string): Promise<PickRow[]>;
}
