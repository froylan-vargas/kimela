import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';

export interface RemoveSubscriptionCommand {
  qimelaId: string;
  requesterId: string;
  targetUserId: string;
}

export interface RemoveSubscriptionResponse {
  data: { removed: boolean };
}

@Injectable()
export class RemoveSubscriptionUseCase {
  private readonly logger = new Logger(RemoveSubscriptionUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY) private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RemoveSubscriptionCommand): Promise<RemoveSubscriptionResponse> {
    this.logger.log(
      `Removing subscription of user ${command.targetUserId} from qimela ${command.qimelaId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException('Qimela not found');
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException('Only the creator can remove subscribers');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId_qimelaId: { userId: command.targetUserId, qimelaId: command.qimelaId } },
    });

    if (!subscription) throw new NotFoundException('Subscription not found');

    await this.prisma.subscription.delete({
      where: { id: subscription.id },
    });

    return { data: { removed: true } };
  }
}
