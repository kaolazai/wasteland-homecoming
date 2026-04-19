export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Cooldown in combat turns */
  cooldown: number;
  /** MP cost to use in combat (default: ceil(cooldown * 3)) */
  mpCost?: number;
  /** Skill point cost to unlock (0 = discovered only) */
  pointCost: number;
  /** Whether this skill is discovered during exploration (not buyable with points) */
  exploration: boolean;
}

export type SkillEffect =
  | { type: 'damage'; multiplier: number }
  | { type: 'heal'; amount: number }
  | { type: 'debuff'; effectName: string; turns: number }
  | { type: 'shield'; reduction: number }
  | { type: 'drain'; multiplier: number }
  | { type: 'execute'; hpThreshold: number }
  | { type: 'aoe'; multiplier: number }
  | { type: 'stun' };

export interface Skill extends SkillDef {
  effect: SkillEffect;
}

export const SKILLS: Record<string, Skill> = {
  // === Point-unlockable skills ===
  heavy_strike: {
    id: 'heavy_strike',
    name: '重击',
    icon: '🔨',
    desc: '集中力量的一击，造成2倍伤害。',
    cooldown: 3,
    pointCost: 1,
    exploration: false,
    effect: { type: 'damage', multiplier: 2 },
  },
  first_aid: {
    id: 'first_aid',
    name: '急救',
    icon: '🩹',
    desc: '紧急包扎伤口，恢复15点HP。',
    cooldown: 5,
    pointCost: 1,
    exploration: false,
    effect: { type: 'heal', amount: 15 },
  },
  war_cry: {
    id: 'war_cry',
    name: '战吼',
    icon: '📣',
    desc: '威吓敌人，使其攻击力降低3回合。',
    cooldown: 5,
    pointCost: 1,
    exploration: false,
    effect: { type: 'debuff', effectName: 'weaken', turns: 3 },
  },
  iron_wall: {
    id: 'iron_wall',
    name: '铁壁',
    icon: '🧱',
    desc: '进入防御姿态，下次受到的伤害减半。',
    cooldown: 4,
    pointCost: 2,
    exploration: false,
    effect: { type: 'shield', reduction: 0.5 },
  },
  double_slash: {
    id: 'double_slash',
    name: '连斩',
    icon: '⚔️',
    desc: '快速挥砍两次，各造成0.8倍伤害。',
    cooldown: 3,
    pointCost: 2,
    exploration: false,
    effect: { type: 'aoe', multiplier: 0.8 },
  },

  // === Exploration-discovered skills ===
  blood_drain: {
    id: 'blood_drain',
    name: '吸血斩',
    icon: '🩸',
    desc: '暗黑一击，造成1.5倍伤害并回复等量HP。',
    cooldown: 5,
    pointCost: 0,
    exploration: true,
    effect: { type: 'drain', multiplier: 1.5 },
  },
  execute: {
    id: 'execute',
    name: '处决',
    icon: '💀',
    desc: '对HP低于30%的敌人造成致命一击（5倍伤害）。',
    cooldown: 6,
    pointCost: 0,
    exploration: true,
    effect: { type: 'execute', hpThreshold: 0.3 },
  },
  stun_blow: {
    id: 'stun_blow',
    name: '震荡打击',
    icon: '💫',
    desc: '用力一击令敌人眩晕，跳过敌人下个回合。',
    cooldown: 6,
    pointCost: 0,
    exploration: true,
    effect: { type: 'stun' },
  },

  // === Job skills (unlocked via job system) ===
  // Scavenger
  scavenge: {
    id: 'scavenge', name: '搜刮', icon: '🔍',
    desc: '仔细搜索，恢复少量HP。', cooldown: 3, mpCost: 5, pointCost: 0, exploration: false,
    effect: { type: 'heal', amount: 8 },
  },
  improvise: {
    id: 'improvise', name: '临机应变', icon: '🔧',
    desc: '即兴武器攻击，造成1.5倍伤害。', cooldown: 3, mpCost: 8, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 1.5 },
  },
  lucky_find: {
    id: 'lucky_find', name: '幸运发现', icon: '🍀',
    desc: '恢复大量HP。', cooldown: 5, mpCost: 12, pointCost: 0, exploration: false,
    effect: { type: 'heal', amount: 20 },
  },
  // Fighter
  berserk: {
    id: 'berserk', name: '狂暴', icon: '🔥',
    desc: '进入狂暴状态，造成2.5倍伤害。', cooldown: 5, mpCost: 15, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 2.5 },
  },
  // Medic
  detox: {
    id: 'detox', name: '解毒', icon: '💧',
    desc: '净化毒素，恢复10HP。', cooldown: 4, mpCost: 8, pointCost: 0, exploration: false,
    effect: { type: 'heal', amount: 10 },
  },
  revive: {
    id: 'revive', name: '复苏术', icon: '✨',
    desc: '恢复大量HP。', cooldown: 6, mpCost: 18, pointCost: 0, exploration: false,
    effect: { type: 'heal', amount: 30 },
  },
  // Artificer
  craft_bomb: {
    id: 'craft_bomb', name: '炸弹', icon: '💣',
    desc: '投掷炸弹，造成2倍伤害。', cooldown: 4, mpCost: 10, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 2 },
  },
  reinforce: {
    id: 'reinforce', name: '强化', icon: '🛡️',
    desc: '强化护甲，下次伤害减半。', cooldown: 4, mpCost: 10, pointCost: 0, exploration: false,
    effect: { type: 'shield', reduction: 0.5 },
  },
  overclock: {
    id: 'overclock', name: '超频', icon: '⚡',
    desc: '超频装备，造成3倍伤害。', cooldown: 6, mpCost: 20, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 3 },
  },
  // Ranger
  snipe: {
    id: 'snipe', name: '狙击', icon: '🎯',
    desc: '精准射击，造成2倍伤害。', cooldown: 4, mpCost: 10, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 2 },
  },
  evasion: {
    id: 'evasion', name: '闪避', icon: '💨',
    desc: '闪避姿态，下次伤害减半。', cooldown: 3, mpCost: 8, pointCost: 0, exploration: false,
    effect: { type: 'shield', reduction: 0.5 },
  },
  // Mutant
  mutate: {
    id: 'mutate', name: '异变', icon: '🧬',
    desc: '释放变异之力，造成2倍伤害并回复HP。', cooldown: 5, mpCost: 14, pointCost: 0, exploration: false,
    effect: { type: 'drain', multiplier: 2 },
  },
  rampage: {
    id: 'rampage', name: '暴走', icon: '💢',
    desc: '狂暴连击，两连击各造成1.2倍伤害。', cooldown: 5, mpCost: 16, pointCost: 0, exploration: false,
    effect: { type: 'aoe', multiplier: 1.2 },
  },
  // Scholar
  analyze: {
    id: 'analyze', name: '分析', icon: '🔬',
    desc: '分析敌人弱点，削弱其攻击力3回合。', cooldown: 4, mpCost: 8, pointCost: 0, exploration: false,
    effect: { type: 'debuff', effectName: 'weaken', turns: 3 },
  },
  lore_insight: {
    id: 'lore_insight', name: '博识', icon: '📖',
    desc: '运用知识恢复25HP。', cooldown: 5, mpCost: 14, pointCost: 0, exploration: false,
    effect: { type: 'heal', amount: 25 },
  },
  exploit_weakness: {
    id: 'exploit_weakness', name: '弱点打击', icon: '🎯',
    desc: '利用分析结果，对HP低于40%的敌人造成致命打击。', cooldown: 6, mpCost: 18, pointCost: 0, exploration: false,
    effect: { type: 'execute', hpThreshold: 0.4 },
  },
  // Shadow
  backstab: {
    id: 'backstab', name: '背刺', icon: '🗡️',
    desc: '偷袭要害，造成2.5倍伤害。', cooldown: 4, mpCost: 12, pointCost: 0, exploration: false,
    effect: { type: 'damage', multiplier: 2.5 },
  },
  poison_blade: {
    id: 'poison_blade', name: '淬毒', icon: '☠️',
    desc: '毒刃攻击，造成1.5倍伤害并回复HP。', cooldown: 4, mpCost: 10, pointCost: 0, exploration: false,
    effect: { type: 'drain', multiplier: 1.5 },
  },
};

/** Skills unlockable with skill points (shown in camp skill page) */
export const POINT_SKILLS = Object.values(SKILLS).filter(s => !s.exploration && s.pointCost > 0).map(s => s.id);

/** Skills only found during exploration */
export const EXPLORATION_SKILLS = Object.values(SKILLS).filter(s => s.exploration).map(s => s.id);

/** Skills unlocked by job system (pointCost=0, not exploration) */
export const JOB_SKILLS = Object.values(SKILLS).filter(s => !s.exploration && s.pointCost === 0).map(s => s.id);
