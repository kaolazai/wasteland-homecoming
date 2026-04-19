import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class KarmaSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Apply a karma change from a choice */
  applyKarma(nodeId: string, choiceId: string, amount: number): void {
    this.state.karma = Math.max(-100, Math.min(100, this.state.karma + amount));
    this.state.karmaHistory.push({
      nodeId,
      choiceId,
      karmaChange: amount,
      day: this.state.day,
    });
    this.bus.emit('karma-changed', { karma: this.state.karma, change: amount });
  }

  /** Check if karma meets a threshold */
  meetsThreshold(min?: number, max?: number): boolean {
    if (min !== undefined && this.state.karma < min) return false;
    if (max !== undefined && this.state.karma > max) return false;
    return true;
  }

  /** Get karma alignment label */
  getAlignment(): string {
    if (this.state.karma >= 50) return '圣者';
    if (this.state.karma >= 20) return '善良';
    if (this.state.karma >= -20) return '中立';
    if (this.state.karma >= -50) return '邪恶';
    return '暴君';
  }
}
