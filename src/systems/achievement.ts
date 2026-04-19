import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class AchievementSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Check and unlock new achievements */
  checkAll(): string[] {
    // Stub — will use ACHIEVEMENTS data in Phase 1 extraction
    return [];
  }

  isUnlocked(id: string): boolean {
    return this.state.unlockedAchievements.includes(id);
  }
}
