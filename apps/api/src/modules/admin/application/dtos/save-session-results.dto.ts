import { IsNumberString } from 'class-validator';

export class SaveSessionResultsDto {
  @IsNumberString()
  homeScore!: string;

  @IsNumberString()
  awayScore!: string;
}
