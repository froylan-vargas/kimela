import { GetRulesUseCase } from './get-rules.use-case';
import { RuleRepository } from '../../domain/rule.repository';
import { RuleEntity } from '../../domain/rule.entity';

const makeRule = (overrides: Partial<RuleEntity> = {}): RuleEntity =>
  new RuleEntity({
    id: 'rule-1',
    slug: 'winner',
    question: 'Who will win?',
    sessionFormat: 'MATCHUP',
    minPoints: 0,
    maxPoints: 5,
    ...overrides,
  });

describe('GetRulesUseCase', () => {
  let useCase: GetRulesUseCase;
  let mockRuleRepository: jest.Mocked<RuleRepository>;

  beforeEach(() => {
    mockRuleRepository = {
      findAll: jest.fn(),
      findByIds: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetRulesUseCase(mockLogger, mockRuleRepository);
  });

  describe('execute', () => {
    it('returns empty data array when no rules exist', async () => {
      // Arrange
      mockRuleRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toEqual([]);
    });

    it('maps all rule fields to RuleDto', async () => {
      // Arrange
      const rule = makeRule();
      mockRuleRepository.findAll.mockResolvedValue([rule]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'rule-1',
        slug: 'winner',
        question: 'Who will win?',
        sessionFormat: 'MATCHUP',
        minPoints: 0,
        maxPoints: 5,
      });
    });

    it('returns all rules when multiple exist', async () => {
      // Arrange
      const rules = [
        makeRule({ id: 'rule-1', slug: 'winner' }),
        makeRule({ id: 'rule-2', slug: 'exact-score', sessionFormat: 'MATCHUP' }),
        makeRule({ id: 'rule-3', slug: 'fastest-lap', sessionFormat: 'RACE' }),
      ];
      mockRuleRepository.findAll.mockResolvedValue(rules);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.data.map((r) => r.id)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    });

    it('calls findAll on the rule repository', async () => {
      // Arrange
      mockRuleRepository.findAll.mockResolvedValue([]);

      // Act
      await useCase.execute();

      // Assert
      expect(mockRuleRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
