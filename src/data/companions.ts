export interface CompanionDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  personality: string;
  defaultJobId: string;
  availableJobs: string[];
  baseStats: {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  recruitCondition: {
    type: 'node_event' | 'quest_reward' | 'karma_threshold' | 'day_threshold';
    value: string | number;
  };
  uniqueSkillId?: string;
}

export const COMPANIONS: Record<string, CompanionDef> = {
  kai: {
    id: 'kai',
    name: '凯',
    icon: '🧔',
    desc: '沉默寡言的前军人，擅长近身搏斗。',
    personality: '沉稳',
    defaultJobId: 'fighter',
    availableJobs: ['fighter', 'ranger', 'shadow'],
    baseStats: { hp: 35, mp: 15, attack: 7, defense: 4, speed: 8 },
    recruitCondition: { type: 'node_event', value: 'ruins_entrance' },
  },
  lin: {
    id: 'lin',
    name: '琳',
    icon: '👩‍⚕️',
    desc: '流浪医生，温柔但意志坚定。',
    personality: '善良',
    defaultJobId: 'medic',
    availableJobs: ['medic', 'scholar', 'artificer'],
    baseStats: { hp: 22, mp: 30, attack: 3, defense: 2, speed: 9 },
    recruitCondition: { type: 'node_event', value: 'supply_station' },
  },
  rook: {
    id: 'rook',
    name: '洛克',
    icon: '🤖',
    desc: '改造人，半身机械，对科技遗物有特殊理解。',
    personality: '理性',
    defaultJobId: 'artificer',
    availableJobs: ['artificer', 'fighter', 'scholar'],
    baseStats: { hp: 28, mp: 20, attack: 5, defense: 5, speed: 7 },
    recruitCondition: { type: 'node_event', value: 'old_factory' },
  },
  yuki: {
    id: 'yuki',
    name: '雪',
    icon: '🧝‍♀️',
    desc: '来历不明的少女，似乎与变异生物有奇特的联系。',
    personality: '神秘',
    defaultJobId: 'mutant',
    availableJobs: ['mutant', 'medic', 'shadow'],
    baseStats: { hp: 20, mp: 25, attack: 6, defense: 1, speed: 12 },
    recruitCondition: { type: 'node_event', value: 'radiation_forest' },
  },
  old_chen: {
    id: 'old_chen',
    name: '老陈',
    icon: '👴',
    desc: '退休的大学教授，对旧世界的知识无人能及。',
    personality: '博学',
    defaultJobId: 'scholar',
    availableJobs: ['scholar', 'medic'],
    baseStats: { hp: 18, mp: 35, attack: 2, defense: 1, speed: 6 },
    recruitCondition: { type: 'day_threshold', value: 5 },
  },
  wolf: {
    id: 'wolf',
    name: '狼',
    icon: '🐺',
    desc: '一匹被驯化的变异狼，忠诚而凶猛。',
    personality: '野性',
    defaultJobId: 'ranger',
    availableJobs: ['ranger', 'mutant'],
    baseStats: { hp: 25, mp: 10, attack: 8, defense: 2, speed: 14 },
    recruitCondition: { type: 'karma_threshold', value: -20 },
  },
};
