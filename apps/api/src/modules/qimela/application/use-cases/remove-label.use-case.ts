import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import {
  QIMELA_REPOSITORY,
  QimelaRepository,
} from "../../domain/qimela.repository";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface RemoveLabelCommand {
  qimelaId: string;
  requesterId: string;
  targetUserId: string;
  labelId: string;
}

export interface RemoveLabelResponse {
  data: { removed: boolean };
}

@Injectable()
export class RemoveLabelUseCase {
  constructor(
    @InjectPinoLogger(RemoveLabelUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RemoveLabelCommand): Promise<RemoveLabelResponse> {
    this.logger.info(
      `Removing label ${command.labelId} from user ${command.targetUserId} in qimela ${command.qimelaId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException("qimela not found");
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException("Only the creator can remove labels");
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: {
        userId_qimelaId: {
          userId: command.targetUserId,
          qimelaId: command.qimelaId,
        },
      },
    });
    if (!subscription) throw new NotFoundException("Subscription not found");

    await this.prisma.subscriptionLabel.deleteMany({
      where: { subscriptionId: subscription.id, labelId: command.labelId },
    });

    return { data: { removed: true } };
  }
}
