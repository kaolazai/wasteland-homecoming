import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class ExplorationSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Travel to a connected node */
  travelTo(nodeId: string): boolean {
    // Stub — Phase 5
    return false;
  }

  /** Get available connections from current node */
  getConnections(): string[] {
    // Stub
    return [];
  }

  /** Check if a node is unlocked */
  isNodeUnlocked(nodeId: string): boolean {
    return this.state.unlockedNodeIds.includes(nodeId);
  }
}
