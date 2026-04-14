import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CoveredStages } from '../../domain/covered-stages.enum';

export class UpdateQimelaRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsEnum(CoveredStages)
  coveredStages?: CoveredStages;
}
