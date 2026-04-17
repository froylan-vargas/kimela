import { IsOptional, IsString, IsUUID, MaxLength, MinLength, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { QimelaRuleInputDto } from './create-qimela-request.dto';

export class UpdateQimelaRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsUUID()
  initialPhaseId?: string;

  @IsOptional()
  @IsUUID()
  finalPhaseId?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QimelaRuleInputDto)
  rules?: QimelaRuleInputDto[];
}
