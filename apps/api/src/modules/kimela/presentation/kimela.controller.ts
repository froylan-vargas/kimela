import { Controller, Get, Query, Logger } from '@nestjs/common';
import { GetKimelasForUserUseCase } from '../application/use-cases/get-kimelas-for-user.use-case';
import { PaginatedKimelaResponse } from '../application/dtos/kimela.dto';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { GetKimelasRequestDto } from './dtos/get-kimelas-request.dto';

@Controller('kimelas')
export class KimelaController {
  private readonly logger = new Logger(KimelaController.name);

  constructor(private readonly getKimelasForUser: GetKimelasForUserUseCase) {}

  @Get()
  async getKimelas(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetKimelasRequestDto,
  ): Promise<PaginatedKimelaResponse> {
    this.logger.log(`GET /kimelas requested by user ${user.id}`);

    return this.getKimelasForUser.execute({
      userId: user.id,
      status: query.status,
    });
  }
}
