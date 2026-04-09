import { Test, TestingModule } from '@nestjs/testing';
import { QimelaController } from './qimela.controller';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { QimelaStatus } from '../domain/qimela-status.enum';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user-role.enum';

const MOCK_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const MOCK_USER: CurrentUserPayload = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  role: UserRole.USER,
  emailVerifiedAt: null,
};

const mockPaginatedResponse: PaginatedQimelaResponse = {
  data: [
    {
      id: 'qimela-1',
      name: 'Test Qimela',
      description: null,
      sport: 'football',
      status: QimelaStatus.ACTIVE,
      role: 'CREATOR',
      creatorId: MOCK_USER_ID,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
  meta: { total: 1 },
};

describe('QimelaController', () => {
  let controller: QimelaController;
  let useCase: jest.Mocked<GetQimelasForUserUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QimelaController],
      providers: [
        { provide: GetQimelasForUserUseCase, useValue: mockUseCase },
        { provide: QIMELA_REPOSITORY, useValue: {} },
      ],
    }).compile();

    controller = module.get<QimelaController>(QimelaController);
    useCase = module.get(GetQimelasForUserUseCase);
  });

  describe('getQimelas', () => {
    it('calls use case with hardcoded user id and no status filter', async () => {
      // Arrange
      useCase.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(useCase.execute).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        status: undefined,
      });
    });

    it('calls use case with status filter when provided', async () => {
      // Arrange
      useCase.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getQimelas(
        MOCK_USER,
        { status: QimelaStatus.ACTIVE },
      );

      // Assert
      expect(useCase.execute).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        status: QimelaStatus.ACTIVE,
      });
    });

    it('returns paginated response from use case', async () => {
      // Arrange
      useCase.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('returns empty data when use case returns no qimelas', async () => {
      // Arrange
      const emptyResponse: PaginatedQimelaResponse = {
        data: [],
        meta: { total: 0 },
      };
      useCase.execute.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
