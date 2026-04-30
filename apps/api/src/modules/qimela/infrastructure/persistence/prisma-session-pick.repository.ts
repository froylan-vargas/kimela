import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PickRow, SavePicksOptions, SessionPickRepository } from '../../domain/session-pick.repository';

@Injectable()
export class PrismaSessionPickRepository implements SessionPickRepository {
  constructor(private readonly prisma: PrismaService) {}

  async savePicksForSession(options: SavePicksOptions): Promise<PickRow[]> {
    await this.prisma.$transaction(
      options.picks.map((pick) =>
        this.prisma.userPick.upsert({
          where: {
            userId_sessionId_pickCategoryId_qimelaId: {
              userId: options.userId,
              sessionId: options.sessionId,
              pickCategoryId: pick.pickCategoryId,
              qimelaId: options.qimelaId,
            },
          },
          create: {
            userId: options.userId,
            sessionId: options.sessionId,
            pickCategoryId: pick.pickCategoryId,
            qimelaId: options.qimelaId,
            value: pick.value,
            pickedContenderId: pick.pickedContenderId,
          },
          update: {
            value: pick.value,
            pickedContenderId: pick.pickedContenderId,
          },
        }),
      ),
    );

    return this.findPicksForUserAndSession(options.userId, options.sessionId, options.qimelaId);
  }

  async findPicksForUserAndSession(userId: string, sessionId: string, qimelaId: string): Promise<PickRow[]> {
    const rows = await this.prisma.userPick.findMany({
      where: { userId, sessionId, qimelaId },
      include: {
        pickCategory: {
          select: {
            id: true,
            name: true,
            label: true,
            valueType: true,
          },
        },
      },
      orderBy: { pickCategory: { name: 'asc' } },
    });

    return rows.map((row) => ({
      pickCategoryId: row.pickCategory.id,
      name: row.pickCategory.name,
      label: row.pickCategory.label,
      valueType: row.pickCategory.valueType,
      value: row.value,
      pickedContenderId: row.pickedContenderId,
    }));
  }
}
