import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ActivatePhaseCommand {
  phaseId: string;
}

export interface ActivatePhaseResponse {
  data: PhaseDto;
}

@Injectable()
export class ActivatePhaseUseCase {

  constructor(
    @InjectPinoLogger(ActivatePhaseUseCase.name) private readonly logger: PinoLogger,
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ActivatePhaseCommand): Promise<ActivatePhaseResponse> {
    const { phaseId } = command;

    this.logger.info(`Activating phase ${phaseId}`);

    const phase = await this.phaseRepository.findById(phaseId);

    if (!phase) {
      throw new NotFoundException(`Phase ${phaseId} not found`);
    }

    if (phase.status !== 'UPCOMING') {
      throw new UnprocessableEntityException(
        `La fase ${phaseId} no puede activarse: el estado actual es "${phase.status}"`,
      );
    }

    const eventPhases = await this.phaseRepository.findByEvent({ eventId: phase.eventId });
    const activePhase = eventPhases.find((eventPhase) => eventPhase.status === 'ACTIVE');

    if (activePhase) {
      throw new UnprocessableEntityException(
        `La fase ${phaseId} no puede activarse: el evento ya tiene una fase activa (${activePhase.id})`,
      );
    }

    const updated = await this.phaseRepository.updateStatus(phaseId, 'ACTIVE');

    await this.prisma.qimela.updateMany({
      where: { startPhaseId: phaseId, status: 'UPCOMING' },
      data: { status: 'ACTIVE' },
    });

    this.logger.info(`Phase ${phaseId} activated`);

    return { data: PhaseMapper.toDto(updated) };
  }
}
