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
  constructor(
    @InjectPinoLogger(RemoveSubscriptionUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: RemoveSubscriptionCommand,
  ): Promise<RemoveSubscriptionResponse> {
    this.logger.info(
      `Removing subscription of user ${command.targetUserId} from qimela ${command.qimelaId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException("qimela not found");
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException("Only the creator can remove subscribers");
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

    await this.prisma.subscription.delete({
      where: { id: subscription.id },
    });

    return { data: { removed: true } };
  }
}
