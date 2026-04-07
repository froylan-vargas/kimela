import { Test, TestingModule } from '@nestjs/testing';
import { KimelaController } from './kimela.controller';
import { GetKimelasForUserUseCase } from '../application/use-cases/get-kimelas-for-user.use-case';
import { KIMELA_REPOSITORY } from '../domain/kimela.repository';
import { KimelaStatus } from '../domain/kimela-status.enum';
import { PaginatedKimelaResponse } from '../application/dtos/kimela.dto';
import { CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user-role.enum';

const MOCK_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const MOCK_USER: CurrentUserPayload = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  role: UserRole.USER,
  emailVerifiedAt: null,
};

const mockPaginatedResponse: PaginatedKimelaResponse = {
  data: [
    {
      id: 'kimela-1',
      name: 'Test Kimela',
      description: null,
      sport: 'football',
      status: KimelaStatus.ACTIVE,
      role: 'CREATOR',
      creatorId: MOCK_USER_ID,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
  meta: { total: 1 },
};

describe('KimelaController', () => {
  let controller: KimelaController;
  let useCase: jest.Mocked<GetKimelasForUserUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KimelaController],
      providers: [
        { provide: GetKimelasForUserUseCase, useValue: mockUseCase },
        { provide: KIMELA_REPOSITORY, useValue: {} },
      ],
    }).compile();

    controller = module.get<KimelaController>(KimelaController);
    useCase = module.get(GetKimelasForUserUseCase);
  });

  describe('getKimelas', () => {
    it('calls use case with hardcoded user id and no status filter', async () => {
      // Arrange
      useCase.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getKimelas(MOCK_USER, {});

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
      await controller.getKimelas(
        MOCK_USER,
        { status: KimelaStatus.ACTIVE },
      );

      // Assert
      expect(useCase.execute).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        status: KimelaStatus.ACTIVE,
      });
    });

    it('returns paginated response from use case', async () => {
      // Arrange
      useCase.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getKimelas(MOCK_USER, {});

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('returns empty data when use case returns no kimelas', async () => {
      // Arrange
      const emptyResponse: PaginatedKimelaResponse = {
        data: [],
        meta: { total: 0 },
      };
      useCase.execute.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getKimelas(MOCK_USER, {});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
