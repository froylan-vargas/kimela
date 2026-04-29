import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import {
  QimelaPatch,
  QIMELA_REPOSITORY,
  QimelaRepository,
} from "../../domain/qimela.repository";
import { RULE_REPOSITORY, RuleRepository } from "../../domain/rule.repository";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface UpdateQimelaCommand {
  id: string;
  requesterId: string;
  name?: string;
  initialPhaseId?: string;
  finalPhaseId?: string;
  rules?: { ruleId: string; points: number }[];
}

export interface UpdateQimelaResponse {
  data: {
    id: string;
    name: string;
    status: string;
    startPhaseId: string | null;
    endPhaseId: string | null;
    rules?: { id: string; ruleId: string; points: number }[];
  };
}

@Injectable()
export class UpdateQimelaUseCase {
  constructor(
    @InjectPinoLogger(UpdateQimelaUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(RULE_REPOSITORY)
    private readonly ruleRepository: RuleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UpdateQimelaCommand): Promise<UpdateQimelaResponse> {
    this.logger.info(
      `Updating qimela ${command.id} requested by user ${command.requesterId}`,
    );

    const qimela = await this.qimelaRepository.findById(command.id);
    if (!qimela) {
      throw new NotFoundException(`qimela ${command.id} not found`);
    }

    if (!qimela.isCreatedBy(command.requesterId)) {
      throw new ForbiddenException("Only the creator can edit this qimela");
    }

    if (qimela.status === QimelaStatus.COMPLETED) {
      throw new UnprocessableEntityException({
        code: "QIMELA_COMPLETED_UNEDITABLE",
        message: "Cannot edit a completed qimela",
      });
    }

    // Block name and rules changes for ACTIVE qimelas
    if (qimela.status === QimelaStatus.ACTIVE) {
      if (command.name !== undefined) {
        throw new UnprocessableEntityException(
          "No se puede cambiar el nombre de una qimela activa.",
        );
      }
      if (command.rules !== undefined) {
        throw new UnprocessableEntityException(
          "No se pueden cambiar las reglas de una qimela activa.",
        );
      }
    }

    const patch: QimelaPatch = {};

    if (command.name !== undefined) {
      patch.name = command.name;
    }

    const hasInitialPhase = command.initialPhaseId !== undefined;
    const hasFinalPhase = command.finalPhaseId !== undefined;

    if (hasInitialPhase || hasFinalPhase) {
      if (qimela.status === QimelaStatus.ACTIVE && hasInitialPhase) {
        throw new UnprocessableEntityException(
          "No se puede cambiar la fase inicial de una qimela activa.",
        );
      }

      const eventId = qimela.eventId!;

      const newInitialPhaseId = command.initialPhaseId ?? qimela.startPhaseId!;
      const newFinalPhaseId = command.finalPhaseId ?? qimela.endPhaseId!;

      const [newInitialPhase, newFinalPhase] = await Promise.all([
        this.prisma.phase.findUnique({
          where: { id: newInitialPhaseId },
          select: { id: true, eventId: true, order: true },
        }),
        this.prisma.phase.findUnique({
          where: { id: newFinalPhaseId },
          select: { id: true, eventId: true, order: true },
        }),
      ]);

      if (!newInitialPhase || newInitialPhase.eventId !== eventId) {
        throw new UnprocessableEntityException(
          "La fase inicial no pertenece al evento de esta qimela.",
        );
      }

      if (!newFinalPhase || newFinalPhase.eventId !== eventId) {
        throw new UnprocessableEntityException(
          "La fase final no pertenece al evento de esta qimela.",
        );
      }

      if (newInitialPhase.order > newFinalPhase.order) {
        throw new UnprocessableEntityException(
          "La fase inicial debe tener un orden menor o igual a la fase final.",
        );
      }

      if (qimela.status === QimelaStatus.ACTIVE && hasFinalPhase) {
        const currentEndPhase = await this.prisma.phase.findUnique({
          where: { id: qimela.endPhaseId! },
          select: { order: true },
        });

        if (currentEndPhase && newFinalPhase.order < currentEndPhase.order) {
          throw new UnprocessableEntityException(
            "Solo se puede extender la fase final en una qimela activa.",
          );
        }
      }

      if (hasInitialPhase) {
        patch.startPhaseId = command.initialPhaseId;
      }
      if (hasFinalPhase) {
        patch.endPhaseId = command.finalPhaseId;
      }
    }

    // Validate and apply rule updates
    let updatedRules:
      | { id: string; ruleId: string; points: number }[]
      | undefined;

    if (command.rules !== undefined) {
      const submittedRuleIds = command.rules.map((r) => r.ruleId);
      const foundRules = await this.ruleRepository.findByIds(submittedRuleIds);

      const missingId = submittedRuleIds.find(
        (id) => !foundRules.some((r) => r.id === id),
      );
      if (missingId) {
        throw new NotFoundException(`Rule ${missingId} not found`);
      }

      for (const submitted of command.rules) {
        const rule = foundRules.find((r) => r.id === submitted.ruleId)!;
        if (submitted.points < rule.minPoints) {
          throw new UnprocessableEntityException({
            code: "RULE_BELOW_MIN_POINTS",
            message: `Rule "${rule.slug}" requires at least ${rule.minPoints} point(s).`,
          });
        }
        if (submitted.points > rule.maxPoints) {
          throw new UnprocessableEntityException({
            code: "RULE_ABOVE_MAX_POINTS",
            message: `Rule "${rule.slug}" allows at most ${rule.maxPoints} point(s).`,
          });
        }
      }

      // Replace all rules in a transaction
      const newRules = command.rules.map((r) => ({
        id: randomUUID(),
        ruleId: r.ruleId,
        points: r.points,
        qimelaId: command.id,
      }));

      await this.prisma.$transaction(async (tx) => {
        await tx.qimelaRule.deleteMany({ where: { qimelaId: command.id } });
        await tx.qimelaRule.createMany({ data: newRules });
      });

      updatedRules = newRules.map((r) => ({
        id: r.id,
        ruleId: r.ruleId,
        points: r.points,
      }));
    }

    const hasPatch = Object.keys(patch).length > 0;

    if (!hasPatch && !updatedRules) {
      return {
        data: {
          id: qimela.id,
          name: qimela.name,
          status: qimela.status,
          startPhaseId: qimela.startPhaseId,
          endPhaseId: qimela.endPhaseId,
        },
      };
    }

    const updated = hasPatch
      ? await this.qimelaRepository.update(command.id, patch)
      : qimela;

    return {
      data: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        startPhaseId: updated.startPhaseId,
        endPhaseId: updated.endPhaseId,
        ...(updatedRules ? { rules: updatedRules } : {}),
      },
    };
  }
}
