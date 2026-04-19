import type { GameState } from './state';
import { createInitialGameState } from './state';
import { EventBus } from './event-bus';
import { loadState, saveState } from './save';
import { PartySystem } from '../systems/party';
import { CombatSystem } from '../systems/combat';
import { ExplorationSystem } from '../systems/exploration';
import { CampSystem } from '../systems/camp';
import { JobSystem } from '../systems/job';
import { StaminaSystem } from '../systems/stamina';
import { LiteratureSystem } from '../systems/literature';
import { BossWeaknessSystem } from '../systems/boss-weakness';
import { KarmaSystem } from '../systems/karma';
import { InventorySystem } from '../systems/inventory';
import { QuestSystem } from '../systems/quest';
import { AchievementSystem } from '../systems/achievement';
import { CraftingSystem } from '../systems/crafting';

/**
 * GameEngine — the new modular game architecture.
 *
 * Phase 1 strategy:
 *   The old monolithic `Game` class (src/core/game.ts) continues to run the
 *   game. GameEngine is instantiated alongside it as an idle scaffold.
 *   It does NOT touch the DOM or drive any UI.
 *
 * Phase 2+ strategy:
 *   Individual features (party, combat, exploration, ...) will be migrated
 *   from the old Game class to the corresponding system module here.
 *   Each migration replaces one slice of Game with the new system, so the
 *   old class shrinks progressively until it can be deleted.
 *
 * The engine is safe to instantiate even when the old Game is running:
 *   - It creates its own GameState (loaded from save, same as Game)
 *   - It does NOT render anything or attach event listeners to the DOM
 *   - Systems are stubs that will be filled in during later phases
 */
export class GameEngine {
  state: GameState;
  bus: EventBus;

  // ── System modules (stubs until their phase activates them) ──
  party: PartySystem;
  combat: CombatSystem;
  exploration: ExplorationSystem;
  camp: CampSystem;
  job: JobSystem;
  stamina: StaminaSystem;
  literature: LiteratureSystem;
  bossWeakness: BossWeaknessSystem;
  karma: KarmaSystem;
  inventory: InventorySystem;
  quest: QuestSystem;
  achievement: AchievementSystem;
  crafting: CraftingSystem;

  private _initialized = false;

  constructor() {
    this.state = loadState() ?? createInitialGameState();
    this.bus = new EventBus();

    this.party = new PartySystem(this.state, this.bus);
    this.combat = new CombatSystem(this.state, this.bus);
    this.exploration = new ExplorationSystem(this.state, this.bus);
    this.camp = new CampSystem(this.state, this.bus);
    this.job = new JobSystem(this.state, this.bus);
    this.stamina = new StaminaSystem(this.state, this.bus);
    this.literature = new LiteratureSystem(this.state, this.bus);
    this.bossWeakness = new BossWeaknessSystem(this.state, this.bus);
    this.karma = new KarmaSystem(this.state, this.bus);
    this.inventory = new InventorySystem(this.state, this.bus);
    this.quest = new QuestSystem(this.state, this.bus);
    this.achievement = new AchievementSystem(this.state, this.bus);
    this.crafting = new CraftingSystem(this.state, this.bus);
  }

  // ────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────

  /**
   * Initialize the engine (safe to call while old Game is running).
   * Logs readiness but does NOT render or start any game loop.
   */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;

    console.log('[GameEngine] scaffold loaded (Phase 1 — idle)');
    console.log(
      `[GameEngine] state: day ${this.state.day}, ` +
      `stamina ${this.state.stamina}/${this.state.maxStamina}, ` +
      `party: ${this.state.party.map(m => m.name).join(', ')}`,
    );
  }

  /**
   * Start the engine as the primary driver.
   * NOT called in Phase 1 — reserved for when the old Game is retired.
   */
  start(): void {
    this.init();
    // TODO: Phase 2+ — route to camp or resume exploration based on state
    console.log('[GameEngine] start() called — not yet driving UI');
  }

  // ────────────────────────────────────────────────────────────────
  // Persistence
  // ────────────────────────────────────────────────────────────────

  /** Save current state to localStorage */
  save(slot?: number): void {
    saveState(this.state, slot);
  }

  // ────────────────────────────────────────────────────────────────
  // Legacy bridge (Phase 2+ migration helpers)
  // ────────────────────────────────────────────────────────────────

  /**
   * Get a typed reference to a system by name.
   * Useful for Phase 2+ code that needs to call new system methods
   * while the old Game class is still running other parts.
   *
   * Example:
   *   const party = engine.getSystem('party');
   *   party.addToParty(newMember);
   */
  getSystem<K extends keyof GameEngine.SystemMap>(
    name: K,
  ): GameEngine.SystemMap[K] {
    return (this as any)[name];
  }

  /**
   * Reload state from localStorage.
   * Call this if the old Game class saved and you want the engine's
   * state to stay in sync without a page reload.
   */
  reloadState(): void {
    const fresh = loadState();
    if (fresh) {
      this.state = fresh;
      // Re-wire all systems to the new state object
      this._rebindSystems();
    }
  }

  /** Re-bind all system references after state reload */
  private _rebindSystems(): void {
    this.party = new PartySystem(this.state, this.bus);
    this.combat = new CombatSystem(this.state, this.bus);
    this.exploration = new ExplorationSystem(this.state, this.bus);
    this.camp = new CampSystem(this.state, this.bus);
    this.job = new JobSystem(this.state, this.bus);
    this.stamina = new StaminaSystem(this.state, this.bus);
    this.literature = new LiteratureSystem(this.state, this.bus);
    this.bossWeakness = new BossWeaknessSystem(this.state, this.bus);
    this.karma = new KarmaSystem(this.state, this.bus);
    this.inventory = new InventorySystem(this.state, this.bus);
    this.quest = new QuestSystem(this.state, this.bus);
    this.achievement = new AchievementSystem(this.state, this.bus);
    this.crafting = new CraftingSystem(this.state, this.bus);
  }
}

// ── Type map for getSystem() ────────────────────────────────────────
export namespace GameEngine {
  export interface SystemMap {
    party: PartySystem;
    combat: CombatSystem;
    exploration: ExplorationSystem;
    camp: CampSystem;
    job: JobSystem;
    stamina: StaminaSystem;
    literature: LiteratureSystem;
    bossWeakness: BossWeaknessSystem;
    karma: KarmaSystem;
    inventory: InventorySystem;
    quest: QuestSystem;
    achievement: AchievementSystem;
    crafting: CraftingSystem;
  }
}
