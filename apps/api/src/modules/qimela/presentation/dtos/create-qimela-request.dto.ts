import { IsString, IsUUID, IsArray, IsInt, Min, Max, ValidateNested, ArrayNotEmpty, MinLength, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CoveredStages } from '../../domain/covered-stages.enum';

export class QimelaRuleInputDto {
  @IsUUID()
  ruleId!: string;

  @IsInt()
  @Min(0)
  @Max(5)
  points!: number;
}

export class CreateQimelaRequestDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  name!: string;

  @IsUUID()
  sportId!: string;

  @IsUUID()
  eventId!: string;

  @IsUUID()
  leagueId!: string;

  @IsEnum(CoveredStages)
  coveredStages!: CoveredStages;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QimelaRuleInputDto)
  rules!: QimelaRuleInputDto[];
}
