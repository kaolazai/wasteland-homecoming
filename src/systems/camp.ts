import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class CampSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Rest at camp: restore party, advance day */
  rest(): void {
    // Stub — Phase 6
  }

  /** Show available buildings and upgrades */
  getBuildings(): any[] {
    // Stub
    return [];
  }
}
