import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PhaseType } from '../../domain/phase.entity';

export class CreatePhaseRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(['REGULAR_SEASON', 'PLAYOFFS', 'OTHER'])
  @IsNotEmpty()
  type!: PhaseType;
}
