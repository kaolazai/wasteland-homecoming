import type { GameState } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class StaminaSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Consume stamina for an action */
  consume(amount: number): boolean {
    if (this.state.stamina < amount) return false;
    this.state.stamina -= amount;
    this.bus.emit('stamina-changed', { stamina: this.state.stamina });
    return true;
  }

  /** Rest: restore stamina, advance day */
  rest(): void {
    this.state.stamina = this.state.maxStamina;
    this.state.day++;
    this.bus.emit('day-advanced', { day: this.state.day });
    this.bus.emit('stamina-changed', { stamina: this.state.stamina });
  }

  /** Restore stamina from food */
  restore(amount: number): void {
    this.state.stamina = Math.min(this.state.maxStamina, this.state.stamina + amount);
    this.bus.emit('stamina-changed', { stamina: this.state.stamina });
  }

  canAct(cost: number): boolean {
    return this.state.stamina >= cost;
  }
}
