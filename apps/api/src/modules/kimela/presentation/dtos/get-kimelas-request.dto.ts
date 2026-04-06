import { IsEnum, IsOptional } from 'class-validator';
import { KimelaStatus } from '../../domain/kimela-status.enum';

export class GetKimelasRequestDto {
  @IsOptional()
  @IsEnum(KimelaStatus, {
    message: `status must be one of: ${Object.values(KimelaStatus).join(', ')}`,
  })
  status?: KimelaStatus;
}
