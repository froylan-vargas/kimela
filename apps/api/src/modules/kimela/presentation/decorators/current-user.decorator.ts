import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
}

/**
 * Mock user decorator — no auth implemented yet.
 * Returns a hardcoded user id until authentication is in place.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): CurrentUserPayload => {
    return { id: 'e471c62d-6015-4ab9-b930-79db54ea75c0' };
  },
);
