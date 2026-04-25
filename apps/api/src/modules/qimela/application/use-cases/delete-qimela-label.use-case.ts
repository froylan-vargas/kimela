import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';

export interface DeleteQimelaLabelCommand {
  qimelaId: string;
  requesterId: string;
  labelId: string;
}

export interface DeleteQimelaLabelResponse {
  data: { deleted: boolean };
}

@Injectable()
export class DeleteQimelaLabelUseCase {
  private readonly logger = new Logger(DeleteQimelaLabelUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY) private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: DeleteQimelaLabelCommand): Promise<DeleteQimelaLabelResponse> {
    this.logger.log(`Deleting label ${command.labelId} from qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException('Qimela not found');
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException('Only the creator can manage labels');
    }

    const label = await this.prisma.qimelaLabel.findFirst({
      where: { id: command.labelId, qimelaId: command.qimelaId },
    });
    if (!label) throw new NotFoundException('Label not found');

    await this.prisma.qimelaLabel.delete({ where: { id: command.labelId } });

    return { data: { deleted: true } };
  }
}
