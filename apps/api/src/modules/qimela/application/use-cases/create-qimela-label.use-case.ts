import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';

const MAX_LABELS = 3;

export interface CreateQimelaLabelCommand {
  qimelaId: string;
  requesterId: string;
  name: string;
  color: string;
}

export interface LabelDto {
  id: string;
  name: string;
  color: string;
}

export interface CreateQimelaLabelResponse {
  data: LabelDto;
}

@Injectable()
export class CreateQimelaLabelUseCase {
  private readonly logger = new Logger(CreateQimelaLabelUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY) private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateQimelaLabelCommand): Promise<CreateQimelaLabelResponse> {
    this.logger.log(`Creating label for qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException('Qimela not found');
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException('Only the creator can manage labels');
    }

    const count = await this.prisma.qimelaLabel.count({ where: { qimelaId: command.qimelaId } });
    if (count >= MAX_LABELS) {
      throw new BadRequestException(`Maximum of ${MAX_LABELS} labels per qimela`);
    }

    const label = await this.prisma.qimelaLabel.create({
      data: { name: command.name.trim(), color: command.color, qimelaId: command.qimelaId },
    });

    return { data: { id: label.id, name: label.name, color: label.color } };
  }
}
