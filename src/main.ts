import { Game } from './core/game';
import { GameEngine } from './core/engine';

// ── Phase 1: old Game class drives everything ──────────────────────
// The monolithic Game class (3139 lines) stays in charge.
// GameEngine is loaded alongside it as a scaffold for Phase 2+.

const game = new Game();
game.start();

// ── New engine scaffold (Phase 2+ will migrate features here) ──────
// Instantiate the engine so its systems are ready, but do NOT let it
// drive the UI or game loop yet. It sits idle until we start migrating
// individual features (party management, combat, etc.) one by one.
const engine = new GameEngine();
engine.init();

// Expose both on window for dev-tools debugging.
// e.g. in console: __game.state, __engine.state, __engine.party
(window as any).__game = game;
(window as any).__engine = engine;
