import { InviteTokenEntity } from './invite-token.entity';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('InviteTokenEntity', () => {
  describe('create', () => {
    it('returns an entity with revoked set to false', () => {
      // Arrange + Act
      const entity = InviteTokenEntity.create(QIMELA_ID);

      // Assert
      expect(entity.revoked).toBe(false);
    });

    it('generates a 64-character hex token', () => {
      // Arrange + Act
      const entity = InviteTokenEntity.create(QIMELA_ID);

      // Assert
      expect(entity.token).toHaveLength(64);
      expect(entity.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('sets the provided qimelaId on the entity', () => {
      // Arrange + Act
      const entity = InviteTokenEntity.create(QIMELA_ID);

      // Assert
      expect(entity.qimelaId).toBe(QIMELA_ID);
    });
  });

  describe('isActive', () => {
    it('returns true when token is not revoked', () => {
      // Arrange
      const entity = new InviteTokenEntity({
        id: 'token-id',
        token: 'a'.repeat(64),
        qimelaId: QIMELA_ID,
        revoked: false,
        createdAt: new Date(),
      });

      // Act + Assert
      expect(entity.isActive()).toBe(true);
    });

    it('returns false when token is revoked', () => {
      // Arrange
      const entity = new InviteTokenEntity({
        id: 'token-id',
        token: 'a'.repeat(64),
        qimelaId: QIMELA_ID,
        revoked: true,
        createdAt: new Date(),
      });

      // Act + Assert
      expect(entity.isActive()).toBe(false);
    });
  });
});
