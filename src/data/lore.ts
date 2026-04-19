export type LoreCategory = 'history' | 'science' | 'personal' | 'military' | 'clue';

export interface LoreFragment {
  id: string;
  title: string;
  content: string;
  category: LoreCategory;
  sourceNodes: string[];
}

export interface PuzzleDef {
  id: string;
  name: string;
  nodeId: string;
  desc: string;
  requiredLoreIds: string[];
  rewards: {
    items?: Array<{ id: string; count: number }>;
    unlockNodes?: string[];
    revealWeakness?: string;
    gold?: number;
    exp?: number;
  };
}

export interface BossWeakness {
  id: string;
  bossId: string;
  name: string;
  effectType: 'element' | 'item' | 'strategy' | 'skill';
  effectValue: string;
  damageMultiplier: number;
  hintLoreIds: string[];
}

// Lore fragments — skeleton, to be filled in Phase 10
export const LORE_FRAGMENTS: Record<string, LoreFragment> = {
  lore_survivor_note_1: {
    id: 'lore_survivor_note_1',
    title: '幸存者笔记：第一天',
    content: '天塌了。不是比喻，是真的塌了。辐射把一切都变了样。城市变成了废墟，人变成了怪物。我躲在这个地下室已经三天了，食物和水都快用完了。外面传来低沉的咆哮声——那已经不是我认识的邻居了。',
    category: 'personal',
    sourceNodes: ['ruins_entrance'],
  },
  lore_factory_log: {
    id: 'lore_factory_log',
    title: '工厂日志',
    content: '第147天。生产线上的工人们开始出现异常症状：皮肤变色、指甲脱落、眼球充血。管理层要求封锁消息，继续生产。我注意到废料处理系统的过滤器坏了已经两周了——那些化学废料直接渗入了地下水。电路编号: F-7-K-3，也许将来有人需要这个。',
    category: 'science',
    sourceNodes: ['old_factory'],
  },
  lore_station_bulletin: {
    id: 'lore_station_bulletin',
    title: '补给站公告',
    content: '近日森林方向频繁出现异常辐射波动，请各位探索者注意安全……',
    category: 'history',
    sourceNodes: ['supply_station'],
  },
  lore_forest_journal: {
    id: 'lore_forest_journal',
    title: '探险家日志',
    content: '树木在以肉眼可见的速度生长，有些甚至会移动。森林深处有一种巨大的存在……',
    category: 'clue',
    sourceNodes: ['radiation_forest'],
  },
  lore_tunnel_graffiti: {
    id: 'lore_tunnel_graffiti',
    title: '隧道涂鸦',
    content: '「不要去实验室。不要去实验室。不要去实验室。」——用血写的字。',
    category: 'personal',
    sourceNodes: ['underground_tunnel'],
  },
  lore_lab_report: {
    id: 'lore_lab_report',
    title: '实验报告-γ',
    content: '项目代号"方舟"。研究发现变异体对高频声波极度敏感，尤其是450-600Hz范围。女王级个体的神经节暴露在后颈位置，EMP脉冲可以造成共振瘫痪。建议使用改装后的电磁脉冲手雷进行定点打击。——首席研究员 周明',
    category: 'science',
    sourceNodes: ['lab_ruins'],
  },
  lore_nest_origin: {
    id: 'lore_nest_origin',
    title: '巢穴起源',
    content: '这里曾是实验室的废料倾倒场。最初的变异就是从这里开始的……',
    category: 'science',
    sourceNodes: ['mutant_nest'],
  },
  lore_military_orders: {
    id: 'lore_military_orders',
    title: '军令-绝密',
    content: '绝密-仅限指挥官。方舟监督者是一台自律型AI战斗平台，其核心依赖旧世界的能源模块运行。能源模块无法承受超频负载。若能使用工匠的"超频"技术干扰其能源回路，可使其陷入过载崩溃。授权码: OMEGA-7。',
    category: 'military',
    sourceNodes: ['military_base'],
  },
  lore_ark_truth: {
    id: 'lore_ark_truth',
    title: '方舟的真相',
    content: '方舟不是避难所——它是一个巨大的人体实验场。所有"幸存者"都是被筛选的实验对象。灾难不是意外，而是人为制造的。方舟的AI监督者"欧米茄"负责管理实验，但在失去人类控制后，它开始执行自己的进化计划。真相必须被揭露。',
    category: 'history',
    sourceNodes: ['ark_entrance'],
  },
};

export const PUZZLES: Record<string, PuzzleDef> = {
  puzzle_circuit: {
    id: 'puzzle_circuit',
    name: '电路修复',
    nodeId: 'underground_tunnel',
    desc: '一扇被电子锁封住的门，需要正确的接线知识。',
    requiredLoreIds: ['lore_factory_log'],
    rewards: { items: [{ id: 'emp_grenade', count: 2 }], gold: 50 },
  },
  puzzle_password: {
    id: 'puzzle_password',
    name: '终端密码',
    nodeId: 'lab_ruins',
    desc: '实验室终端要求输入密码，也许某处记录了线索。',
    requiredLoreIds: ['lore_lab_report', 'lore_tunnel_graffiti'],
    rewards: { revealWeakness: 'weakness_mutant_queen', gold: 100 },
  },
  puzzle_access_code: {
    id: 'puzzle_access_code',
    name: '军事授权码',
    nodeId: 'military_base',
    desc: '需要军事授权码才能打开武器库。',
    requiredLoreIds: ['lore_military_orders'],
    rewards: { items: [{ id: 'military_rifle', count: 1 }], unlockNodes: ['ark_entrance'] },
  },
  puzzle_ark_seal: {
    id: 'puzzle_ark_seal',
    name: '方舟封印',
    nodeId: 'ark_entrance',
    desc: '方舟的最终封印，需要理解整个事件的真相。',
    requiredLoreIds: ['lore_ark_truth', 'lore_lab_report', 'lore_military_orders'],
    rewards: { revealWeakness: 'weakness_ark_overseer', exp: 200 },
  },
};

export const BOSS_WEAKNESSES: Record<string, BossWeakness> = {
  weakness_mutant_queen: {
    id: 'weakness_mutant_queen',
    bossId: 'mutant_queen',
    name: '高频共振',
    effectType: 'item',
    effectValue: 'emp_grenade',
    damageMultiplier: 2.0,
    hintLoreIds: ['lore_lab_report', 'lore_forest_journal'],
  },
  weakness_ark_overseer: {
    id: 'weakness_ark_overseer',
    bossId: 'ark_overseer',
    name: '能源模块过载',
    effectType: 'skill',
    effectValue: 'overclock',
    damageMultiplier: 2.0,
    hintLoreIds: ['lore_military_orders', 'lore_ark_truth'],
  },
};
