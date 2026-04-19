import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';
import { LORE_FRAGMENTS, PUZZLES } from '../data/lore';

export class LiteratureSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Collect a lore fragment */
  collectLore(loreId: string): boolean {
    if (this.state.collectedLore.includes(loreId)) return false;
    this.state.collectedLore.push(loreId);
    this.bus.emit('lore-collected', { loreId });
    return true;
  }

  /** Attempt to solve a puzzle */
  attemptPuzzle(puzzleId: string): boolean {
    if (this.state.solvedPuzzles.includes(puzzleId)) return false;
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) return false;
    const hasAll = puzzle.requiredLoreIds.every(id => this.state.collectedLore.includes(id));
    if (!hasAll) return false;
    this.state.solvedPuzzles.push(puzzleId);
    this.bus.emit('puzzle-solved', { puzzleId, rewards: puzzle.rewards });
    return true;
  }

  /** Check if a puzzle can be solved with current lore */
  canSolvePuzzle(puzzleId: string): boolean {
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) return false;
    return puzzle.requiredLoreIds.every(id => this.state.collectedLore.includes(id));
  }
}
