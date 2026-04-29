import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import {
  INVITE_TOKEN_REPOSITORY,
  InviteTokenRepository,
} from "../../domain/invite-token.repository";
import {
  QIMELA_REPOSITORY,
  QimelaRepository,
} from "../../domain/qimela.repository";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface SubscribeViaInviteTokenCommand {
  token: string;
  userId: string;
}

export interface SubscribeViaInviteTokenResponse {
  data: {
    subscriptionId: string;
  };
}

@Injectable()
export class SubscribeViaInviteTokenUseCase {
  constructor(
    @InjectPinoLogger(SubscribeViaInviteTokenUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(INVITE_TOKEN_REPOSITORY)
    private readonly inviteTokenRepository: InviteTokenRepository,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: SubscribeViaInviteTokenCommand,
  ): Promise<SubscribeViaInviteTokenResponse> {
    this.logger.info(`Subscribing user ${command.userId} via invite token`);

    const inviteToken = await this.inviteTokenRepository.findByToken(
      command.token,
    );
    if (!inviteToken) {
      throw new NotFoundException("Invite link not found");
    }

    if (!inviteToken.isActive()) {
      throw new GoneException("Este enlace de invitación ha sido revocado");
    }

    const qimela = await this.qimelaRepository.findById(inviteToken.qimelaId);
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
          qimelaId: qimela.id,
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
