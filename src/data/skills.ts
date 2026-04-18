export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Cooldown in combat turns */
  cooldown: number;
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
};

/** Skills unlockable with skill points (shown in camp skill page) */
export const POINT_SKILLS = Object.values(SKILLS).filter(s => !s.exploration).map(s => s.id);

/** Skills only found during exploration */
export const EXPLORATION_SKILLS = Object.values(SKILLS).filter(s => s.exploration).map(s => s.id);
