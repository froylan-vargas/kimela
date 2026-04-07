import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { CurrentUserPayload } from '../../presentation/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_PUBLIC_KEY!,
      algorithms: ['RS256'],
    });
  }

  validate(payload: { sub: string; email: string; role: string }): CurrentUserPayload {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as CurrentUserPayload['role'],
      emailVerifiedAt: null,
    };
  }
}
