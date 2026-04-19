import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class CraftingSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Get available recipes */
  getAvailableRecipes(): string[] {
    return this.state.knownRecipes;
  }

  /** Craft an item */
  craft(recipeId: string): boolean {
    // Stub — will be extracted from Game class in Phase 1
    return false;
  }
}
