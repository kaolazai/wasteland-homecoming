export interface JobGrowth {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface SkillUnlock {
  jobLevel: number;
  skillId: string;
}

export interface JobDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  spCost: number;
  prerequisiteJobs: Array<{ jobId: string; level: number }>;
  growth: JobGrowth;
  skillUnlocks: SkillUnlock[];
  passives?: string[];
}

export const JOBS: Record<string, JobDef> = {
  scavenger: {
    id: 'scavenger',
    name: '拾荒者',
    icon: '🔧',
    desc: '废土上最常见的职业，擅长搜刮物资和临时应变。',
    spCost: 0,
    prerequisiteJobs: [],
    growth: { hp: 3, mp: 1, attack: 1, defense: 1, speed: 1 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'scavenge' },
      { jobLevel: 3, skillId: 'improvise' },
      { jobLevel: 5, skillId: 'lucky_find' },
    ],
  },
  fighter: {
    id: 'fighter',
    name: '战士',
    icon: '⚔️',
    desc: '以力量和耐力见长的近战好手。',
    spCost: 3,
    prerequisiteJobs: [],
    growth: { hp: 5, mp: 0, attack: 2, defense: 2, speed: 0 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'heavy_strike' },
      { jobLevel: 3, skillId: 'iron_wall' },
      { jobLevel: 5, skillId: 'berserk' },
    ],
  },
  medic: {
    id: 'medic',
    name: '医师',
    icon: '💊',
    desc: '精通草药和急救术，队伍中不可或缺的支援角色。',
    spCost: 3,
    prerequisiteJobs: [],
    growth: { hp: 2, mp: 3, attack: 0, defense: 1, speed: 1 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'first_aid' },
      { jobLevel: 3, skillId: 'detox' },
      { jobLevel: 5, skillId: 'revive' },
    ],
  },
  artificer: {
    id: 'artificer',
    name: '工匠',
    icon: '🔩',
    desc: '擅长制作和改造装备，战斗中使用特殊道具。',
    spCost: 3,
    prerequisiteJobs: [{ jobId: 'scavenger', level: 3 }],
    growth: { hp: 2, mp: 2, attack: 1, defense: 1, speed: 1 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'craft_bomb' },
      { jobLevel: 3, skillId: 'reinforce' },
      { jobLevel: 5, skillId: 'overclock' },
    ],
  },
  ranger: {
    id: 'ranger',
    name: '游侠',
    icon: '🏹',
    desc: '行动敏捷，擅长侦察和先手攻击。',
    spCost: 3,
    prerequisiteJobs: [],
    growth: { hp: 2, mp: 1, attack: 2, defense: 0, speed: 3 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'double_slash' },
      { jobLevel: 3, skillId: 'snipe' },
      { jobLevel: 5, skillId: 'evasion' },
    ],
  },
  mutant: {
    id: 'mutant',
    name: '异变者',
    icon: '🧬',
    desc: '拥抱变异之力，代价是身心的扭曲。',
    spCost: 5,
    prerequisiteJobs: [{ jobId: 'fighter', level: 3 }],
    growth: { hp: 4, mp: 1, attack: 3, defense: 0, speed: 1 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'blood_drain' },
      { jobLevel: 3, skillId: 'mutate' },
      { jobLevel: 5, skillId: 'rampage' },
    ],
  },
  scholar: {
    id: 'scholar',
    name: '学者',
    icon: '📖',
    desc: '博学多识，擅长发现线索和弱点，MP丰富。',
    spCost: 3,
    prerequisiteJobs: [],
    growth: { hp: 1, mp: 4, attack: 0, defense: 0, speed: 2 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'analyze' },
      { jobLevel: 3, skillId: 'lore_insight' },
      { jobLevel: 5, skillId: 'exploit_weakness' },
    ],
  },
  shadow: {
    id: 'shadow',
    name: '暗影',
    icon: '🗡️',
    desc: '潜行暗杀专家，擅长致命一击和状态削弱。',
    spCost: 5,
    prerequisiteJobs: [{ jobId: 'ranger', level: 3 }],
    growth: { hp: 2, mp: 2, attack: 3, defense: 0, speed: 2 },
    skillUnlocks: [
      { jobLevel: 1, skillId: 'backstab' },
      { jobLevel: 3, skillId: 'poison_blade' },
      { jobLevel: 5, skillId: 'execute' },
    ],
  },
};
