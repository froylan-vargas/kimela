import { Test, TestingModule } from "@nestjs/testing";
import { getLoggerToken } from "nestjs-pino";
import { InviteController } from "./invite.controller";
import { GenerateInviteTokenUseCase } from "../application/use-cases/generate-invite-token.use-case";
import { RevokeInviteTokenUseCase } from "../application/use-cases/revoke-invite-token.use-case";
import { GetQimelaByInviteTokenUseCase } from "../application/use-cases/get-qimela-by-invite-token.use-case";
import { SubscribeViaInviteTokenUseCase } from "../application/use-cases/subscribe-via-invite-token.use-case";
import { QIMELA_REPOSITORY } from "../domain/qimela.repository";
import { INVITE_TOKEN_REPOSITORY } from "../domain/invite-token.repository";
import { CurrentUserPayload } from "../../auth/presentation/decorators/current-user.decorator";
import { UserRole } from "../../users/domain/user-role.enum";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const MOCK_USER_ID = "e471c62d-6015-4ab9-b930-79db54ea75c0";
const QIMELA_ID = "f1234567-0000-0000-0000-000000000000";

const MOCK_USER: CurrentUserPayload = {
  id: MOCK_USER_ID,
  email: "test@example.com",
  role: UserRole.USER,
  emailVerifiedAt: null,
};

describe("InviteController", () => {
  let controller: InviteController;
  let generateInviteToken: jest.Mocked<GenerateInviteTokenUseCase>;
  let revokeInviteToken: jest.Mocked<RevokeInviteTokenUseCase>;
  let getQimelaByInviteToken: jest.Mocked<GetQimelaByInviteTokenUseCase>;
  let subscribeViaInviteToken: jest.Mocked<SubscribeViaInviteTokenUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteController],
      providers: [
        {
          provide: GenerateInviteTokenUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: RevokeInviteTokenUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetQimelaByInviteTokenUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SubscribeViaInviteTokenUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: QIMELA_REPOSITORY, useValue: {} },
        { provide: INVITE_TOKEN_REPOSITORY, useValue: {} },
        { provide: PrismaService, useValue: {} },
        {
          provide: getLoggerToken(InviteController.name),
          useValue: {
            trace: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InviteController>(InviteController);
    generateInviteToken = module.get(GenerateInviteTokenUseCase);
    revokeInviteToken = module.get(RevokeInviteTokenUseCase);
    getQimelaByInviteToken = module.get(GetQimelaByInviteTokenUseCase);
    subscribeViaInviteToken = module.get(SubscribeViaInviteTokenUseCase);
  });

  // ─── generate ────────────────────────────────────────────────────────────

  describe("generate", () => {
    it("calls generateInviteToken.execute with qimelaId and requesterId", async () => {
      // Arrange
      const mockResponse = { data: { token: "a".repeat(64) } };
      generateInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.generate(QIMELA_ID, MOCK_USER);

      // Assert
      expect(generateInviteToken.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
      });
    });

    it("returns the result from the use case", async () => {
      // Arrange
      const mockResponse = { data: { token: "a".repeat(64) } };
      generateInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.generate(QIMELA_ID, MOCK_USER);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── revoke ──────────────────────────────────────────────────────────────

  describe("revoke", () => {
    it("calls revokeInviteToken.execute with qimelaId and requesterId", async () => {
      // Arrange
      revokeInviteToken.execute.mockResolvedValue(undefined);

      // Act
      await controller.revoke(QIMELA_ID, MOCK_USER);

      // Assert
      expect(revokeInviteToken.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
      });
    });
  });

  // ─── subscribe ───────────────────────────────────────────────────────────

  describe("subscribe", () => {
    it("calls subscribeViaInviteToken.execute with token and userId", async () => {
      // Arrange
      const token = "c".repeat(64);
      const mockResponse = { data: { subscriptionId: "sub-id-1" } };
      subscribeViaInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.subscribe(token, MOCK_USER);

      // Assert
      expect(subscribeViaInviteToken.execute).toHaveBeenCalledWith({
        token,
        userId: MOCK_USER_ID,
      });
    });

    it("returns the use case result", async () => {
      // Arrange
      const token = "c".repeat(64);
      const mockResponse = { data: { subscriptionId: "sub-id-1" } };
      subscribeViaInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.subscribe(token, MOCK_USER);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── getByToken ──────────────────────────────────────────────────────────

  describe("getByToken", () => {
    it("calls getQimelaByInviteToken.execute with the token param", async () => {
      // Arrange
      const token = "b".repeat(64);
      const mockResponse = {
        data: {
          qimelaId: QIMELA_ID,
          name: "Test qimela",
          status: "UPCOMING",
          sport: { id: "sport-1", name: "Soccer" },
          creator: { name: "John Doe" },
        },
      };
      getQimelaByInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.getByToken(token);

      // Assert
      expect(getQimelaByInviteToken.execute).toHaveBeenCalledWith(token);
    });

    it("returns the result from the use case", async () => {
      // Arrange
      const token = "b".repeat(64);
      const mockResponse = {
        data: {
          qimelaId: QIMELA_ID,
          name: "Test qimela",
          status: "UPCOMING",
          sport: { id: "sport-1", name: "Soccer" },
          creator: { name: "John Doe" },
        },
      };
      getQimelaByInviteToken.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getByToken(token);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
});
