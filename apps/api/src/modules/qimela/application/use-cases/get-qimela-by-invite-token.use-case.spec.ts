import { GoneException, NotFoundException } from "@nestjs/common";
import { GetQimelaByInviteTokenUseCase } from "./get-qimela-by-invite-token.use-case";
import { InviteTokenRepository } from "../../domain/invite-token.repository";
import { InviteTokenEntity } from "../../domain/invite-token.entity";
import { PrismaService } from "../../../../shared/prisma/prisma.service";

const QIMELA_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VALID_TOKEN = "a".repeat(64);

const makeInviteToken = (
  overrides: Partial<ConstructorParameters<typeof InviteTokenEntity>[0]> = {},
): InviteTokenEntity =>
  new InviteTokenEntity({
    id: "token-id-hex",
    token: VALID_TOKEN,
    qimelaId: QIMELA_ID,
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  });

describe("GetQimelaByInviteTokenUseCase", () => {
  let useCase: GetQimelaByInviteTokenUseCase;
  let mockInviteTokenRepository: jest.Mocked<InviteTokenRepository>;
  let mockPrismaService: { qimela: { findUnique: jest.Mock } };

  beforeEach(() => {
    mockInviteTokenRepository = {
      findByToken: jest.fn(),
      findByQimelaId: jest.fn(),
      upsert: jest.fn(),
      revoke: jest.fn(),
      revokeByQimelaId: jest.fn(),
    };

    mockPrismaService = {
      qimela: { findUnique: jest.fn() },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new GetQimelaByInviteTokenUseCase(
      mockLogger,
      mockInviteTokenRepository,
      mockPrismaService as unknown as PrismaService,
    );
  });

  describe("execute", () => {
    it("throws NotFoundException when token not found", async () => {
      // Arrange
      mockInviteTokenRepository.findByToken.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute(VALID_TOKEN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws GoneException when token is revoked", async () => {
      // Arrange
      mockInviteTokenRepository.findByToken.mockResolvedValue(
        makeInviteToken({ revoked: true }),
      );

      // Act + Assert
      await expect(useCase.execute(VALID_TOKEN)).rejects.toThrow(GoneException);
    });

    it("returns qimela public info on success", async () => {
      // Arrange
      mockInviteTokenRepository.findByToken.mockResolvedValue(
        makeInviteToken(),
      );
      mockPrismaService.qimela.findUnique.mockResolvedValue({
        id: QIMELA_ID,
        name: "Test qimela",
        status: "UPCOMING",
        sport: { id: "sport-1", name: "Soccer" },
        creator: { name: "John Doe" },
      });

      // Act
      const result = await useCase.execute(VALID_TOKEN);

      // Assert
      expect(result.data).toEqual({
        qimelaId: QIMELA_ID,
        name: "Test qimela",
        status: "UPCOMING",
        sport: { id: "sport-1", name: "Soccer" },
        creator: { name: "John Doe" },
      });
    });

    it("throws NotFoundException when qimela record does not exist", async () => {
      // Arrange
      mockInviteTokenRepository.findByToken.mockResolvedValue(
        makeInviteToken(),
      );
      mockPrismaService.qimela.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute(VALID_TOKEN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
