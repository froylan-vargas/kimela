import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/presentation/decorators/public.decorator';

@Controller('jobs')
export class JobsController {
  @Public()
  @Post('trigger')
  trigger(
    @Headers('x-cloudscheduler-jobname') jobName: string,
    @Headers('x-scheduler-secret') secret: string,
  ) {
    const expected = process.env.SCHEDULER_SECRET;
    if (!jobName || !expected || secret !== expected) {
      throw new UnauthorizedException();
    }
    return { triggered: true };
  }
}
