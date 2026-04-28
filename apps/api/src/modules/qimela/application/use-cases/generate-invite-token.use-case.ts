import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { INVITE_TOKEN_REPOSITORY, InviteTokenRepository } from '../../domain/invite-token.repository';
import { InviteTokenEntity } from '../../domain/invite-token.entity';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GenerateInviteTokenCommand {
  qimelaId: string;
  requesterId: string;
}

export interface GenerateInviteTokenResponse {
  data: { token: string };
}

@Injectable()
export class GenerateInviteTokenUseCase {

  constructor(
    @InjectPinoLogger(GenerateInviteTokenUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(INVITE_TOKEN_REPOSITORY)
    private readonly inviteTokenRepository: InviteTokenRepository,
  ) {}

  async execute(command: GenerateInviteTokenCommand): Promise<GenerateInviteTokenResponse> {
    this.logger.info(`Generating invite token for qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) {
      throw new NotFoundException(`Qimela ${command.qimelaId} not found`);
    }

    if (!qimela.isCreatedBy(command.requesterId)) {
      throw new ForbiddenException('Solo el creador puede generar un enlace de invitación');
    }

    const existing = await this.inviteTokenRepository.findByQimelaId(command.qimelaId);
    if (existing && existing.isActive()) {
      return { data: { token: existing.token } };
    }

    const inviteToken = InviteTokenEntity.create(command.qimelaId);
    const saved = await this.inviteTokenRepository.upsert(inviteToken);

    return { data: { token: saved.token } };
  }
}
