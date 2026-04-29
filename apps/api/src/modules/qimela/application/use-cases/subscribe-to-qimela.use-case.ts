import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import {
  QIMELA_REPOSITORY,
  QimelaRepository,
} from "../../domain/qimela.repository";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface SubscribeToQimelaCommand {
  qimelaId: string;
  userId: string;
}

export interface SubscribeToQimelaResponse {
  data: {
    subscriptionId: string;
  };
}

@Injectable()
export class SubscribeToQimelaUseCase {
  constructor(
    @InjectPinoLogger(SubscribeToQimelaUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: SubscribeToQimelaCommand,
  ): Promise<SubscribeToQimelaResponse> {
    this.logger.info(
      `Subscribing user ${command.userId} to qimela ${command.qimelaId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) {
      throw new NotFoundException("qimela not found");
    }

    if (qimela.status !== QimelaStatus.UPCOMING) {
      throw new UnprocessableEntityException(
        "Las suscripciones para esta qimela están cerradas",
      );
    }

    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          userId: command.userId,
          qimelaId: command.qimelaId,
        },
      });

      return { data: { subscriptionId: subscription.id } };
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ConflictException("Ya estás suscrito a esta qimela");
      }
      throw error;
    }
  }
}
