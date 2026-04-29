import {
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import {
  INVITE_TOKEN_REPOSITORY,
  InviteTokenRepository,
} from "../../domain/invite-token.repository";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface GetQimelaByInviteTokenResponse {
  data: {
    qimelaId: string;
    name: string;
    status: string;
    sport: { id: string; name: string };
    creator: { name: string };
  };
}

@Injectable()
export class GetQimelaByInviteTokenUseCase {
  constructor(
    @InjectPinoLogger(GetQimelaByInviteTokenUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(INVITE_TOKEN_REPOSITORY)
    private readonly inviteTokenRepository: InviteTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(token: string): Promise<GetQimelaByInviteTokenResponse> {
    this.logger.info(`Looking up qimela by invite token`);

    const inviteToken = await this.inviteTokenRepository.findByToken(token);
    if (!inviteToken) {
      throw new NotFoundException("Invite link not found");
    }

    if (!inviteToken.isActive()) {
      throw new GoneException("Este enlace de invitación ha sido revocado");
    }

    const qimela = await this.prisma.qimela.findUnique({
      where: { id: inviteToken.qimelaId },
      select: {
        id: true,
        name: true,
        status: true,
        sport: { select: { id: true, name: true } },
        creator: { select: { name: true } },
      },
    });

    if (!qimela) {
      throw new NotFoundException("qimela not found");
    }

    return {
      data: {
        qimelaId: qimela.id,
        name: qimela.name,
        status: qimela.status,
        sport: qimela.sport,
        creator: qimela.creator,
      },
    };
  }
}
