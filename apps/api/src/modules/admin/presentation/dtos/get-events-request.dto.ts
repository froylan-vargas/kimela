import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetEventsRequestDto {
  @IsUUID()
  @IsNotEmpty()
  sportId!: string;
}
