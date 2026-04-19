import type { GameState, PartyMember, StatusEffect } from '../core/state';
import type { EventBus } from '../core/event-bus';
import type { EnemyData } from '../data/enemies';

export interface CombatActor {
  id: string;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: string[];
  statusEffects: StatusEffect[];
  isAlive: boolean;
  isDefending: boolean;
  /** Reference back to PartyMember or EnemyData */
  ref: PartyMember | EnemyData;
}

export interface CombatState {
  actors: CombatActor[];
  turnOrder: string[];
  currentTurnIdx: number;
  round: number;
  log: string[];
  result: 'ongoing' | 'victory' | 'defeat' | 'escaped';
}

export type CombatEndCallback = (result: 'victory' | 'defeat' | 'escaped', rewards?: { exp: number; gold: number; loot: string[] }) => void;

export class CombatSystem {
  private combat: CombatState | null = null;
  private onEnd: CombatEndCallback | null = null;

  constructor(private state: GameState, private bus: EventBus) {}

  /** Start a new combat encounter */
  startCombat(enemies: EnemyData[], onEnd: CombatEndCallback): void {
    // Stub — will be fully implemented in Phase 3
    this.onEnd = onEnd;
    this.combat = {
      actors: [],
      turnOrder: [],
      currentTurnIdx: 0,
      round: 1,
      log: [],
      result: 'ongoing',
    };
    this.bus.emit('combat-start', { enemies });
  }

  getCombatState(): CombatState | null {
    return this.combat;
  }

  endCombat(): void {
    this.combat = null;
  }
}
