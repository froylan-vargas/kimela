// Shared domain types and API contracts between api and web

export interface Pool {
  id: string;
  name: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  poolId: string;
  name: string;
}
