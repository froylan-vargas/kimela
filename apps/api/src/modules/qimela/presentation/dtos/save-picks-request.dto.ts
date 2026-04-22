import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PickInputDto {
  @IsUUID()
  pickCategoryId!: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsUUID()
  pickedContenderId?: string;
}

export class SavePicksRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PickInputDto)
  picks!: PickInputDto[];
}
