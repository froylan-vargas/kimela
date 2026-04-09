import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/presentation/decorators/public.decorator';

@Controller('jobs')
export class JobsController {
  @Public()
  @Post('trigger')
  trigger(@Headers('x-cloudscheduler-jobname') jobName: string) {
    if (!jobName) throw new UnauthorizedException();
    return { triggered: true };
  }
}
