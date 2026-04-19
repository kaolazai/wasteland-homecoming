import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';
import { BOSS_WEAKNESSES } from '../data/lore';

export class BossWeaknessSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Check if a boss weakness has been discovered */
  isWeaknessDiscovered(weaknessId: string): boolean {
    return this.state.discoveredWeaknesses.includes(weaknessId);
  }

  /** Discover a boss weakness */
  discoverWeakness(weaknessId: string): void {
    if (!this.state.discoveredWeaknesses.includes(weaknessId)) {
      this.state.discoveredWeaknesses.push(weaknessId);
      this.bus.emit('weakness-discovered', { weaknessId });
    }
  }

  /** Get damage multiplier for a boss if weakness is exploited */
  getWeaknessMultiplier(bossId: string, skillOrItemId: string): number {
    for (const w of Object.values(BOSS_WEAKNESSES)) {
      if (w.bossId === bossId && this.isWeaknessDiscovered(w.id) && w.effectValue === skillOrItemId) {
        return w.damageMultiplier;
      }
    }
    return 1.0;
  }

  /** Get boss HP multiplier (150% if weakness unknown) */
  getBossHpMultiplier(bossId: string): number {
    for (const w of Object.values(BOSS_WEAKNESSES)) {
      if (w.bossId === bossId) {
        return this.isWeaknessDiscovered(w.id) ? 1.0 : 1.5;
      }
    }
    return 1.0;
  }
}
