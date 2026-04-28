import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteQimelaLabelUseCase } from './delete-qimela-label.use-case';
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

describe('DeleteQimelaLabelUseCase', () => {
  let useCase: DeleteQimelaLabelUseCase;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { qimelaLabel: { findFirst: jest.Mock; delete: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      qimelaLabel: {
        findFirst: jest.fn().mockResolvedValue({ id: LABEL_ID, name: 'Champions', color: '#FF0000' }),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new DeleteQimelaLabelUseCase(mockLogger, 
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
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, labelId: LABEL_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_ID, labelId: LABEL_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when label is not found in this qimela', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.findFirst.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, labelId: LABEL_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes the label and returns { data: { deleted: true } }', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.findFirst.mockResolvedValue({ id: LABEL_ID, name: 'Champions', color: '#FF0000' });

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        labelId: LABEL_ID,
      });

      // Assert
      expect(mockPrisma.qimelaLabel.delete).toHaveBeenCalledWith({ where: { id: LABEL_ID } });
      expect(result).toEqual({ data: { deleted: true } });
    });
  });
});
