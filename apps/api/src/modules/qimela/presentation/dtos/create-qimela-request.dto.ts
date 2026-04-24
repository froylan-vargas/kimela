import { IsString, IsUUID, IsArray, IsInt, Min, Max, ValidateNested, ArrayNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

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
  @MaxLength(50)
  name!: string;

  @IsUUID()
  sportId!: string;

  @IsUUID()
  eventId!: string;

  @IsUUID()
  leagueId!: string;

  @IsUUID()
  initialPhaseId!: string;

  @IsUUID()
  finalPhaseId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QimelaRuleInputDto)
  rules!: QimelaRuleInputDto[];
}
