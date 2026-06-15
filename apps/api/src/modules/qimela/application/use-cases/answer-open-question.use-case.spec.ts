import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnswerOpenQuestionUseCase } from './answer-open-question.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const QUESTION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CREATOR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Test qimela',
    status: QimelaStatus.ACTIVE,
    sportId: 'sport-id',
    creatorId: CREATOR_ID,
    eventId: EVENT_ID,
    leagueId: null,
    startPhaseId: null,
    endPhaseId: null,
    rules: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('AnswerOpenQuestionUseCase', () => {
  let useCase: AnswerOpenQuestionUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    subscription: { findFirst: jest.Mock };
    openQuestion: { findFirst: jest.Mock };
    openQuestionResponse: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      subscription: { findFirst: jest.fn() },
      openQuestion: { findFirst: jest.fn() },
      openQuestionResponse: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new AnswerOpenQuestionUseCase(
      mockLogger,
      mockQimelaRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('throws NotFoundException when qimela does not exist', async () => {
    mockQimelaRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        questionId: QUESTION_ID,
        userId: USER_ID,
        answer: 'Respuesta',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when user cannot access qimela', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        questionId: QUESTION_ID,
        userId: USER_ID,
        answer: 'Respuesta',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws UnprocessableEntityException when question is hidden', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.openQuestion.findFirst.mockResolvedValue({
      id: QUESTION_ID,
      prompt: 'Pregunta',
      status: 'HIDDEN',
    });

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        questionId: QUESTION_ID,
        userId: USER_ID,
        answer: 'Respuesta',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws ConflictException when user already answered', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.openQuestion.findFirst.mockResolvedValue({
      id: QUESTION_ID,
      prompt: 'Pregunta',
      status: 'VISIBLE',
    });
    mockPrisma.openQuestionResponse.findUnique.mockResolvedValue({ id: 'response-id' });

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        questionId: QUESTION_ID,
        userId: USER_ID,
        answer: 'Respuesta',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates an answer for an accessible visible question', async () => {
    const createdAt = new Date('2026-06-15T12:00:00Z');
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.openQuestion.findFirst.mockResolvedValue({
      id: QUESTION_ID,
      prompt: '¿Quién será la revelación?',
      status: 'VISIBLE',
    });
    mockPrisma.openQuestionResponse.findUnique.mockResolvedValue(null);
    mockPrisma.openQuestionResponse.create.mockResolvedValue({
      id: 'response-id',
      answer: 'Un jugador',
      createdAt,
    });

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      questionId: QUESTION_ID,
      userId: USER_ID,
      answer: 'Un jugador',
    });

    expect(mockPrisma.openQuestionResponse.create).toHaveBeenCalledWith({
      data: {
        questionId: QUESTION_ID,
        userId: USER_ID,
        answer: 'Un jugador',
      },
    });
    expect(result.data).toEqual({
      id: QUESTION_ID,
      prompt: '¿Quién será la revelación?',
      answered: true,
      answer: {
        id: 'response-id',
        answer: 'Un jugador',
        createdAt: createdAt.toISOString(),
      },
    });
  });
});
