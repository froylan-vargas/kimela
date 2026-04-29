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

export interface GetQimelaSubscribersCommand {
  qimelaId: string;
  requesterId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface SubscriberLabelDto {
  id: string;
  name: string;
  color: string;
}

export interface SubscriberDto {
  userId: string;
  name: string;
  email: string;
  labels: SubscriberLabelDto[];
}

export interface GetQimelaSubscribersResponse {
  data: {
    subscribers: SubscriberDto[];
    total: number;
    page: number;
    limit: number;
  };
}

@Injectable()
export class GetQimelaSubscribersUseCase {
  constructor(
    @InjectPinoLogger(GetQimelaSubscribersUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: GetQimelaSubscribersCommand,
  ): Promise<GetQimelaSubscribersResponse> {
    this.logger.info(`Getting subscribers for qimela ${command.qimelaId}`);

    const qimela = await this.qimelaRepository.findById(command.qimelaId);
    if (!qimela) throw new NotFoundException("qimela not found");
    if (qimela.creatorId !== command.requesterId) {
      throw new ForbiddenException("Only the creator can view subscribers");
    }

    const searchFilter = command.search
      ? {
          OR: [
            {
              user: {
                name: {
                  contains: command.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: command.search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {};

    const where = { qimelaId: command.qimelaId, ...searchFilter };

    const [total, subscriptions] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          labels: {
            include: {
              label: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (command.page - 1) * command.limit,
        take: command.limit,
      }),
    ]);

    return {
      data: {
        subscribers: subscriptions.map((s) => ({
          userId: s.user.id,
          name: s.user.name,
          email: s.user.email,
          labels: s.labels.map((sl) => ({
            id: sl.label.id,
            name: sl.label.name,
            color: sl.label.color,
          })),
        })),
        total,
        page: command.page,
        limit: command.limit,
      },
    };
  }
}
