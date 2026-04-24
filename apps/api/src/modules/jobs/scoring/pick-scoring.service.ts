import { Injectable } from '@nestjs/common';

export interface ScoredPick {
  points: number;
  exactResult: boolean;
  correctPick: boolean;
}

interface UserPickRow {
  pickCategoryId: string;
  value: string | null;
  pickedContenderId: string | null;
}

interface SessionResultRow {
  pickCategoryId: string;
  value: string | null;
  contenderId: string | null;
}

interface PickCategoryRow {
  id: string;
  name: string;
  valueType: 'CONTENDER' | 'SCALAR';
}

interface RuleRow {
  slug: string;
  points: number;
}

type Outcome = 'HOME_WIN' | 'AWAY_WIN' | 'TIE';

@Injectable()
export class PickScoringService {
  computePoints(
    picks: UserPickRow[],
    results: SessionResultRow[],
    categories: PickCategoryRow[],
    rules: RuleRow[],
  ): ScoredPick {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const resultByCategoryId = new Map(results.map((r) => [r.pickCategoryId, r]));
    const pickByCategoryId = new Map(picks.map((p) => [p.pickCategoryId, p]));

    const scoreHomeCategory = categories.find((c) => c.name === 'score_home');
    const scoreAwayCategory = categories.find((c) => c.name === 'score_away');

    const actualOutcome = this.deriveOutcome(scoreHomeCategory, scoreAwayCategory, resultByCategoryId);
    const userOutcome = this.deriveOutcome(scoreHomeCategory, scoreAwayCategory, pickByCategoryId);

    let totalPoints = 0;
    let exactResult = false;
    const outcomeCorrect = actualOutcome !== null && userOutcome !== null && actualOutcome === userOutcome;

    for (const rule of rules) {
      if (rule.slug === 'session_winner') {
        if (outcomeCorrect) {
          totalPoints += rule.points;
        }
      } else if (rule.slug === 'exact_session_result') {
        if (this.isExactMatch(results, picks, categoryById)) {
          totalPoints += rule.points;
          exactResult = true;
        }
      }
    }

    return { points: totalPoints, exactResult, correctPick: outcomeCorrect || exactResult };
  }

  private deriveOutcome(
    scoreHomeCategory: PickCategoryRow | undefined,
    scoreAwayCategory: PickCategoryRow | undefined,
    byCategory: Map<string, { value: string | null; pickedContenderId?: string | null }>,
  ): Outcome | null {
    if (!scoreHomeCategory || !scoreAwayCategory) {
      return null;
    }

    const homeEntry = byCategory.get(scoreHomeCategory.id);
    const awayEntry = byCategory.get(scoreAwayCategory.id);

    if (!homeEntry || !awayEntry) {
      return null;
    }

    const homeScore = Number(homeEntry.value);
    const awayScore = Number(awayEntry.value);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      return null;
    }

    if (homeScore > awayScore) return 'HOME_WIN';
    if (awayScore > homeScore) return 'AWAY_WIN';
    return 'TIE';
  }

  private isExactMatch(
    results: SessionResultRow[],
    picks: UserPickRow[],
    categoryById: Map<string, PickCategoryRow>,
  ): boolean {
    if (results.length === 0) return false;

    const pickByCategoryId = new Map(picks.map((p) => [p.pickCategoryId, p]));

    for (const result of results) {
      const category = categoryById.get(result.pickCategoryId);
      if (!category) return false;

      const pick = pickByCategoryId.get(result.pickCategoryId);
      if (!pick) return false;

      if (category.valueType === 'SCALAR') {
        if (pick.value !== result.value) return false;
      } else {
        if (pick.pickedContenderId !== result.contenderId) return false;
      }
    }

    return true;
  }
}
