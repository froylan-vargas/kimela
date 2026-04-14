import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { CoveredStages } from '../../domain/covered-stages.enum';

export interface GetQimelaByIdResponse {
  data: {
    id: string;
    name: string;
    sportId: string;
    status: string;
    creatorId: string;
    eventId: string | null;
    leagueId: string | null;
    coveredStages: CoveredStages;
    startPhaseId: string | null;
    endPhaseId: string | null;
  };
}

@Injectable()
export class GetQimelaByIdUseCase {
  private readonly logger = new Logger(GetQimelaByIdUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
  ) {}

  async execute(id: string): Promise<GetQimelaByIdResponse> {
    this.logger.log(`Getting qimela by id ${id}`);

    const qimela = await this.qimelaRepository.findById(id);
    if (!qimela) {
      throw new NotFoundException(`Qimela ${id} not found`);
    }

    return {
      data: {
        id: qimela.id,
        name: qimela.name,
        sportId: qimela.sportId,
        status: qimela.status,
        creatorId: qimela.creatorId,
        eventId: qimela.eventId,
        leagueId: qimela.leagueId,
        coveredStages: qimela.coveredStages,
        startPhaseId: qimela.startPhaseId,
        endPhaseId: qimela.endPhaseId,
      },
    };
  }
}
