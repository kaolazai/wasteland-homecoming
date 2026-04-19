/** Enemy definitions — split from events.ts for the new system */

export interface EnemyAbility {
  name: string;
  chance: number;
  damage?: number;
  heal?: number;
  effect?: string;
  desc: string;
}

export interface EnemyData {
  id: string;
  name: string;
  icon: string;
  desc: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: boolean;
  abilities: EnemyAbility[];
  loot: Array<{ itemId: string; chance: number; count?: number }>;
  exp: number;
  gold: [number, number];
  /** Level range this enemy appears at */
  levelRange: [number, number];
  /** Boss weakness ID if applicable */
  weaknessId?: string;
}

// Skeleton — will be filled from events.ts data + new enemies in Phase 3/5
export const ENEMY_DATA: Record<string, EnemyData> = {
  mutant_rat: {
    id: 'mutant_rat',
    name: '变异鼠',
    icon: '🐀',
    desc: '一只体型异常庞大的老鼠，眼睛闪着诡异的光。',
    hp: 12, attack: 4, defense: 1, speed: 8,
    isBoss: false,
    abilities: [],
    loot: [{ itemId: 'scrap_metal', chance: 0.3 }],
    exp: 5,
    gold: [2, 5],
    levelRange: [1, 3],
  },
  scavenger_thug: {
    id: 'scavenger_thug',
    name: '拾荒暴徒',
    icon: '🧟',
    desc: '被绝望逼疯的拾荒者，见人就抢。',
    hp: 18, attack: 6, defense: 2, speed: 7,
    isBoss: false,
    abilities: [{ name: '猛击', chance: 0.3, damage: 8, desc: '用力挥打' }],
    loot: [{ itemId: 'bandage', chance: 0.4 }, { itemId: 'rusty_pipe', chance: 0.2 }],
    exp: 8,
    gold: [3, 8],
    levelRange: [1, 4],
  },
  feral_dog: {
    id: 'feral_dog',
    name: '野化犬',
    icon: '🐕',
    desc: '曾经的宠物犬，如今凶残无比。',
    hp: 15, attack: 7, defense: 1, speed: 12,
    isBoss: false,
    abilities: [{ name: '撕咬', chance: 0.4, damage: 9, desc: '猛烈撕咬' }],
    loot: [{ itemId: 'raw_meat', chance: 0.5 }],
    exp: 7,
    gold: [1, 4],
    levelRange: [2, 5],
  },
  mutant_queen: {
    id: 'mutant_queen',
    name: '变异女王',
    icon: '👑',
    desc: '巢穴的统治者，巨大而恐怖的变异体。',
    hp: 200, attack: 18, defense: 8, speed: 6,
    isBoss: true,
    abilities: [
      { name: '召唤虫群', chance: 0.3, desc: '召唤小型变异体助战' },
      { name: '酸液喷射', chance: 0.3, damage: 25, effect: 'poison', desc: '喷射腐蚀性酸液' },
      { name: '尾击', chance: 0.4, damage: 20, desc: '巨尾横扫' },
    ],
    loot: [{ itemId: 'queen_crystal', chance: 1.0 }],
    exp: 100,
    gold: [50, 100],
    levelRange: [8, 10],
    weaknessId: 'weakness_mutant_queen',
  },
  ark_overseer: {
    id: 'ark_overseer',
    name: '方舟监督者',
    icon: '🤖',
    desc: '守护方舟的AI核心，集成了旧世界最先进的武器系统。',
    hp: 300, attack: 22, defense: 12, speed: 10,
    isBoss: true,
    abilities: [
      { name: '激光扫射', chance: 0.3, damage: 30, desc: '高能激光扫射全体' },
      { name: '护盾充能', chance: 0.2, heal: 30, desc: '修复受损部件' },
      { name: '导弹齐射', chance: 0.3, damage: 35, desc: '发射制导导弹' },
      { name: '系统过载', chance: 0.2, damage: 40, effect: 'stun', desc: '释放电磁脉冲' },
    ],
    loot: [{ itemId: 'ark_core', chance: 1.0 }],
    exp: 200,
    gold: [100, 200],
    levelRange: [12, 15],
    weaknessId: 'weakness_ark_overseer',
  },
};
