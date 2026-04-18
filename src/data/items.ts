export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'key';

export type WeaponAffix = 'corrode' | 'vampiric' | 'precise' | 'sturdy';

export interface AffixDef {
  id: WeaponAffix;
  name: string;
  prefix: string;
  desc: string;
}

export const AFFIXES: Record<WeaponAffix, AffixDef> = {
  corrode:  { id: 'corrode',  name: '腐蚀', prefix: '腐蚀的', desc: '攻击附带2点毒伤（2回合）' },
  vampiric: { id: 'vampiric', name: '吸血', prefix: '嗜血的', desc: '击中回复10%伤害值的HP' },
  precise:  { id: 'precise',  name: '精准', prefix: '精准的', desc: '暴击率额外+10%' },
  sturdy:   { id: 'sturdy',   name: '坚韧', prefix: '坚韧的', desc: '装备时额外+2防御' },
};

export const AFFIX_LIST: WeaponAffix[] = ['corrode', 'vampiric', 'precise', 'sturdy'];

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  type: ItemType;
  desc: string;
  /** For weapon/armor */
  attack?: number;
  defense?: number;
  /** For consumable */
  hpRestore?: number;
  hungerRestore?: number;
  /** Sell price */
  price: number;
}

export const ITEMS: Record<string, ItemDef> = {
  // === Weapons ===
  rusty_pipe: { id: 'rusty_pipe', name: '生锈铁管', icon: '🔧', type: 'weapon', desc: '一根锈迹斑斑的铁管，聊胜于无。', attack: 2, price: 5 },
  kitchen_knife: { id: 'kitchen_knife', name: '厨刀', icon: '🔪', type: 'weapon', desc: '从废弃厨房找到的菜刀，还算锋利。', attack: 4, price: 12 },
  machete: { id: 'machete', name: '砍刀', icon: '🗡️', type: 'weapon', desc: '一把厚实的砍刀，适合近身搏斗。', attack: 6, price: 25 },
  fire_axe: { id: 'fire_axe', name: '消防斧', icon: '🪓', type: 'weapon', desc: '消防站的遗物，沉重而致命。', attack: 9, price: 40 },
  rebar_spear: { id: 'rebar_spear', name: '钢筋矛', icon: '🔱', type: 'weapon', desc: '用钢筋磨尖做成的长矛，攻击距离长。', attack: 7, price: 30 },
  nail_bat: { id: 'nail_bat', name: '钉头棒', icon: '🏏', type: 'weapon', desc: '木棒上钉满了钉子，简单暴力。', attack: 5, price: 18 },

  // === Armor ===
  torn_jacket: { id: 'torn_jacket', name: '破夹克', icon: '🧥', type: 'armor', desc: '勉强能挡点风，防御力约等于没有。', defense: 1, price: 5 },
  leather_vest: { id: 'leather_vest', name: '皮背心', icon: '🦺', type: 'armor', desc: '一件厚实的皮革背心，能挡住一些攻击。', defense: 3, price: 15 },
  riot_vest: { id: 'riot_vest', name: '防暴背心', icon: '🦺', type: 'armor', desc: '防暴警察的装备，防护性能不错。', defense: 5, price: 35 },
  metal_plate: { id: 'metal_plate', name: '金属胸甲', icon: '🛡️', type: 'armor', desc: '用废铁拼凑的胸甲，笨重但有效。', defense: 7, price: 50 },
  scrap_shield: { id: 'scrap_shield', name: '废铁盾', icon: '🛡️', type: 'armor', desc: '车门改造的盾牌，可以挡下重击。', defense: 4, price: 22 },

  // === Consumables ===
  bandage: { id: 'bandage', name: '绷带', icon: '🩹', type: 'consumable', desc: '简易绷带，可以包扎伤口。', hpRestore: 8, price: 5 },
  medkit: { id: 'medkit', name: '急救包', icon: '💊', type: 'consumable', desc: '医用急救包，还没过期。', hpRestore: 20, price: 15 },
  canned_food: { id: 'canned_food', name: '罐头', icon: '🥫', type: 'consumable', desc: '密封良好的罐头食品。', hungerRestore: 30, price: 8 },
  dried_meat: { id: 'dried_meat', name: '肉干', icon: '🥩', type: 'consumable', desc: '不知道是什么肉做的，但能填饱肚子。', hungerRestore: 20, price: 5 },
  clean_water: { id: 'clean_water', name: '净水', icon: '💧', type: 'consumable', desc: '过滤后的干净饮用水。', hungerRestore: 10, hpRestore: 3, price: 4 },
  energy_drink: { id: 'energy_drink', name: '能量饮料', icon: '🥤', type: 'consumable', desc: '末日前的功能饮料，还有效果。', hungerRestore: 15, hpRestore: 5, price: 10 },
  herb_potion: { id: 'herb_potion', name: '草药汁', icon: '🧪', type: 'consumable', desc: '用野生草药熬制的药汁，味道很苦。', hpRestore: 12, price: 8 },
  stale_bread: { id: 'stale_bread', name: '干面包', icon: '🍞', type: 'consumable', desc: '硬得能砸死人的面包，但还能吃。', hungerRestore: 15, price: 3 },
  mystery_pill: { id: 'mystery_pill', name: '不明药片', icon: '💊', type: 'consumable', desc: '瓶子上的标签模糊不清……', hpRestore: 15, hungerRestore: -10, price: 6 },

  // === Materials ===
  scrap_metal: { id: 'scrap_metal', name: '废铁', icon: '🔩', type: 'material', desc: '一些可回收的金属碎片。', price: 3 },
  circuit_board: { id: 'circuit_board', name: '电路板', icon: '💾', type: 'material', desc: '从电子设备上拆下的电路板。', price: 8 },
  cloth: { id: 'cloth', name: '布料', icon: '🧶', type: 'material', desc: '还算干净的布料，可以用来制作东西。', price: 2 },
  chemicals: { id: 'chemicals', name: '化学品', icon: '🧪', type: 'material', desc: '几瓶来路不明的化学试剂。', price: 10 },
  fuel_can: { id: 'fuel_can', name: '燃料罐', icon: '⛽', type: 'material', desc: '半罐汽油，非常珍贵的资源。', price: 15 },

  // === Demon Items ===
  demon_blade: { id: 'demon_blade', name: '暗杀匕首', icon: '🗡️', type: 'weapon', desc: '散发幽光的匕首，似乎在饮用持有者的生命。', attack: 12, price: 0 },
  demon_armor: { id: 'demon_armor', name: '防弹背心', icon: '🦺', type: 'armor', desc: '军用级防弹背心，代价是你的体力。', defense: 8, price: 0 },
  lifesteal_charm: { id: 'lifesteal_charm', name: '生命虹吸符', icon: '📿', type: 'key', desc: '击杀敌人时额外恢复10HP。', price: 0 },

  // === Special Tools ===
  signal_flare: { id: 'signal_flare', name: '信号弹', icon: '🚀', type: 'consumable', desc: '强力照明弹，使用后跳过当前层直达下一层。', price: 30 },
  detector: { id: 'detector', name: '探测器', icon: '📡', type: 'consumable', desc: '电子探测装置，使用后揭示当前层所有房间。', price: 35 },

  // === Revival ===
  revival_syringe: { id: 'revival_syringe', name: '肾上腺素针', icon: '💉', type: 'key', desc: '紧急复苏用的肾上腺素注射器，可以在濒死时将你拉回来。', price: 0 },

  // === Crafting Exclusives ===
  rad_suit: { id: 'rad_suit', name: '防辐射服', icon: '🥼', type: 'armor', desc: '用化学品处理过的防护服，能有效隔绝辐射伤害。', defense: 6, price: 0 },
  stim_shot: { id: 'stim_shot', name: '兴奋剂', icon: '💉', type: 'consumable', desc: '一针下去精神百倍！恢复HP和饱食。', hpRestore: 15, hungerRestore: 25, price: 0 },
  emp_grenade: { id: 'emp_grenade', name: 'EMP手雷', icon: '💣', type: 'consumable', desc: '电磁脉冲手雷，对机械敌人造成巨大伤害。使用后对当前敌人造成20点伤害。', price: 0 },
  hardened_blade: { id: 'hardened_blade', name: '淬火长刀', icon: '⚔️', type: 'weapon', desc: '用化学品淬火的长刀，锋利无比。', attack: 11, price: 0 },
  survival_kit: { id: 'survival_kit', name: '生存工具包', icon: '🧰', type: 'consumable', desc: '全能工具包，恢复大量HP和饱食度。', hpRestore: 25, hungerRestore: 40, price: 0 },

  // === Keys ===
  rusty_key: { id: 'rusty_key', name: '生锈钥匙', icon: '🔑', type: 'key', desc: '不知道能打开什么门的钥匙。', price: 0 },
  keycard: { id: 'keycard', name: '门禁卡', icon: '💳', type: 'key', desc: '某个设施的电子门禁卡，还有电。', price: 0 },
};

/** Loot tables by rarity tier */
export const LOOT_TABLES = {
  common: ['stale_bread', 'dried_meat', 'clean_water', 'bandage', 'scrap_metal', 'cloth'],
  uncommon: ['canned_food', 'herb_potion', 'energy_drink', 'rusty_pipe', 'torn_jacket', 'circuit_board', 'nail_bat'],
  rare: ['medkit', 'kitchen_knife', 'leather_vest', 'chemicals', 'fuel_can', 'scrap_shield', 'machete'],
  epic: ['riot_vest', 'fire_axe', 'rebar_spear', 'metal_plate', 'revival_syringe'],
};

export function rollLoot(floor: number): string {
  const r = Math.random();
  const floorBonus = Math.min(floor * 0.03, 0.15);
  if (r < 0.05 + floorBonus) return pick(LOOT_TABLES.epic);
  if (r < 0.2 + floorBonus) return pick(LOOT_TABLES.rare);
  if (r < 0.5) return pick(LOOT_TABLES.uncommon);
  return pick(LOOT_TABLES.common);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Roll a random affix for weapon/armor (20% chance on floor 5+, 35% on floor 10+) */
export function rollAffix(floor: number, itemType: ItemType): WeaponAffix | undefined {
  if (itemType !== 'weapon' && itemType !== 'armor') return undefined;
  const chance = floor >= 10 ? 0.35 : floor >= 5 ? 0.2 : 0;
  if (Math.random() >= chance) return undefined;
  return pick(AFFIX_LIST);
}
