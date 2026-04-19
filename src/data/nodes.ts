export type NodeType = 'camp' | 'dungeon' | 'field' | 'ruin' | 'boss_lair' | 'outpost' | 'special';

export interface NodeEncounter {
  type: 'combat' | 'event' | 'trader' | 'rest' | 'puzzle' | 'lore' | 'recruit';
  id: string;
  weight?: number;
  oneTime?: boolean;
}

export interface InternalMapDef {
  width: number;
  height: number;
  roomTypes: string[];
}

export interface UnlockCondition {
  type: 'clear_node' | 'day' | 'quest' | 'karma' | 'lore_count' | 'none';
  value?: string | number;
}

export interface WorldNode {
  id: string;
  name: string;
  icon: string;
  type: NodeType;
  desc: string;
  x: number;
  y: number;
  connections: string[];
  unlockCondition: UnlockCondition;
  staminaCost: number;
  encounters: NodeEncounter[];
  internalMap?: InternalMapDef;
  bossId?: string;
  bossWeaknessId?: string;
  levelRange: [number, number];
}

export const WORLD_NODES: Record<string, WorldNode> = {
  camp: {
    id: 'camp',
    name: '营地',
    icon: '🏕️',
    type: 'camp',
    desc: '你的安全据点，可以休息、管理队伍和升级设施。',
    x: 0, y: 200,
    connections: ['ruins_entrance', 'supply_station', 'underground_tunnel'],
    unlockCondition: { type: 'none' },
    staminaCost: 0,
    encounters: [],
    levelRange: [1, 1],
  },
  ruins_entrance: {
    id: 'ruins_entrance',
    name: '废墟入口',
    icon: '🏚️',
    type: 'dungeon',
    desc: '城市废墟的入口，到处是坍塌的建筑和变异生物。',
    x: 150, y: 100,
    connections: ['camp', 'old_factory'],
    unlockCondition: { type: 'none' },
    staminaCost: 10,
    encounters: [
      { type: 'combat', id: 'mutant_rat', weight: 3 },
      { type: 'combat', id: 'scavenger_thug', weight: 2 },
      { type: 'event', id: 'abandoned_room', weight: 3 },
      { type: 'lore', id: 'lore_survivor_note_1', weight: 1, oneTime: true },
      { type: 'recruit', id: 'kai', weight: 1, oneTime: true },
    ],
    internalMap: { width: 3, height: 3, roomTypes: ['combat', 'event', 'lore', 'empty'] },
    levelRange: [1, 3],
  },
  old_factory: {
    id: 'old_factory',
    name: '旧工厂区',
    icon: '🏭',
    type: 'dungeon',
    desc: '废弃的工业区，残留着旧世界的机械和化学废料。',
    x: 300, y: 50,
    connections: ['ruins_entrance', 'supply_station'],
    unlockCondition: { type: 'clear_node', value: 'ruins_entrance' },
    staminaCost: 15,
    encounters: [
      { type: 'combat', id: 'feral_dog', weight: 2 },
      { type: 'combat', id: 'scrap_golem', weight: 2 },
      { type: 'event', id: 'old_vending', weight: 2 },
      { type: 'trader', id: 'wandering_trader', weight: 1 },
      { type: 'lore', id: 'lore_factory_log', weight: 1, oneTime: true },
      { type: 'recruit', id: 'rook', weight: 1, oneTime: true },
    ],
    internalMap: { width: 4, height: 3, roomTypes: ['combat', 'event', 'trader', 'lore', 'empty'] },
    levelRange: [3, 5],
  },
  supply_station: {
    id: 'supply_station',
    name: '补给站',
    icon: '📦',
    type: 'outpost',
    desc: '几个幸存者社区维持的贸易据点，可以交易和收集情报。',
    x: 200, y: 200,
    connections: ['camp', 'old_factory', 'radiation_forest', 'lab_ruins'],
    unlockCondition: { type: 'clear_node', value: 'ruins_entrance' },
    staminaCost: 10,
    encounters: [
      { type: 'trader', id: 'station_trader', weight: 3 },
      { type: 'event', id: 'station_gossip', weight: 2 },
      { type: 'lore', id: 'lore_station_bulletin', weight: 1, oneTime: true },
      { type: 'recruit', id: 'lin', weight: 1, oneTime: true },
    ],
    levelRange: [2, 4],
  },
  radiation_forest: {
    id: 'radiation_forest',
    name: '辐射森林',
    icon: '🌲',
    type: 'field',
    desc: '被辐射扭曲的丛林，充满变异植物和奇异生物。',
    x: 400, y: 200,
    connections: ['supply_station', 'mutant_nest'],
    unlockCondition: { type: 'clear_node', value: 'old_factory' },
    staminaCost: 15,
    encounters: [
      { type: 'combat', id: 'mutant_vine', weight: 3 },
      { type: 'combat', id: 'toxic_spider', weight: 2 },
      { type: 'event', id: 'glowing_pool', weight: 2 },
      { type: 'lore', id: 'lore_forest_journal', weight: 1, oneTime: true },
      { type: 'recruit', id: 'yuki', weight: 1, oneTime: true },
    ],
    levelRange: [4, 7],
  },
  underground_tunnel: {
    id: 'underground_tunnel',
    name: '地下通道',
    icon: '🕳️',
    type: 'dungeon',
    desc: '连接城市各区域的地下隧道网络，黑暗而危险。',
    x: 50, y: 350,
    connections: ['camp', 'lab_ruins', 'military_base'],
    unlockCondition: { type: 'day', value: 3 },
    staminaCost: 12,
    encounters: [
      { type: 'combat', id: 'tunnel_crawler', weight: 3 },
      { type: 'combat', id: 'raider', weight: 2 },
      { type: 'event', id: 'collapsed_passage', weight: 2 },
      { type: 'puzzle', id: 'puzzle_circuit', weight: 1, oneTime: true },
      { type: 'lore', id: 'lore_tunnel_graffiti', weight: 1, oneTime: true },
    ],
    internalMap: { width: 4, height: 4, roomTypes: ['combat', 'event', 'puzzle', 'lore', 'empty'] },
    levelRange: [3, 6],
  },
  lab_ruins: {
    id: 'lab_ruins',
    name: '实验室废墟',
    icon: '🧪',
    type: 'dungeon',
    desc: '旧世界的研究设施，也许能找到灾变的真相。',
    x: 300, y: 350,
    connections: ['supply_station', 'underground_tunnel', 'mutant_nest'],
    unlockCondition: { type: 'clear_node', value: 'underground_tunnel' },
    staminaCost: 18,
    encounters: [
      { type: 'combat', id: 'mutant_subject', weight: 2 },
      { type: 'combat', id: 'security_drone', weight: 2 },
      { type: 'event', id: 'lab_terminal', weight: 2 },
      { type: 'puzzle', id: 'puzzle_password', weight: 1, oneTime: true },
      { type: 'lore', id: 'lore_lab_report', weight: 2, oneTime: true },
    ],
    internalMap: { width: 4, height: 4, roomTypes: ['combat', 'event', 'puzzle', 'lore', 'empty'] },
    levelRange: [5, 8],
  },
  mutant_nest: {
    id: 'mutant_nest',
    name: '变异巢穴',
    icon: '🦎',
    type: 'boss_lair',
    desc: '变异生物的巢穴，巢穴深处潜伏着恐怖的首领。',
    x: 500, y: 300,
    connections: ['radiation_forest', 'lab_ruins'],
    unlockCondition: { type: 'clear_node', value: 'radiation_forest' },
    staminaCost: 20,
    encounters: [
      { type: 'combat', id: 'mutant_alpha', weight: 2 },
      { type: 'combat', id: 'mutant_swarm', weight: 3 },
      { type: 'lore', id: 'lore_nest_origin', weight: 1, oneTime: true },
    ],
    internalMap: { width: 5, height: 5, roomTypes: ['combat', 'combat', 'lore', 'rest', 'empty'] },
    bossId: 'mutant_queen',
    bossWeaknessId: 'weakness_mutant_queen',
    levelRange: [7, 10],
  },
  military_base: {
    id: 'military_base',
    name: '军事基地',
    icon: '🏛️',
    type: 'dungeon',
    desc: '废弃的军事设施，装备精良但危险重重。',
    x: 100, y: 450,
    connections: ['underground_tunnel', 'ark_entrance'],
    unlockCondition: { type: 'clear_node', value: 'lab_ruins' },
    staminaCost: 18,
    encounters: [
      { type: 'combat', id: 'military_bot', weight: 3 },
      { type: 'combat', id: 'rogue_soldier', weight: 2 },
      { type: 'event', id: 'armory_cache', weight: 1 },
      { type: 'puzzle', id: 'puzzle_access_code', weight: 1, oneTime: true },
      { type: 'lore', id: 'lore_military_orders', weight: 1, oneTime: true },
    ],
    internalMap: { width: 5, height: 4, roomTypes: ['combat', 'event', 'puzzle', 'lore', 'empty'] },
    levelRange: [8, 12],
  },
  ark_entrance: {
    id: 'ark_entrance',
    name: '方舟入口',
    icon: '🚀',
    type: 'boss_lair',
    desc: '传说中的避难所入口，通向旧世界最后的秘密。',
    x: 300, y: 500,
    connections: ['military_base'],
    unlockCondition: { type: 'clear_node', value: 'military_base' },
    staminaCost: 25,
    encounters: [
      { type: 'combat', id: 'ark_guardian', weight: 2 },
      { type: 'combat', id: 'defense_system', weight: 2 },
      { type: 'puzzle', id: 'puzzle_ark_seal', weight: 1, oneTime: true },
      { type: 'lore', id: 'lore_ark_truth', weight: 1, oneTime: true },
    ],
    internalMap: { width: 5, height: 5, roomTypes: ['combat', 'puzzle', 'lore', 'rest', 'empty'] },
    bossId: 'ark_overseer',
    bossWeaknessId: 'weakness_ark_overseer',
    levelRange: [10, 15],
  },
};
