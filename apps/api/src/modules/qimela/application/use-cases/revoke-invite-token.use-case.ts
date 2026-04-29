import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  QIMELA_REPOSITORY,
  QimelaRepository,
} from "../../domain/qimela.repository";
import {
  INVITE_TOKEN_REPOSITORY,
  InviteTokenRepository,
} from "../../domain/invite-token.repository";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface RevokeInviteTokenCommand {
  qimelaId: string;
  requesterId: string;
}

@Injectable()
export class RevokeInviteTokenUseCase {
  constructor(
    @InjectPinoLogger(RevokeInviteTokenUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(INVITE_TOKEN_REPOSITORY)
    private readonly inviteTokenRepository: InviteTokenRepository,
  ) {}

  async execute(command: RevokeInviteTokenCommand): Promise<void> {
    this.logger.info(`Revoking invite token for qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) {
      throw new NotFoundException(`qimela ${command.qimelaId} not found`);
    }

    if (!qimela.isCreatedBy(command.requesterId)) {
      throw new ForbiddenException(
        "Solo el creador puede revocar el enlace de invitación",
      );
    }

    const inviteToken = await this.inviteTokenRepository.findByQimelaId(
      command.qimelaId,
    );
    if (!inviteToken || !inviteToken.isActive()) {
      throw new NotFoundException(
        "No active invite link found for this qimela",
      );
    }

    await this.inviteTokenRepository.revoke(inviteToken.id);
  }
}
