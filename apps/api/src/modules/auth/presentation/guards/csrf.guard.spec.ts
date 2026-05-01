import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

const ALLOWED = 'https://app.qimela.com';

function makeContext(method: string, headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, CORS_ORIGIN: ALLOWED, NODE_ENV: 'production' };
    guard = new CsrfGuard();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('safe methods', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s without origin', (method) => {
      expect(guard.canActivate(makeContext(method))).toBe(true);
    });
  });

  describe('origin header', () => {
    it('allows matching origin', () => {
      expect(guard.canActivate(makeContext('POST', { origin: ALLOWED }))).toBe(true);
    });

    it('blocks mismatched origin', () => {
      expect(() => guard.canActivate(makeContext('POST', { origin: 'https://evil.com' }))).toThrow(ForbiddenException);
    });
  });

  describe('referer fallback (no origin header)', () => {
    it('allows referer that starts with allowed origin', () => {
      expect(guard.canActivate(makeContext('DELETE', { referer: `${ALLOWED}/some/path` }))).toBe(true);
    });

    it('blocks referer from a different origin', () => {
      expect(() => guard.canActivate(makeContext('PUT', { referer: 'https://evil.com/page' }))).toThrow(ForbiddenException);
    });
  });

  describe('no origin or referer', () => {
    it('blocks in production', () => {
      expect(() => guard.canActivate(makeContext('POST'))).toThrow(ForbiddenException);
    });

    it('allows outside production', () => {
      process.env.NODE_ENV = 'development';
      guard = new CsrfGuard();
      expect(guard.canActivate(makeContext('POST'))).toBe(true);
    });
  });
});
