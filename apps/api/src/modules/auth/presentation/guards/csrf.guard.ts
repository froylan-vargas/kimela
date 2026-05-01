import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigin: string;

  constructor() {
    this.allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3001';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) {
      return true;
    }

    const origin = req.headers['origin'];
    if (origin) {
      if (origin !== this.allowedOrigin) {
        throw new ForbiddenException('CSRF check failed');
      }
      return true;
    }

    const referer = req.headers['referer'];
    if (referer) {
      if (!referer.startsWith(this.allowedOrigin)) {
        throw new ForbiddenException('CSRF check failed');
      }
      return true;
    }

    // No Origin or Referer — allow only outside production (curl, Postman, server-to-server)
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    throw new ForbiddenException('CSRF check failed');
  }
}
