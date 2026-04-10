import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsUUID, Min, ValidateNested } from 'class-validator';

export class PhaseOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class ReorderPhasesRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PhaseOrderItemDto)
  phases!: PhaseOrderItemDto[];
}
