import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateLabelRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name!: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color!: string;
}
