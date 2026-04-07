import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../users/domain/user-role.enum';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload =>
    ctx.switchToHttp().getRequest().user,
);
