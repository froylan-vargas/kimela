import { SessionFormat } from '../../domain/sport.entity';

export interface SportDto {
  id: string;
  name: string;
  imgUrl: string | null;
  sessionFormat: SessionFormat;
}
