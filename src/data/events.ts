import type { MutationType } from '../core/state';

export interface GameEvent {
  id: string;
  text: string;
  choices: Choice[];
  minFloor?: number;
  weight?: number;
}

export interface Choice {
  text: string;
  outcome: Outcome;
}

export interface Outcome {
  text: string;
  hp?: number;
  hunger?: number;
  gold?: number;
  item?: string;
  combat?: string;
  mutation?: MutationType;
  /** Delayed effect triggers N floors later */
  delayed?: { floorsLater: number; text: string; hp?: number; hunger?: number; gold?: number; mutation?: MutationType };
}

// ===================== EXPLORE EVENTS =====================

export const EXPLORE_EVENTS: GameEvent[] = [
  {
    id: 'abandoned_room',
    text: '你推开一扇生锈的铁门，里面是一间废弃的储物室。架子上散落着一些东西。',
    choices: [
      { text: '🔍 仔细搜索', outcome: { text: '你在角落找到了一些有用的物资。', gold: 8, hunger: -5 } },
      { text: '⚡ 快速翻找', outcome: { text: '你匆匆翻了翻，找到一点碎银。', gold: 3 } },
      { text: '🚪 离开', outcome: { text: '你觉得这里不安全，转身离开了。' } },
    ],
  },
  {
    id: 'strange_sound',
    text: '走廊尽头传来奇怪的声响，像是什么东西在低声呜咽。',
    choices: [
      { text: '🗡️ 拔刀靠近', outcome: { text: '一只变异鼠从暗处扑来！', combat: 'mutant_rat' } },
      { text: '🪨 扔石头试探', outcome: { text: '声音消失了。地上留下几枚硬币。', gold: 5 } },
      { text: '🔙 原路返回', outcome: { text: '你悄悄退回，没有冒险。', hunger: -3 } },
    ],
  },
  {
    id: 'old_vending',
    text: '一台锈迹斑斑的自动售货机靠在墙边，玻璃碎了一半，里面还有些东西。',
    choices: [
      { text: '🤛 砸开它', outcome: { text: '你用力砸开了机器，找到一罐未过期的食物！', hunger: 25, gold: 2 } },
      { text: '🪙 投币试试', outcome: { text: '你投入几枚硬币……居然吐出了一瓶干净的水！', hp: 5, gold: -3 } },
      { text: '👀 看看就好', outcome: { text: '算了，这破机器可能有陷阱。' } },
    ],
  },
  {
    id: 'survivor',
    text: '一个衣衫褴褛的幸存者蹲在角落，看到你后露出警惕的眼神。',
    choices: [
      { text: '🤝 友好交谈', outcome: { text: '"谢谢你没有攻击我……"他给了你一些物资作为谢礼。', gold: 12, hunger: 10 } },
      { text: '🔪 威胁搜身', outcome: { text: '他挣扎着跑掉了，地上掉落了一些东西。', gold: 6 } },
      { text: '🚶 无视走开', outcome: { text: '你没有理会他，继续前进。' } },
    ],
  },
  {
    id: 'trap_floor',
    text: '你踩到了一块松动的地砖，听到"咔嗒"一声。',
    choices: [
      { text: '⚡ 立刻跳开', outcome: { text: '你反应够快，只是被碎片擦伤。', hp: -3 } },
      { text: '🧍 原地不动', outcome: { text: '什么也没发生……虚惊一场。' } },
      { text: '🔧 尝试拆解陷阱', outcome: { text: '你小心翼翼地拆下了陷阱零件，也许能卖点钱。', gold: 10, hp: -2 } },
    ],
  },
  {
    id: 'water_source',
    text: '你发现一处渗水的管道，水看起来还算干净。',
    choices: [
      { text: '💧 喝几口', outcome: { text: '清凉的水滑过喉咙，你感觉好多了。', hp: 5, hunger: 8 } },
      { text: '🫙 收集起来', outcome: { text: '你用容器存了些水。', item: 'clean_water' } },
      { text: '🚫 不敢喝', outcome: { text: '谁知道这水有没有被污染，还是算了。' } },
    ],
  },
  {
    id: 'locked_safe',
    text: '墙壁后面有一个半开的保险箱，密码锁已经被破坏了一半。',
    choices: [
      { text: '💪 硬撬开', outcome: { text: '费了好大力气，终于撬开了！里面有不少好东西。', gold: 20, hunger: -10 } },
      { text: '🔢 试试常见密码', outcome: { text: '你输入了"0000"……居然开了。', gold: 15 } },
      { text: '❌ 放弃', outcome: { text: '你没有合适的工具，只能作罢。' } },
    ],
  },
  {
    id: 'monster_lair',
    text: '空气中弥漫着腐臭的味道，这里似乎是某种生物的巢穴。',
    choices: [
      { text: '🗡️ 闯进去', outcome: { text: '一只废土野犬向你龇牙咆哮！', combat: 'wasteland_dog' } },
      { text: '🔥 用火驱赶', outcome: { text: '你点燃垃圾扔进去，生物逃跑了。巢穴里有些残骸。', gold: 8, hunger: -5 } },
      { text: '🔙 绕道走', outcome: { text: '你明智地选择了另一条路。', hunger: -5 } },
    ],
  },
  {
    id: 'wounded_animal',
    text: '一只受伤的野猫蜷缩在纸箱里，用恐惧的眼睛看着你。',
    choices: [
      { text: '💊 治疗它', outcome: { text: '你包扎了它的伤口。你心情好了一些。', hp: 3, hunger: -5 } },
      { text: '🍖 ……', outcome: { text: '你做了一个艰难的决定。至少不会挨饿了。', hunger: 30 } },
      { text: '🚶 走开', outcome: { text: '你叹了口气，继续赶路。' } },
    ],
  },
  {
    id: 'graffiti_wall',
    text: '墙上有人用喷漆写了些字："3F东侧有补给站"、"别相信穿白大褂的"。',
    choices: [
      { text: '📝 记住信息', outcome: { text: '你把这些信息记在了心里。', gold: 2 } },
      { text: '🔍 检查墙壁', outcome: { text: '你在涂鸦背后发现了一个小暗格！', gold: 8, item: 'bandage' } },
    ],
  },
  {
    id: 'collapsed_floor',
    text: '前方的地板塌陷了一半，下面黑漆漆的。对面似乎有东西在发光。',
    choices: [
      { text: '🏃 跳过去', outcome: { text: '你深吸一口气，奋力一跃——安全着陆！', gold: 15 } },
      { text: '🪢 沿边缘攀过去', outcome: { text: '你小心地攀过去，拿到了战利品。', gold: 12, hunger: -8 } },
      { text: '🛑 太危险了', outcome: { text: '你放弃了那堆发光的东西。' } },
    ],
    weight: 8,
  },
  {
    id: 'ambush',
    text: '你拐过一个弯，突然被人从背后扼住——"别动，把值钱的东西交出来！"',
    choices: [
      { text: '🗡️ 反击', outcome: { text: '你肘击对方腹部，扭打在一起！', combat: 'bandit' } },
      { text: '💰 交出财物', outcome: { text: '你交出了一些钱财，对方推开你跑掉了。', gold: -15 } },
      { text: '🗣️ 大喊求救', outcome: { text: '你的喊声吓跑了对方。' } },
    ],
    minFloor: 2,
  },
  {
    id: 'mysterious_door',
    text: '一扇看起来格格不入的干净铁门。上面写着"实验室 B-07"。',
    choices: [
      { text: '🚪 推门进去', outcome: { text: '里面是一个荒废的实验室，桌上有一些化学品。', item: 'chemicals', hp: -2 } },
      { text: '👂 贴门倾听', outcome: { text: '里面传来嗡嗡的机械声，可能还有电。你记下了位置。', gold: 5 } },
      { text: '🔙 不碰为妙', outcome: { text: '直觉告诉你离这儿远点。' } },
    ],
    minFloor: 2,
  },
  {
    id: 'old_library',
    text: '一间小型图书室，大部分书籍已经腐烂，但有几本保存完好的。',
    choices: [
      { text: '📖 翻阅书籍', outcome: { text: '你从一本日记中获得了关于这栋建筑的有用信息。', gold: 5 } },
      { text: '🔍 搜索暗格', outcome: { text: '书架后面有一个小隔间，里面有些物资！', item: 'medkit' } },
      { text: '📚 搬走能卖的书', outcome: { text: '你带走了几本品相较好的书，也许能换点钱。', gold: 10, hunger: -5 } },
    ],
  },
  {
    id: 'elevator_shaft',
    text: '一个废弃的电梯井，电梯卡在上面几层。井壁上有生锈的梯子。',
    choices: [
      { text: '🧗 向上爬', outcome: { text: '你爬了几层，发现了一个隐藏的维修通道，里面有不少好东西！', gold: 18, hp: -3, hunger: -8 } },
      { text: '🔦 往下看看', outcome: { text: '底部积水中泡着一些东西，你用长杆勾上来一个防水袋。', item: 'energy_drink' } },
      { text: '❌ 太危险', outcome: { text: '铁锈和黑暗让你打消了冒险的念头。' } },
    ],
    minFloor: 2,
    weight: 7,
  },
  {
    id: 'children_drawings',
    text: '墙上贴着几幅孩子画的蜡笔画。太阳、房子、一家人手牵手……',
    choices: [
      { text: '😢 驻足片刻', outcome: { text: '你看了很久，想起了一些事情。你更加坚定了活下去的决心。', hp: 3 } },
      { text: '🔍 检查房间', outcome: { text: '画的背后有一个小夹层，里面塞着一个急救包。', item: 'bandage' } },
    ],
    weight: 6,
  },
  {
    id: 'gas_leak',
    text: '空气中弥漫着刺鼻的气味……是煤气泄漏！',
    choices: [
      { text: '🏃 立刻捂鼻跑开', outcome: { text: '你及时跑出了危险区域，只是有些头晕。', hp: -2, hunger: -3 } },
      { text: '🔧 尝试关闭阀门', outcome: { text: '你找到了阀门并拧紧了它。旁边有个工具箱。', gold: 8, hp: -4 } },
    ],
    minFloor: 2,
    weight: 7,
  },
  {
    id: 'corpse',
    text: '地上躺着一具已经风干的尸体，身上还有一个背包。',
    choices: [
      { text: '🎒 搜索背包', outcome: { text: '背包里有一些有用的东西。逝者安息。', gold: 10, item: 'canned_food' } },
      { text: '🙏 默哀后离开', outcome: { text: '你向逝者致以敬意，继续前行。', hp: 1 } },
    ],
  },
  {
    id: 'wild_mushrooms',
    text: '墙角潮湿的地方长了一片蘑菇，有些看起来可以食用。',
    choices: [
      { text: '🍄 采集食用', outcome: { text: '味道还行。你的肚子不再那么饿了。', hunger: 20 } },
      { text: '🍄 全部采走', outcome: { text: '你采了一大把，但吃了几个后开始拉肚子……', hunger: 15, hp: -5 } },
      { text: '🚫 不敢吃', outcome: { text: '万一有毒就麻烦了，还是算了。' } },
    ],
  },
  // === MUTATION EVENTS ===
  {
    id: 'mutation_pool',
    text: '你发现了一个散发荧光的水洼，水面冒着气泡。空气中充满了刺鼻的化学气味。这显然不是普通的水——辐射变异的痕迹随处可见。',
    choices: [
      { text: '🧬 将手伸入水中', outcome: { text: '一阵剧痛从指尖蔓延到全身，你的身体开始发生变化……你感到力量在暴增，但同时某些东西也在流失。', mutation: 'flesh' } },
      { text: '💀 用容器收集', outcome: { text: '你小心地收集了一些荧光液体。也许以后有用。', item: 'chemicals' } },
      { text: '🚫 离远点', outcome: { text: '你本能地后退了几步，这东西太危险了。' } },
    ],
    minFloor: 2,
    weight: 5,
  },
  {
    id: 'mutation_corpse',
    text: '一具变异体的尸体横在路中间。它的皮肤已经金属化，坚硬如铁。尸体旁边有一个碎裂的注射器，里面还残留着一些液体。',
    choices: [
      { text: '💉 给自己注射', outcome: { text: '液体注入血管的瞬间，你感到皮肤在变硬，关节变得僵硬……但你也感到前所未有的安全感。', mutation: 'iron' } },
      { text: '🔍 检查尸体', outcome: { text: '你在变异体身上找到了一些零件。', gold: 8 } },
      { text: '⚠️ 不碰这东西', outcome: { text: '你绕过尸体继续前进。' } },
    ],
    minFloor: 2,
    weight: 5,
  },
  {
    id: 'mutation_blood',
    text: '一扇门后是一个满是血迹的房间。中央有一个仪式般的圆环，圆环中间放着一个玻璃瓶，里面装着暗红色的液体。瓶身上刻着一行小字："饮血者永不饥渴"。',
    choices: [
      { text: '🩸 喝下去', outcome: { text: '腥甜的液体滑入喉咙，你感到一股原始的渴望在体内觉醒——杀戮的冲动。', mutation: 'bloodlust' } },
      { text: '🫙 带走瓶子', outcome: { text: '你没有喝，但这个瓶子本身也许有价值。', gold: 10 } },
      { text: '🚪 离开这个诡异的地方', outcome: { text: '你决定不碰这些邪门的东西。' } },
    ],
    minFloor: 3,
    weight: 4,
  },
  {
    id: 'mutation_lab',
    text: '一个仍在运作的实验舱，屏幕上显示着基因序列。舱门是开着的，里面有两个注射器，分别标注着"D-sight"和"R-gen"。',
    choices: [
      { text: '👁️ 注射 D-sight', outcome: { text: '你的视野瞬间变得无比清晰，仿佛能看穿墙壁……但强光让你头痛欲裂，皮肤也变得异常敏感。', mutation: 'darksight' } },
      { text: '💚 注射 R-gen', outcome: { text: '你划破手指测试——伤口在几秒内愈合了。但你的胃开始翻涌，排斥着你刚吃下去的东西。', mutation: 'regen' } },
      { text: '🚫 不冒这个险', outcome: { text: '你看了看那些注射器，还是决定不拿自己当实验品。' } },
    ],
    minFloor: 3,
    weight: 4,
  },
  // === DELAYED CONSEQUENCE EVENTS ===
  {
    id: 'suspicious_water',
    text: '你在一个房间里发现了一桶看起来很干净的水，桶上贴着"纯净水"的标签。',
    choices: [
      { text: '💧 痛快喝', outcome: { text: '终于有干净水了！你大口喝了起来，感觉好极了。', hp: 8, hunger: 15, delayed: { floorsLater: 2, text: '你之前喝的那桶水……开始在体内产生反应。你感到腹部剧痛，皮肤开始发痒。', hp: -8, mutation: 'flesh' } } },
      { text: '👃 先闻闻', outcome: { text: '有股淡淡的化学味道……你决定只漱了漱口。', hunger: 5 } },
      { text: '🚫 不喝', outcome: { text: '末日之后没有什么是可以相信的。你继续前进。' } },
    ],
    minFloor: 2,
    weight: 5,
  },
  {
    id: 'friendly_stranger',
    text: '一个面带微笑的中年人向你走来："朋友，我刚做了点吃的，要不要来一些？"他的营火旁确实有食物的香味。',
    choices: [
      { text: '🍲 接受好意', outcome: { text: '他递给你一碗热汤，味道出乎意料地好。你放松了下来。', hunger: 30, hp: 5, delayed: { floorsLater: 3, text: '你开始犯困……那碗汤里放了东西！你在迷糊中被人翻了个遍。', gold: -20 } } },
      { text: '🤨 保持警惕', outcome: { text: '"不了，谢谢。"你礼貌地拒绝了。他笑了笑，没有坚持。' } },
      { text: '🔪 "你到底想干什么？"', outcome: { text: '他被你的语气吓到了，匆忙收拾东西离开了。你在他留下的营地搜到了一些东西。', gold: 5 } },
    ],
    minFloor: 2,
    weight: 5,
  },
  {
    id: 'mysterious_fruit',
    text: '一棵不知怎么长在废墟里的树上结着几颗发光的果实。它们散发着诱人的甜香。',
    choices: [
      { text: '🍎 吃一颗', outcome: { text: '果肉甘甜多汁，你感到前所未有的精力充沛！', hp: 10, hunger: 20, delayed: { floorsLater: 2, text: '那颗果实的效力开始显现……你的指尖开始渗出绿色的汁液，身体正在发生变异。', mutation: 'regen' } } },
      { text: '🎒 带走几颗', outcome: { text: '你摘了几颗放进包里，小心翼翼。', item: 'energy_drink' } },
      { text: '🚫 发光的东西不能吃', outcome: { text: '生存法则第一条：不吃任何发光的东西。你走了。' } },
    ],
    minFloor: 3,
    weight: 4,
  },
];

// ===================== ENEMIES =====================

export interface EnemyAbility {
  type: 'charge' | 'poison' | 'summon';
  name: string;
  /** Chance to trigger per turn (0-1) */
  chance: number;
  /** For poison: damage per turn, duration */
  poisonDmg?: number;
  poisonDuration?: number;
  /** For charge: multiplier on next attack */
  chargeMultiplier?: number;
  /** For summon: enemy id to summon */
  summonId?: string;
}

export interface EnemyData {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  goldDrop: [number, number];
  lootChance: number;
  desc: string;
  abilities?: EnemyAbility[];
}

export const ENEMIES: Record<string, EnemyData> = {
  mutant_rat:      { id: 'mutant_rat',      name: '变异鼠',     hp: 6,  attack: 2,  defense: 0, goldDrop: [2, 6],   lootChance: 0.25, desc: '一只体型异常的老鼠，眼睛泛着红光。' },
  mutant_spider:   { id: 'mutant_spider',   name: '变异蜘蛛',   hp: 8,  attack: 3,  defense: 0, goldDrop: [3, 8],   lootChance: 0.3,  desc: '跟脸盆一样大的蜘蛛。', abilities: [{ type: 'poison', name: '毒液喷射', chance: 0.2, poisonDmg: 1, poisonDuration: 2 }] },
  wasteland_dog:   { id: 'wasteland_dog',   name: '废土野犬',   hp: 12, attack: 4,  defense: 1, goldDrop: [5, 12],  lootChance: 0.3,  desc: '瘦骨嶙峋但异常凶猛的野犬。' },
  bandit:          { id: 'bandit',          name: '拾荒匪徒',   hp: 18, attack: 5,  defense: 2, goldDrop: [10, 25], lootChance: 0.4,  desc: '一个蒙面的人类，手里握着砍刀。' },
  rust_crawler:    { id: 'rust_crawler',    name: '锈壳爬行者', hp: 16, attack: 5,  defense: 2, goldDrop: [8, 18],  lootChance: 0.35, desc: '身披锈蚀金属碎片的爬行变异体，行动缓慢但皮糙肉厚。' },
  scavenger:       { id: 'scavenger',       name: '拾荒者',     hp: 14, attack: 6,  defense: 1, goldDrop: [8, 20],  lootChance: 0.4,  desc: '一个眼神疯狂的人类，为了物资不惜动手。', abilities: [{ type: 'charge', name: '孤注一掷', chance: 0.15, chargeMultiplier: 1.8 }] },
  feral_ghoul:     { id: 'feral_ghoul',     name: '狂尸鬼',     hp: 25, attack: 7,  defense: 3, goldDrop: [12, 30], lootChance: 0.35, desc: '曾经是人类，现在只剩下撕咬的本能。', abilities: [{ type: 'poison', name: '腐蚀爪击', chance: 0.2, poisonDmg: 2, poisonDuration: 2 }] },
  raider_elite:    { id: 'raider_elite',    name: '掠夺者精英', hp: 30, attack: 9,  defense: 4, goldDrop: [15, 35], lootChance: 0.5,  desc: '装备精良的掠夺者，战斗经验丰富。', abilities: [{ type: 'charge', name: '蓄力重击', chance: 0.2, chargeMultiplier: 2 }] },
  mutant_bear:     { id: 'mutant_bear',     name: '变异熊',     hp: 40, attack: 12, defense: 5, goldDrop: [20, 45], lootChance: 0.5,  desc: '巨大的变异棕熊，皮肤上布满溃烂的疮。', abilities: [{ type: 'charge', name: '狂暴冲撞', chance: 0.25, chargeMultiplier: 2.5 }] },
  shadow_stalker:  { id: 'shadow_stalker',  name: '暗影潜行者', hp: 22, attack: 14, defense: 2, goldDrop: [18, 40], lootChance: 0.45, desc: '你几乎看不到它——直到它出手。', abilities: [{ type: 'poison', name: '暗影侵蚀', chance: 0.3, poisonDmg: 4, poisonDuration: 2 }] },
  trap_mimic:      { id: 'trap_mimic',      name: '拟态箱',     hp: 15, attack: 6,  defense: 2, goldDrop: [15, 30], lootChance: 0.6,  desc: '看起来是个宝箱，实际上长了牙齿。' },
  ambush_hunter:   { id: 'ambush_hunter',   name: '伏击猎手',   hp: 18, attack: 8,  defense: 2, goldDrop: [12, 28], lootChance: 0.4,  desc: '伪装成尸体的猎手，专门袭击路过的探索者。' },
  // Late-game enemies (10F+)
  rad_scorpion:    { id: 'rad_scorpion',    name: '辐射蝎',     hp: 35, attack: 11, defense: 6, goldDrop: [20, 40], lootChance: 0.45, desc: '巨型蝎子，尾部的毒刺闪着幽绿色的光。', abilities: [{ type: 'poison', name: '辐射毒刺', chance: 0.3, poisonDmg: 4, poisonDuration: 3 }] },
  patrol_mech:     { id: 'patrol_mech',     name: '巡逻机甲',   hp: 45, attack: 10, defense: 7, goldDrop: [25, 50], lootChance: 0.5,  desc: '军方遗留的自动巡逻机甲，仍在执行最后的命令。', abilities: [{ type: 'charge', name: '动能炮击', chance: 0.2, chargeMultiplier: 2.5 }] },
  hive_mother:     { id: 'hive_mother',     name: '蜂巢母体',   hp: 30, attack: 8,  defense: 3, goldDrop: [22, 45], lootChance: 0.5,  desc: '一团蠕动的变异有机体，不断释放出微小的子体。', abilities: [{ type: 'summon', name: '释放子体', chance: 0.35, summonId: 'mutant_spider' }, { type: 'poison', name: '腐蚀孢子', chance: 0.2, poisonDmg: 3, poisonDuration: 2 }] },
  whitecoat:       { id: 'whitecoat',       name: '白大褂',     hp: 50, attack: 13, defense: 4, goldDrop: [30, 55], lootChance: 0.55, desc: '穿着白大褂的人形生物，眼睛是红色的。它曾经是一名研究员。', abilities: [{ type: 'charge', name: '实验注射', chance: 0.25, chargeMultiplier: 2 }, { type: 'poison', name: '变异试剂', chance: 0.15, poisonDmg: 5, poisonDuration: 2 }] },
  // Bosses
  warlord:         { id: 'warlord',         name: '废土军阀',   hp: 50, attack: 10, defense: 5, goldDrop: [40, 80], lootChance: 1.0,  desc: '他统治着这片废墟的上层，不会轻易让你通过。', abilities: [{ type: 'charge', name: '军阀怒击', chance: 0.3, chargeMultiplier: 2 }, { type: 'summon', name: '召唤手下', chance: 0.15, summonId: 'bandit' }] },
  mutant_king:     { id: 'mutant_king',     name: '变异兽王',   hp: 80, attack: 15, defense: 8, goldDrop: [60, 120], lootChance: 1.0, desc: '所有变异体的首领，体型巨大。', abilities: [{ type: 'charge', name: '兽王践踏', chance: 0.25, chargeMultiplier: 2.5 }, { type: 'poison', name: '辐射吐息', chance: 0.2, poisonDmg: 5, poisonDuration: 3 }] },
  ark_guardian:    { id: 'ark_guardian',     name: '方舟守卫',   hp: 100, attack: 16, defense: 9, goldDrop: [80, 150], lootChance: 1.0, desc: '方舟入口的最终防线——一台全副武装的军用机甲。', abilities: [{ type: 'charge', name: '导弹齐射', chance: 0.3, chargeMultiplier: 2.5 }, { type: 'summon', name: '部署无人机', chance: 0.2, summonId: 'patrol_mech' }] },
};

// ===================== TRADER =====================

export const TRADER_STOCK = {
  buy: ['bandage', 'medkit', 'canned_food', 'clean_water', 'energy_drink', 'kitchen_knife', 'leather_vest', 'nail_bat', 'scrap_shield'],
  sellMultiplier: 0.5,
};

/** Chance trader betrays (10%) */
export const TRADER_BETRAY_CHANCE = 0.1;

// ===================== GAMBLER =====================

export interface GambleOption {
  name: string;
  cost: number;
  /** Outcomes: [probability, description, reward] */
  outcomes: Array<{ chance: number; text: string; gold?: number; item?: string; hp?: number }>;
}

export const GAMBLE_OPTIONS: GambleOption[] = [
  {
    name: '🎲 赌大小 (10💰)',
    cost: 10,
    outcomes: [
      { chance: 0.45, text: '大！你赢了！', gold: 20 },
      { chance: 0.45, text: '小……你输了。', gold: 0 },
      { chance: 0.1,  text: '豹子！三倍奖励！', gold: 30 },
    ],
  },
  {
    name: '🎰 转轮盘 (20💰)',
    cost: 20,
    outcomes: [
      { chance: 0.3,  text: '恭喜，中奖了！', gold: 50 },
      { chance: 0.5,  text: '没中，白花钱了。', gold: 0 },
      { chance: 0.15, text: '特等奖！你简直不敢相信自己的运气。', gold: 60, item: 'medkit' },
      { chance: 0.05, text: '轮盘卡住了，赌桌翻了。你的钱洒了一地……', gold: -10 },
    ],
  },
  {
    name: '🃏 猜牌 (5💰)',
    cost: 5,
    outcomes: [
      { chance: 0.5, text: '猜对了！小赚一笔。', gold: 10 },
      { chance: 0.4, text: '猜错了。', gold: 0 },
      { chance: 0.1, text: '你连猜三次全对！赌徒目瞪口呆地把赌注还给你。', gold: 15 },
    ],
  },
];

// ===================== CURSED CHEST =====================

export interface CursedChestOutcome {
  chance: number;
  type: 'jackpot' | 'trap' | 'sealed_enemy' | 'curse';
  text: string;
  gold?: number;
  hp?: number;
  item?: string;
  combat?: string;
  mutation?: MutationType;
}

export const CURSED_CHEST_OUTCOMES: CursedChestOutcome[] = [
  { chance: 0.40, type: 'jackpot',      text: '宝箱里金光闪闪！你找到了稀有物品！', gold: 25 },
  { chance: 0.30, type: 'trap',         text: '宝箱弹出一根毒针！你的手被刺中了。', hp: -8 },
  { chance: 0.20, type: 'sealed_enemy', text: '宝箱猛地弹开——里面爬出一只怪物！', combat: 'trap_mimic' },
  { chance: 0.10, type: 'curse',        text: '黑色的烟雾从箱子里涌出，钻进了你的身体……你感到体内有什么东西在改变。' },
];

// ===================== DEMON TRADER =====================

export interface DemonDeal {
  offer: string;
  offerDesc: string;
  item?: string;
  costType: 'maxHp' | 'maxHunger';
  costAmount: number;
  costDesc: string;
}

export const DEMON_DEALS: DemonDeal[] = [
  { offer: '暗杀匕首',   offerDesc: '一把散发幽光的匕首 (攻击+12)', item: 'demon_blade',    costType: 'maxHp',     costAmount: 8,  costDesc: '最大HP永久 -8' },
  { offer: '生命虹吸符',  offerDesc: '击杀敌人时恢复大量HP的护符',     item: 'lifesteal_charm', costType: 'maxHunger', costAmount: 30, costDesc: '最大饱食永久 -30' },
  { offer: '全图透视',    offerDesc: '本层所有房间立刻可见',           item: undefined,         costType: 'maxHp',     costAmount: 5,  costDesc: '最大HP永久 -5' },
  { offer: '防弹背心',    offerDesc: '军用级防弹背心 (防御+8)',        item: 'demon_armor',     costType: 'maxHunger', costAmount: 25, costDesc: '最大饱食永久 -25' },
];

// ===================== HELPERS =====================

export function weightedPick(events: GameEvent[]): GameEvent {
  const totalWeight = events.reduce((sum, e) => sum + (e.weight ?? 10), 0);
  let r = Math.random() * totalWeight;
  for (const e of events) {
    r -= e.weight ?? 10;
    if (r <= 0) return e;
  }
  return events[events.length - 1];
}

export function rollCursedChest(): CursedChestOutcome {
  let r = Math.random();
  for (const o of CURSED_CHEST_OUTCOMES) {
    r -= o.chance;
    if (r <= 0) return o;
  }
  return CURSED_CHEST_OUTCOMES[0];
}

export function rollGamble(option: GambleOption): (typeof option.outcomes)[0] {
  let r = Math.random();
  for (const o of option.outcomes) {
    r -= o.chance;
    if (r <= 0) return o;
  }
  return option.outcomes[0];
}
