import { Controller, Get, Query, Logger } from '@nestjs/common';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GetQimelasRequestDto } from './dtos/get-qimelas-request.dto';

@Controller('qimelas')
export class QimelaController {
  private readonly logger = new Logger(QimelaController.name);

  constructor(private readonly getQimelasForUser: GetQimelasForUserUseCase) {}

  @Get()
  async getQimelas(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetQimelasRequestDto,
  ): Promise<PaginatedQimelaResponse> {
    this.logger.log(`GET /qimelas requested by user ${user.id}`);

    return this.getQimelasForUser.execute({
      userId: user.id,
      status: query.status,
    });
  }
}
