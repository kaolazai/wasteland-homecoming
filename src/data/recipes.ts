export interface Recipe {
  id: string;
  name: string;
  desc: string;
  /** Required materials: [itemId, count][] */
  materials: [string, number][];
  /** Output item id */
  output: string;
  /** Output count */
  outputCount: number;
  /** Minimum workbench level required */
  minLevel: number;
}

export const RECIPES: Record<string, Recipe> = {
  craft_medkit: {
    id: 'craft_medkit',
    name: '合成急救包',
    desc: '用绷带缝合成更好用的急救包。',
    materials: [['bandage', 3]],
    output: 'medkit',
    outputCount: 1,
    minLevel: 1,
  },
  craft_rebar_spear: {
    id: 'craft_rebar_spear',
    name: '锻造钢筋矛',
    desc: '把废铁打磨成一根长矛。',
    materials: [['scrap_metal', 3]],
    output: 'rebar_spear',
    outputCount: 1,
    minLevel: 1,
  },
  craft_leather_vest: {
    id: 'craft_leather_vest',
    name: '缝制皮背心',
    desc: '用布料和废铁加固一件背心。',
    materials: [['cloth', 2], ['scrap_metal', 1]],
    output: 'leather_vest',
    outputCount: 1,
    minLevel: 1,
  },
  craft_energy_drink: {
    id: 'craft_energy_drink',
    name: '调配能量饮料',
    desc: '用化学品合成提神饮料。',
    materials: [['chemicals', 2]],
    output: 'energy_drink',
    outputCount: 2,
    minLevel: 1,
  },
  craft_metal_plate: {
    id: 'craft_metal_plate',
    name: '锻造金属胸甲',
    desc: '需要大量废铁和化学品来硬化金属。',
    materials: [['scrap_metal', 5], ['chemicals', 2]],
    output: 'metal_plate',
    outputCount: 1,
    minLevel: 2,
  },
  craft_signal_flare: {
    id: 'craft_signal_flare',
    name: '组装信号弹',
    desc: '强力照明弹，可以照亮通往下层的路。',
    materials: [['fuel_can', 2], ['circuit_board', 1]],
    output: 'signal_flare',
    outputCount: 1,
    minLevel: 2,
  },
  craft_detector: {
    id: 'craft_detector',
    name: '组装探测器',
    desc: '电子探测装置，可以扫描附近区域。',
    materials: [['circuit_board', 3], ['chemicals', 1]],
    output: 'detector',
    outputCount: 1,
    minLevel: 3,
  },
  craft_nail_bat: {
    id: 'craft_nail_bat',
    name: '制作钉头棒',
    desc: '简单粗暴的近战武器。',
    materials: [['scrap_metal', 2], ['cloth', 1]],
    output: 'nail_bat',
    outputCount: 1,
    minLevel: 1,
  },
  // === Crafting Exclusives ===
  craft_rad_suit: {
    id: 'craft_rad_suit',
    name: '缝制防辐射服',
    desc: '用化学品处理布料制成防护服，只能通过制作获得。',
    materials: [['cloth', 3], ['chemicals', 3]],
    output: 'rad_suit',
    outputCount: 1,
    minLevel: 2,
  },
  craft_stim_shot: {
    id: 'craft_stim_shot',
    name: '调配兴奋剂',
    desc: '用化学品合成强力兴奋剂，效果远超普通药品。',
    materials: [['chemicals', 2], ['clean_water', 1]],
    output: 'stim_shot',
    outputCount: 2,
    minLevel: 2,
  },
  craft_emp_grenade: {
    id: 'craft_emp_grenade',
    name: '组装EMP手雷',
    desc: '电磁脉冲手雷，对机甲类敌人的终极武器。',
    materials: [['circuit_board', 2], ['fuel_can', 1], ['chemicals', 1]],
    output: 'emp_grenade',
    outputCount: 1,
    minLevel: 3,
  },
  craft_hardened_blade: {
    id: 'craft_hardened_blade',
    name: '锻造淬火长刀',
    desc: '将废铁反复锻打淬火，打造出的精良武器。只能通过制作获得。',
    materials: [['scrap_metal', 5], ['fuel_can', 2], ['chemicals', 1]],
    output: 'hardened_blade',
    outputCount: 1,
    minLevel: 3,
  },
  craft_survival_kit: {
    id: 'craft_survival_kit',
    name: '组装生存工具包',
    desc: '集合多种物资的全能工具包。',
    materials: [['bandage', 2], ['canned_food', 1], ['cloth', 1]],
    output: 'survival_kit',
    outputCount: 1,
    minLevel: 1,
  },
};

/** Recipes that are always known from the start */
export const STARTER_RECIPES = ['craft_medkit', 'craft_nail_bat', 'craft_energy_drink', 'craft_survival_kit'];

/** Recipes discovered during exploration */
export const DISCOVERABLE_RECIPES = [
  'craft_rebar_spear', 'craft_leather_vest', 'craft_metal_plate',
  'craft_signal_flare', 'craft_detector',
  'craft_rad_suit', 'craft_stim_shot', 'craft_emp_grenade', 'craft_hardened_blade',
];
