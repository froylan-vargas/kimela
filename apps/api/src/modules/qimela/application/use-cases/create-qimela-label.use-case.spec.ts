import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateQimelaLabelUseCase } from './create-qimela-label.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const LABEL_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const makeQimela = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Test Qimela',
    status: QimelaStatus.UPCOMING,
    sportId: SPORT_ID,
    eventId: null,
    leagueId: null,
    creatorId: CREATOR_ID,
    rules: [],
    startPhaseId: null,
    endPhaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('CreateQimelaLabelUseCase', () => {
  let useCase: CreateQimelaLabelUseCase;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { qimelaLabel: { count: jest.Mock; create: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      qimelaLabel: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: LABEL_ID, name: 'Champions', color: '#FF0000' }),
      },
    };

    useCase = new CreateQimelaLabelUseCase(
      mockQimelaRepo,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('execute', () => {
    it('throws NotFoundException when qimela does not exist', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, name: 'Champions', color: '#FF0000' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_ID, name: 'Champions', color: '#FF0000' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when label count is already at the maximum', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.count.mockResolvedValue(3);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, name: 'Champions', color: '#FF0000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates label and returns id, name and color', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.count.mockResolvedValue(1);
      mockPrisma.qimelaLabel.create.mockResolvedValue({ id: LABEL_ID, name: 'Champions', color: '#FF0000' });

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        name: 'Champions',
        color: '#FF0000',
      });

      // Assert
      expect(result).toEqual({ data: { id: LABEL_ID, name: 'Champions', color: '#FF0000' } });
    });

    it('trims whitespace from name before saving', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.count.mockResolvedValue(0);
      mockPrisma.qimelaLabel.create.mockResolvedValue({ id: LABEL_ID, name: 'Champions', color: '#FF0000' });

      // Act
      await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        name: '  Champions  ',
        color: '#FF0000',
      });

      // Assert
      expect(mockPrisma.qimelaLabel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Champions' }),
        }),
      );
    });
  });
});
