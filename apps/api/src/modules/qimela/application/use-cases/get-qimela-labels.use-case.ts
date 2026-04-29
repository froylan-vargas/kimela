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
import { LabelDto } from "./create-qimela-label.use-case";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface GetQimelaLabelsCommand {
  qimelaId: string;
  requesterId: string;
}

export interface GetQimelaLabelsResponse {
  data: { labels: LabelDto[] };
}

@Injectable()
export class GetQimelaLabelsUseCase {
  constructor(
    @InjectPinoLogger(GetQimelaLabelsUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: GetQimelaLabelsCommand,
  ): Promise<GetQimelaLabelsResponse> {
    this.logger.info(`Getting labels for qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException("qimela not found");
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException("Only the creator can view labels");
    }

    const labels = await this.prisma.qimelaLabel.findMany({
      where: { qimelaId: command.qimelaId },
      orderBy: { createdAt: "asc" },
    });

    return {
      data: {
        labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      },
    };
  }
}
