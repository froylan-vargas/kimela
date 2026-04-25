import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';

export interface ApplyLabelCommand {
  qimelaId: string;
  requesterId: string;
  targetUserId: string;
  labelId: string;
}

export interface ApplyLabelResponse {
  data: { applied: boolean };
}

@Injectable()
export class ApplyLabelUseCase {
  private readonly logger = new Logger(ApplyLabelUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY) private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ApplyLabelCommand): Promise<ApplyLabelResponse> {
    this.logger.log(
      `Applying label ${command.labelId} to user ${command.targetUserId} in qimela ${command.qimelaId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException('Qimela not found');
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException('Only the creator can apply labels');
    }

    const label = await this.prisma.qimelaLabel.findFirst({
      where: { id: command.labelId, qimelaId: command.qimelaId },
    });
    if (!label) throw new NotFoundException('Label not found');

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId_qimelaId: { userId: command.targetUserId, qimelaId: command.qimelaId } },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    await this.prisma.subscriptionLabel.upsert({
      where: { subscriptionId_labelId: { subscriptionId: subscription.id, labelId: command.labelId } },
      create: { subscriptionId: subscription.id, labelId: command.labelId },
      update: {},
    });

    return { data: { applied: true } };
  }
}
