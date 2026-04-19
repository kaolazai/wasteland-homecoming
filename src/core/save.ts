// Re-export everything from state.ts so that code importing from './save'
// still works. The canonical v4 save functions live in state.ts now.
// This file exists purely as a compatibility shim for engine.ts and
// any other module that was written to import from '../core/save'.

export {
  type GameState,
  type PartyMember,
  createInitialGameState,
  createInitialState,
  loadState,
  saveState,
  clearSave,
  loadMeta,
  saveMeta,
  unlockSlot,
  getMaxSlots,
  type SaveMeta,
  type SlotInfo,
} from './state';
