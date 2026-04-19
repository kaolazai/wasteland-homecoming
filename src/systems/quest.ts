import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class QuestSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Accept a quest */
  accept(questId: string): void {
    if (!this.state.activeQuests.includes(questId)) {
      this.state.activeQuests.push(questId);
      this.bus.emit('quest-accepted', { questId });
    }
  }

  /** Complete a quest */
  complete(questId: string): void {
    this.state.activeQuests = this.state.activeQuests.filter(q => q !== questId);
    if (!this.state.completedQuests.includes(questId)) {
      this.state.completedQuests.push(questId);
      this.bus.emit('quest-completed', { questId });
    }
  }

  isActive(questId: string): boolean {
    return this.state.activeQuests.includes(questId);
  }

  isCompleted(questId: string): boolean {
    return this.state.completedQuests.includes(questId);
  }
}
