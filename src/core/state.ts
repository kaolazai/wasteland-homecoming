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
  bloodlust: { type: 'bloodlust', name: '嗜血本能', desc: '杀戮的快感让你欲罢不能，但代谢也在加速。',   benefit: '击杀回15%HP+额外掉落', cost: '饱食消耗2倍' },
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

export interface PlayerState {
  hp: number;
  maxHp: number;
  maxHpBase: number;
  hunger: number;
  maxHunger: number;
  baseAttack: number;
  baseDefense: number;
  gold: number;
  floor: number;
  maxFloorReached: number;
  turns: number;
  inventory: InventoryItem[];
  inventorySlots: number;
  equippedWeapon: string | null;
  equippedWeaponAffix: string | null;
  equippedArmor: string | null;
  equippedArmorAffix: string | null;
  baseLevel: BaseLevel;
  map: FloorMap | null;
  activeMutation: MutationType | null;
  delayedEffects: DelayedEffect[];
  savedEnemies: SavedEnemy[];
  // Narrative
  knownRecipes: string[];
  journalEntries: string[];
  npcProgress: Record<string, number>;
  campNpcs: string[];
  // Skills
  skills: string[];
  skillPoints: number;
  // Quests
  activeQuests: string[];
  completedQuests: string[];
  questKills: Record<string, number>;
  // Achievements & lifetime stats
  unlockedAchievements: string[];
  lifetimeKills: number;
  lifetimeDeaths: number;
  lifetimeGold: number;
  lifetimeBossKills: number;
  // Endless mode
  endlessUnlocked: boolean;
  endlessHighFloor: number;
  // Per-run flags
  healUsedThisRun: boolean;
  adReviveUsed: boolean;
}

export function createInitialState(): PlayerState {
  return {
    hp: 20,
    maxHp: 20,
    maxHpBase: 20,
    hunger: 100,
    maxHunger: 100,
    baseAttack: 4,
    baseDefense: 1,
    gold: 0,
    floor: 1,
    maxFloorReached: 1,
    turns: 0,
    inventory: [],
    inventorySlots: 16,
    equippedWeapon: null,
    equippedWeaponAffix: null,
    equippedArmor: null,
    equippedArmorAffix: null,
    baseLevel: { armory: 0, kitchen: 0, shelter: 0, workbench: 0, clinic: 0, signalTower: 0, shop: 0, warehouse: 0 },
    map: null,
    activeMutation: null,
    delayedEffects: [],
    savedEnemies: [],
    knownRecipes: [],
    journalEntries: [],
    npcProgress: {},
    campNpcs: [],
    skills: [],
    skillPoints: 0,
    activeQuests: [],
    completedQuests: [],
    questKills: {},
    unlockedAchievements: [],
    lifetimeKills: 0,
    lifetimeDeaths: 0,
    lifetimeGold: 0,
    lifetimeBossKills: 0,
    endlessUnlocked: false,
    endlessHighFloor: 0,
    healUsedThisRun: false,
    adReviveUsed: false,
  };
}

/** Recalculate inventory slots based on warehouse level */
export function calcInventorySlots(state: PlayerState): number {
  return 16 + state.baseLevel.warehouse * 4;
}

export function getAttack(state: PlayerState, items: Record<string, { attack?: number }>): number {
  let atk = state.baseAttack + state.baseLevel.armory * 2;
  if (state.equippedWeapon && items[state.equippedWeapon]) {
    atk += items[state.equippedWeapon].attack ?? 0;
  }
  // Flesh mutation: +50%
  if (state.activeMutation === 'flesh') {
    atk = Math.floor(atk * 1.5);
  }
  return atk;
}

export function getDefense(state: PlayerState, items: Record<string, { defense?: number }>): number {
  let def = state.baseDefense;
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
  // Flat reduction: subtract half of DEF
  // Percentage reduction: DEF * 4% (caps at 40% at DEF 10)
  const flat = Math.floor(defense / 2);
  const pctReduction = Math.min(0.4, defense * 0.04);
  return Math.max(1, Math.floor((rawAtk - flat) * (1 - pctReduction)));
}

/** Calculate actual damage taken after mutation modifiers */
export function calcDamageTaken(state: PlayerState, rawDamage: number): number {
  let dmg = rawDamage;
  if (state.activeMutation === 'iron') {
    dmg = Math.ceil(dmg * 0.6); // -40%
  }
  if (state.activeMutation === 'darksight') {
    dmg += 1;
  }
  return Math.max(1, dmg);
}

/** Get hunger cost multiplier */
export function getHungerMultiplier(state: PlayerState): number {
  return state.activeMutation === 'bloodlust' ? 2 : 1;
}

/** Check if player can use consumables */
export function canUseConsumables(state: PlayerState): boolean {
  return state.activeMutation !== 'regen';
}

/** Check if player can escape combat */
export function canEscape(state: PlayerState): boolean {
  return state.activeMutation !== 'iron';
}

/** Get escape success rate */
export function getEscapeChance(state: PlayerState): number {
  return state.activeMutation === 'iron' ? 0 : 0.5;
}

/** Apply mutation to player state */
export function applyMutation(state: PlayerState, type: MutationType): void {
  state.activeMutation = type;
  if (type === 'flesh') {
    // -25% max HP
    state.maxHp = Math.floor(state.maxHpBase * 0.75);
    state.hp = Math.min(state.hp, state.maxHp);
  }
}

/** Clear mutation (on return to base) */
export function clearMutation(state: PlayerState): void {
  state.activeMutation = null;
  // Restore max HP
  state.maxHp = state.maxHpBase + state.baseLevel.shelter * 5;
  state.hp = Math.min(state.hp, state.maxHp);
}

export function getInventoryUsed(state: PlayerState): number {
  return state.inventory.reduce((sum, i) => sum + i.count, 0);
}

export function isInventoryFull(state: PlayerState): boolean {
  return getInventoryUsed(state) >= state.inventorySlots;
}

export function addItem(state: PlayerState, itemId: string, count = 1): boolean {
  if (getInventoryUsed(state) + count > state.inventorySlots) {
    return false; // Full
  }
  const existing = state.inventory.find(i => i.id === itemId);
  if (existing) {
    existing.count += count;
  } else {
    state.inventory.push({ id: itemId, count });
  }
  return true;
}

export function removeItem(state: PlayerState, itemId: string, count = 1): boolean {
  const existing = state.inventory.find(i => i.id === itemId);
  if (!existing || existing.count < count) return false;
  existing.count -= count;
  if (existing.count <= 0) {
    state.inventory = state.inventory.filter(i => i.id !== itemId);
  }
  return true;
}

export function hasItem(state: PlayerState, itemId: string): boolean {
  return state.inventory.some(i => i.id === itemId && i.count > 0);
}

// === Save System (multi-slot) ===

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
      // Ensure slots array matches totalSlots
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
    // Migrate old save to slot 0
    localStorage.setItem(SAVE_PREFIX + '0', oldSave);
    localStorage.removeItem(oldKey);
    try {
      const state = JSON.parse(oldSave) as PlayerState;
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

export function saveState(state: PlayerState, slot?: number): void {
  const meta = loadMeta();
  const s = slot ?? meta.activeSlot;
  localStorage.setItem(SAVE_PREFIX + s, JSON.stringify(state));
  meta.slots[s] = { occupied: true, floor: state.floor, gold: state.gold, turns: state.turns, savedAt: Date.now() };
  meta.activeSlot = s;
  saveMeta(meta);
}

export function loadState(slot?: number): PlayerState | null {
  const meta = loadMeta();
  const s = slot ?? meta.activeSlot;
  const raw = localStorage.getItem(SAVE_PREFIX + s);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    // Merge with defaults so old saves get new fields
    const defaults = createInitialState();
    const state: PlayerState = { ...defaults, ...saved };
    // Deep merge baseLevel to pick up new building keys
    state.baseLevel = { ...defaults.baseLevel, ...saved.baseLevel };
    // Ensure arrays are arrays (not undefined from old saves)
    if (!Array.isArray(state.knownRecipes)) state.knownRecipes = [];
    if (!Array.isArray(state.journalEntries)) state.journalEntries = [];
    if (!Array.isArray(state.campNpcs)) state.campNpcs = [];
    if (!Array.isArray(state.delayedEffects)) state.delayedEffects = [];
    if (!Array.isArray(state.savedEnemies)) state.savedEnemies = [];
    if (!Array.isArray(state.skills)) state.skills = [];
    if (typeof state.skillPoints !== 'number') state.skillPoints = 0;
    if (!state.npcProgress || typeof state.npcProgress !== 'object') state.npcProgress = {};
    if (!Array.isArray(state.activeQuests)) state.activeQuests = [];
    if (!Array.isArray(state.completedQuests)) state.completedQuests = [];
    if (!state.questKills || typeof state.questKills !== 'object') state.questKills = {};
    if (!Array.isArray(state.unlockedAchievements)) state.unlockedAchievements = [];
    if (typeof state.lifetimeKills !== 'number') state.lifetimeKills = 0;
    if (typeof state.lifetimeDeaths !== 'number') state.lifetimeDeaths = 0;
    if (typeof state.lifetimeGold !== 'number') state.lifetimeGold = 0;
    if (typeof state.lifetimeBossKills !== 'number') state.lifetimeBossKills = 0;
    if (typeof state.endlessUnlocked !== 'boolean') state.endlessUnlocked = false;
    if (typeof state.endlessHighFloor !== 'number') state.endlessHighFloor = 0;
    if (typeof state.maxFloorReached !== 'number') state.maxFloorReached = state.floor;
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
