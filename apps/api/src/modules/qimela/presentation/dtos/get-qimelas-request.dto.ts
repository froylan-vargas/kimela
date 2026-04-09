import { IsEnum, IsOptional } from 'class-validator';
import { QimelaStatus } from '../../domain/qimela-status.enum';

export class GetQimelasRequestDto {
  @IsOptional()
  @IsEnum(QimelaStatus, {
    message: `status must be one of: ${Object.values(QimelaStatus).join(', ')}`,
  })
  status?: QimelaStatus;
}
