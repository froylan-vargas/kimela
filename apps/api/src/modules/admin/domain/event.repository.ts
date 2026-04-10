import { EventEntity } from './event.entity';

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');

export interface FindActiveBySportOptions {
  sportId: string;
}

export interface EventRepository {
  findActiveBySport(options: FindActiveBySportOptions): Promise<EventEntity[]>;
}
