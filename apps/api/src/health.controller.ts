import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/presentation/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
