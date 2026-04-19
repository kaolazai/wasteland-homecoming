import type { FloorMap } from '../data/maps';

export interface InventoryItem {
  id: string;
  count: number;
  /** Weapon affix (only for weapons/armor) */
  affix?: string;
}

export type MutationType = 'flesh' | 'iron' | 'bloodlust' | 'darksight' | 'regen';

export interface Mutation {
  type: MutationType;
  name: string;
  desc: string;
  benefit: string;
  cost: string;
}

export const MUTATIONS: Record<MutationType, Mutation> = {
  flesh:     { type: 'flesh',     name: '血肉强化', desc: '肌肉异常膨胀，力量暴增，但身体变得脆弱。', benefit: '攻击力 +50%', cost: '最大HP -25%' },
  iron:      { type: 'iron',      name: '铁皮化',   desc: '皮肤角质化为金属，刀枪不入，但行动迟缓。', benefit: '受伤 -40%',   cost: '无法逃跑' },
  bloodlust: { type: 'bloodlust', name: '嗜血本能', desc: '杀戮的快感让你欲罢不能，但代谢也在加速。',   benefit: '击杀回15%HP+额外掉落', cost: '体力消耗2倍' },
  darksight: { type: 'darksight', name: '暗视觉',   desc: '你的眼睛发生了变异，能看穿一切黑暗。',       benefit: '全图可见+可看敌人HP', cost: '受伤 +1' },
  regen:     { type: 'regen',     name: '再生体',   desc: '伤口以肉眼可见的速度愈合，但排斥一切外来物质。', benefit: '进入新房间+3HP', cost: '无法使用消耗品' },
};

export interface DelayedEffect {
  /** Floor number when this triggers */
  triggerFloor: number;
  text: string;
  hp?: number;
  hunger?: number;
  gold?: number;
  mutation?: MutationType;
}

/** Saved enemy state for rooms where player escaped */
export interface SavedEnemy {
  roomIdx: number;
  enemyId: string;
  currentHp: number;
}

export interface BaseLevel {
  armory: number;
  kitchen: number;
  shelter: number;
  workbench: number;
  clinic: number;
  signalTower: number;
  shop: number;
  warehouse: number;
}

// =====================================================================
// V4 TYPES — GameState (party-based, node-based, stamina/day)
// =====================================================================

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  turnsRemaining: number;
  attackMod?: number;
  defenseMod?: number;
  poisonDmg?: number;
  healPerTurn?: number;
  stunned?: boolean;
}

export interface Equipment {
  weapon: InventoryItem | null;
  armor: InventoryItem | null;
  accessory: InventoryItem | null;
}

export interface PartyMember {
  id: string;
  companionId: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  currentJobId: string;
  jobLevels: Record<string, number>;
  sp: number;
  equipment: Equipment;
  learnedSkills: string[];
  equippedSkills: string[];
  statusEffects: StatusEffect[];
  isAlive: boolean;
}

export interface NodeInstanceState {
  /** Which rooms have been explored in dungeon nodes */
  exploredRooms: number[];
  /** Internal map for dungeon nodes (generated once, persisted) */
  internalMap: any | null;
  /** Per-node visit counters (e.g. gambler uses) */
  visitCounts: Record<string, number>;
  /** Whether this node's boss has been defeated */
  bossDefeated: boolean;
}

export interface KarmaChoice {
  nodeId: string;
  choiceId: string;
  karmaChange: number;
  day: number;
}

export interface GameState {
  // Party
  party: PartyMember[];
  companions: PartyMember[];
  // Economy
  gold: number;
  // Day/Stamina
  day: number;
  stamina: number;
  maxStamina: number;
  // Karma
  karma: number;
  karmaHistory: KarmaChoice[];
  // World map
  currentNodeId: string | null;
  unlockedNodeIds: string[];
  clearedNodeIds: string[];
  nodeState: Record<string, NodeInstanceState>;
  // Inventory (shared)
  inventory: InventoryItem[];
  inventorySlots: number;
  // Buildings
  baseLevel: BaseLevel;
  // Crafting
  knownRecipes: string[];
  // Narrative
  journalEntries: string[];
  npcProgress: Record<string, number>;
  campNpcs: string[];
  // Skills (legacy, kept for compat)
  skills: string[];
  skillPoints: number;
  // Jobs
  jobLevels: Record<string, number>;
  // Quests
  activeQuests: string[];
  completedQuests: string[];
  questKills: Record<string, number>;
  // Literature
  collectedLore: string[];
  solvedPuzzles: string[];
  discoveredWeaknesses: string[];
  // Achievements & lifetime stats
  unlockedAchievements: string[];
  lifetimeKills: number;
  lifetimeDeaths: number;
  lifetimeGold: number;
  lifetimeBossKills: number;
  // Endings
  endingsReached: string[];
  // Endless mode (legacy)
  endlessUnlocked: boolean;
  endlessHighFloor: number;
  // Per-run flags
  healUsedThisRun: boolean;
  adReviveUsed: boolean;

  // === Legacy bridge fields (kept for backward compat during Phase 2 transition) ===
  /** Current dungeon floor level */
  floor: number;
  /** Highest floor ever reached */
  maxFloorReached: number;
  /** Current floor map data */
  map: FloorMap | null;
  /** Active mutation during dungeon run */
  activeMutation: MutationType | null;
  /** Effects that trigger on future floors */
  delayedEffects: DelayedEffect[];
  /** Enemy state saved when player escapes */
  savedEnemies: SavedEnemy[];
  /** Legacy equipped weapon id — reads from party[0].equipment */
  equippedWeapon: string | null;
  /** Legacy equipped weapon affix */
  equippedWeaponAffix: string | null;
  /** Legacy equipped armor id */
  equippedArmor: string | null;
  /** Legacy equipped armor affix */
  equippedArmorAffix: string | null;
  /** Max stamina (renamed from maxHunger) */
  maxHpBase: number;
  /** Turn counter (legacy) */
  turns: number;
}

export function createInitialGameState(): GameState {
  const protagonist: PartyMember = {
    id: 'protagonist',
    companionId: 'protagonist',
    name: '幸存者',
    level: 1,
    exp: 0,
    hp: 20,
    maxHp: 20,
    mp: 20,
    maxMp: 20,
    baseAttack: 4,
    baseDefense: 1,
    speed: 10,
    currentJobId: 'scavenger',
    jobLevels: { scavenger: 1 },
    sp: 0,
    equipment: { weapon: null, armor: null, accessory: null },
    learnedSkills: [],
    equippedSkills: [],
    statusEffects: [],
    isAlive: true,
  };

  return {
    party: [protagonist],
    companions: [],
    gold: 0,
    day: 1,
    stamina: 100,
    maxStamina: 100,
    karma: 0,
    karmaHistory: [],
    currentNodeId: 'camp',
    unlockedNodeIds: ['camp', 'ruins_entrance'],
    clearedNodeIds: [],
    nodeState: {},
    inventory: [],
    inventorySlots: 24,
    baseLevel: { armory: 0, kitchen: 0, shelter: 0, workbench: 0, clinic: 0, signalTower: 0, shop: 0, warehouse: 0 },
    knownRecipes: [],
    journalEntries: [],
    npcProgress: {},
    campNpcs: [],
    skills: [],
    skillPoints: 0,
    jobLevels: {},
    activeQuests: [],
    completedQuests: [],
    questKills: {},
    collectedLore: [],
    solvedPuzzles: [],
    discoveredWeaknesses: [],
    unlockedAchievements: [],
    lifetimeKills: 0,
    lifetimeDeaths: 0,
    lifetimeGold: 0,
    lifetimeBossKills: 0,
    endingsReached: [],
    endlessUnlocked: false,
    endlessHighFloor: 0,
    healUsedThisRun: false,
    adReviveUsed: false,
    // Legacy bridge fields
    floor: 1,
    maxFloorReached: 1,
    map: null,
    activeMutation: null,
    delayedEffects: [],
    savedEnemies: [],
    equippedWeapon: null,
    equippedWeaponAffix: null,
    equippedArmor: null,
    equippedArmorAffix: null,
    maxHpBase: 20,
    turns: 0,
  };
}

// Keep backward compat alias
export function createInitialState(): GameState {
  return createInitialGameState();
}

/** Recalculate inventory slots based on warehouse level */
export function calcInventorySlots(state: GameState): number {
  return 24 + state.baseLevel.warehouse * 4;
}

export function getAttack(state: GameState, items: Record<string, { attack?: number }>): number {
  let atk = state.party[0].baseAttack + state.baseLevel.armory * 2;
  if (state.equippedWeapon && items[state.equippedWeapon]) {
    atk += items[state.equippedWeapon].attack ?? 0;
  }
  // Flesh mutation: +50%
  if (state.activeMutation === 'flesh') {
    atk = Math.floor(atk * 1.5);
  }
  return atk;
}

export function getDefense(state: GameState, items: Record<string, { defense?: number }>): number {
  let def = state.party[0].baseDefense;
  if (state.equippedArmor && items[state.equippedArmor]) {
    def += items[state.equippedArmor].defense ?? 0;
  }
  // Sturdy affix: +2 defense (on weapon or armor)
  if (state.equippedWeaponAffix === 'sturdy') def += 2;
  if (state.equippedArmorAffix === 'sturdy') def += 2;
  return def;
}

/** Apply defense to reduce raw attack damage (hybrid: flat reduction + percentage) */
export function applyDefense(rawAtk: number, defense: number): number {
  const flat = Math.floor(defense / 2);
  const pctReduction = Math.min(0.4, defense * 0.04);
  return Math.max(1, Math.floor((rawAtk - flat) * (1 - pctReduction)));
}

/** Calculate actual damage taken after mutation modifiers */
export function calcDamageTaken(state: GameState, rawDamage: number): number {
  let dmg = rawDamage;
  if (state.activeMutation === 'iron') {
    dmg = Math.ceil(dmg * 0.6); // -40%
  }
  if (state.activeMutation === 'darksight') {
    dmg += 1;
  }
  return Math.max(1, dmg);
}

/** Get stamina cost multiplier (was hunger) */
export function getHungerMultiplier(state: GameState): number {
  return state.activeMutation === 'bloodlust' ? 2 : 1;
}

/** Check if player can use consumables */
export function canUseConsumables(state: GameState): boolean {
  return state.activeMutation !== 'regen';
}

/** Check if player can escape combat */
export function canEscape(state: GameState): boolean {
  return state.activeMutation !== 'iron';
}

/** Get escape success rate */
export function getEscapeChance(state: GameState): number {
  return state.activeMutation === 'iron' ? 0 : 0.5;
}

/** Apply mutation to player state */
export function applyMutation(state: GameState, type: MutationType): void {
  state.activeMutation = type;
  if (type === 'flesh') {
    // -25% max HP based on clean base value (FIX C1: no double-counting)
    const cleanMaxHp = state.maxHpBase + state.baseLevel.shelter * 5;
    state.party[0].maxHp = Math.floor(cleanMaxHp * 0.75);
    state.party[0].hp = Math.min(state.party[0].hp, state.party[0].maxHp);
  }
}

/** Clear mutation (on return to base) — FIX C1: calculate from clean base */
export function clearMutation(state: GameState): void {
  state.activeMutation = null;
  // Restore max HP from clean base (no double-counting)
  state.party[0].maxHp = state.maxHpBase + state.baseLevel.shelter * 5;
  state.party[0].hp = Math.min(state.party[0].hp, state.party[0].maxHp);
}

/** FIX M5: return number of stacks (inventory.length), not sum of counts */
export function getInventoryUsed(state: GameState): number {
  return state.inventory.length;
}

export function isInventoryFull(state: GameState): boolean {
  return getInventoryUsed(state) >= state.inventorySlots;
}

export function addItem(state: GameState, itemId: string, count = 1): boolean {
  const existing = state.inventory.find(i => i.id === itemId);
  if (existing) {
    existing.count += count;
    return true;
  }
  // Adding a new stack — check if we have room
  if (getInventoryUsed(state) >= state.inventorySlots) {
    return false; // Full
  }
  state.inventory.push({ id: itemId, count });
  return true;
}

export function removeItem(state: GameState, itemId: string, count = 1): boolean {
  const existing = state.inventory.find(i => i.id === itemId);
  if (!existing || existing.count < count) return false;
  existing.count -= count;
  if (existing.count <= 0) {
    state.inventory = state.inventory.filter(i => i.id !== itemId);
  }
  return true;
}

export function hasItem(state: GameState, itemId: string): boolean {
  return state.inventory.some(i => i.id === itemId && i.count > 0);
}

// === Save System (multi-slot) — V3 legacy kept for backward compat ===

const SAVE_PREFIX = 'wasteland_save_v3_slot_';
const META_KEY = 'wasteland_meta';
const MAX_SLOTS = 5;

export interface SlotInfo {
  occupied: boolean;
  floor?: number;
  gold?: number;
  turns?: number;
  savedAt?: number;
}

export interface SaveMeta {
  totalSlots: number;
  activeSlot: number;
  slots: SlotInfo[];
}

export function loadMeta(): SaveMeta {
  const raw = localStorage.getItem(META_KEY);
  if (raw) {
    try {
      const meta = JSON.parse(raw) as SaveMeta;
      while (meta.slots.length < meta.totalSlots) {
        meta.slots.push({ occupied: false });
      }
      return meta;
    } catch { /* fall through */ }
  }

  // Migration: check for old single-slot save
  const oldKey = 'wasteland_save_v3';
  const oldSave = localStorage.getItem(oldKey);
  const meta: SaveMeta = { totalSlots: 1, activeSlot: 0, slots: [{ occupied: false }] };
  if (oldSave) {
    localStorage.setItem(SAVE_PREFIX + '0', oldSave);
    localStorage.removeItem(oldKey);
    try {
      const state = JSON.parse(oldSave) as any;
      meta.slots[0] = { occupied: true, floor: state.floor, gold: state.gold, turns: state.turns, savedAt: Date.now() };
    } catch {
      meta.slots[0] = { occupied: true, savedAt: Date.now() };
    }
    saveMeta(meta);
  }
  return meta;
}

export function saveMeta(meta: SaveMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function saveState(state: GameState, slot?: number): void {
  const meta = loadMeta();
  const s = slot ?? meta.activeSlot;
  localStorage.setItem(SAVE_PREFIX + s, JSON.stringify(state));
  meta.slots[s] = { occupied: true, floor: state.floor, gold: state.gold, turns: state.turns, savedAt: Date.now() };
  meta.activeSlot = s;
  saveMeta(meta);
}

export function loadState(slot?: number): GameState | null {
  const meta = loadMeta();
  const s = slot ?? meta.activeSlot;
  const raw = localStorage.getItem(SAVE_PREFIX + s);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    const defaults = createInitialGameState();
    const state: GameState = { ...defaults, ...saved };
    // Deep merge baseLevel to pick up new building keys
    state.baseLevel = { ...defaults.baseLevel, ...saved.baseLevel };

    // Migrate old PlayerState saves to GameState shape
    if (!Array.isArray(state.party) || state.party.length === 0) {
      // This is an old v3 PlayerState — build protagonist from old fields
      const oldHp = saved.hp ?? 20;
      const oldMaxHp = saved.maxHp ?? 20;
      const oldBaseAttack = saved.baseAttack ?? 4;
      const oldBaseDefense = saved.baseDefense ?? 1;
      const protagonist: PartyMember = {
        id: 'protagonist',
        companionId: 'protagonist',
        name: '幸存者',
        level: 1,
        exp: 0,
        hp: oldHp,
        maxHp: oldMaxHp,
        mp: 20,
        maxMp: 20,
        baseAttack: oldBaseAttack,
        baseDefense: oldBaseDefense,
        speed: 10,
        currentJobId: 'scavenger',
        jobLevels: { scavenger: 1 },
        sp: saved.skillPoints ?? 0,
        equipment: {
          weapon: saved.equippedWeapon ? { id: saved.equippedWeapon, count: 1, affix: saved.equippedWeaponAffix ?? undefined } : null,
          armor: saved.equippedArmor ? { id: saved.equippedArmor, count: 1, affix: saved.equippedArmorAffix ?? undefined } : null,
          accessory: null,
        },
        learnedSkills: saved.skills ?? [],
        equippedSkills: (saved.skills ?? []).slice(0, 4),
        statusEffects: [],
        isAlive: true,
      };
      state.party = [protagonist];
      state.companions = [];
      // Migrate hunger to stamina
      if (typeof saved.hunger === 'number') {
        state.stamina = saved.hunger;
      }
      if (typeof saved.maxHunger === 'number') {
        state.maxStamina = saved.maxHunger;
      }
      // Set day=1 for old saves
      if (typeof state.day !== 'number') state.day = 1;
    }

    // Ensure arrays are arrays (not undefined from old saves)
    const arrayFields: (keyof GameState)[] = [
      'party', 'companions', 'knownRecipes', 'journalEntries',
      'campNpcs', 'skills', 'activeQuests', 'completedQuests',
      'unlockedAchievements', 'collectedLore', 'solvedPuzzles',
      'discoveredWeaknesses', 'endingsReached', 'unlockedNodeIds',
      'clearedNodeIds', 'delayedEffects', 'savedEnemies',
    ];
    for (const f of arrayFields) {
      if (!Array.isArray(state[f])) (state as any)[f] = (defaults as any)[f];
    }

    // Ensure objects
    if (!state.npcProgress || typeof state.npcProgress !== 'object') state.npcProgress = {};
    if (!state.questKills || typeof state.questKills !== 'object') state.questKills = {};
    if (!state.nodeState || typeof state.nodeState !== 'object') state.nodeState = {};
    if (!state.jobLevels || typeof state.jobLevels !== 'object') state.jobLevels = {};

    // Ensure numeric fields
    if (typeof state.skillPoints !== 'number') state.skillPoints = 0;
    if (typeof state.lifetimeKills !== 'number') state.lifetimeKills = 0;
    if (typeof state.lifetimeDeaths !== 'number') state.lifetimeDeaths = 0;
    if (typeof state.lifetimeGold !== 'number') state.lifetimeGold = 0;
    if (typeof state.lifetimeBossKills !== 'number') state.lifetimeBossKills = 0;
    if (typeof state.endlessUnlocked !== 'boolean') state.endlessUnlocked = false;
    if (typeof state.endlessHighFloor !== 'number') state.endlessHighFloor = 0;
    if (typeof state.maxFloorReached !== 'number') state.maxFloorReached = state.floor;
    if (typeof state.floor !== 'number') state.floor = 1;
    if (typeof state.turns !== 'number') state.turns = 0;
    if (typeof state.maxHpBase !== 'number') state.maxHpBase = state.party[0]?.maxHp ?? 20;
    if (typeof state.day !== 'number') state.day = 1;
    if (typeof state.stamina !== 'number') state.stamina = 100;
    if (typeof state.maxStamina !== 'number') state.maxStamina = 100;
    if (typeof state.karma !== 'number') state.karma = 0;

    // Sync legacy equip fields with party[0].equipment
    if (state.party[0]) {
      const p = state.party[0];
      if (state.equippedWeapon && !p.equipment.weapon) {
        p.equipment.weapon = { id: state.equippedWeapon, count: 1, affix: state.equippedWeaponAffix ?? undefined };
      }
      if (state.equippedArmor && !p.equipment.armor) {
        p.equipment.armor = { id: state.equippedArmor, count: 1, affix: state.equippedArmorAffix ?? undefined };
      }
    }

    return state;
  } catch {
    return null;
  }
}

export function clearSave(slot?: number): void {
  const meta = loadMeta();
  const s = slot ?? meta.activeSlot;
  localStorage.removeItem(SAVE_PREFIX + s);
  meta.slots[s] = { occupied: false };
  saveMeta(meta);
}

export function unlockSlot(): boolean {
  const meta = loadMeta();
  if (meta.totalSlots >= MAX_SLOTS) return false;
  meta.totalSlots++;
  meta.slots.push({ occupied: false });
  saveMeta(meta);
  return true;
}

export function getMaxSlots(): number {
  return MAX_SLOTS;
}
