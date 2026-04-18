// === Journal Entries (fragmented narrative) ===

export interface JournalEntry {
  id: string;
  /** Min floor to discover this entry */
  minFloor: number;
  title: string;
  content: string;
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  // === Phase 1: Before the fall (1-3F) ===
  { id: 'j01', minFloor: 1, title: '军方备忘录',
    content: '净化协议已获批准。预计零号区域将在72小时内完成生物清除。注意：不要告知平民。——第七指挥部' },
  { id: 'j02', minFloor: 1, title: '便条',
    content: '亲爱的，我把备用钥匙放在老地方了。如果我没回来，带着孩子去找张叔。他知道该怎么做。——永远爱你的明' },
  { id: 'j03', minFloor: 1, title: '超市收据',
    content: '矿泉水x20、罐头x50、手电筒x3、电池x10……日期是灾难发生前三天。有人提前知道了？' },
  { id: 'j04', minFloor: 2, title: '实验日志 Day-3',
    content: '样本B-07的增殖速度远超预期。活性蛋白已突破第三道隔离屏障。建议立即终止实验。附注：申请被驳回。' },
  { id: 'j05', minFloor: 2, title: '幸存者涂鸦',
    content: '别往下走！！下面的东西不是人类！！他们穿着白大褂但是眼睛是红色的！！谁看到了快跑！！' },

  // === Phase 2: The collapse (3-5F) ===
  { id: 'j06', minFloor: 3, title: '军方通信记录',
    content: '……封锁线被突破。第三团已全面撤退。平民疏散计划取消。重复，取消。执行焦土指令。' },
  { id: 'j07', minFloor: 3, title: '医院日志',
    content: '急诊已经停止接诊了。不是因为没有病人——是因为医生们也开始出现症状了。皮肤硬化，瞳孔变色。小芸说她见过更可怕的。' },
  { id: 'j08', minFloor: 3, title: '广播录音抄本',
    content: '……所有市民请保持冷静，待在室内……军方正在处理……请不要相信谣言……（信号中断）' },
  { id: 'j09', minFloor: 4, title: '士兵的遗书',
    content: '老婆，对不起。他们不让我们告诉任何人。我参与了B-07的运输，现在我知道那是什么了。我活不了多久了。抽屉里有一张地图，上面标了安全区。' },
  { id: 'j10', minFloor: 4, title: '撕碎的报告',
    content: '方舟计划……选定人员名单（机密）……坐标N39°……地下设施入口位于……（后面被撕掉了）' },

  // === Phase 3: The underground (5-8F) ===
  { id: 'j11', minFloor: 5, title: '地下通道涂鸦',
    content: '张叔说下面有个避难所，里面有吃不完的食物和干净的水。他带着第一批人下去了。再也没有回来。' },
  { id: 'j12', minFloor: 5, title: '老旧磁带录音',
    content: '"方舟不是避难所，是实验场。他们需要活人做测试。B-07的解药需要……需要……"（磁带损坏）' },
  { id: 'j13', minFloor: 6, title: '匿名警告',
    content: '如果你在读这个，说明你还活着。第10层有军方的通信室，里面有所有真相。但守在那里的东西已经不是人了。' },
  { id: 'j14', minFloor: 6, title: '化学配方残页',
    content: '一张写满化学式的纸。你看不太懂，但上面用红笔圈出了一个标注："可逆变异——理论可行"。' },
  { id: 'j15', minFloor: 7, title: '阿鬼的账本',
    content: '一本破旧的账本。记录了各种交易——武器、食物、药品，甚至是"通行证"。最后一页写着："深处有人出高价收购活体样本。"' },

  // === Phase 4: The truth (8-15F) ===
  { id: 'j16', minFloor: 8, title: '军方绝密档案',
    content: 'B-07并非意外泄漏。净化协议的真正目的是"加速进化"。方舟计划的参与者将接受B-07强化注射。预计存活率：12%。' },
  { id: 'j17', minFloor: 9, title: '科学家的日记',
    content: '他们疯了。12%的存活率意味着88%的人会变成那种东西。而他们称之为"可接受的损耗"。我把一份解药配方藏在了15层的主控室。' },
  { id: 'j18', minFloor: 10, title: '通信室记录',
    content: '方舟状态报告：第一批注射已完成。存活者表现出超常的体能和恢复力，但认知功能持续退化。第二批将在……建议暂停……通信中断。' },
  { id: 'j19', minFloor: 13, title: '最后的警告',
    content: '方舟已沦陷。存活者全部变异。解药配方在15层，但需要20层的实验设备才能合成。如果你能走到那里——你是人类最后的希望。' },
  { id: 'j20', minFloor: 15, title: '方舟计划全文',
    content: '你找到了完整的文件。净化、方舟、B-07、变异——所有碎片终于拼成了完整的画面。地下20层是终点。三个选择等待着你。' },
];

// === NPC Dialogues ===

export interface NpcDef {
  id: string;
  name: string;
  icon: string;
  unlockFloor: number;
  dialogues: NpcDialogue[];
}

export interface NpcDialogue {
  text: string;
  /** Optional effect */
  gold?: number;
  hp?: number;
  item?: string;
  recipe?: string;
  journal?: string;
}

export const NPCS: Record<string, NpcDef> = {
  laozhang: {
    id: 'laozhang',
    name: '老张',
    icon: '👴',
    unlockFloor: 3,
    dialogues: [
      { text: '"你也是从上面下来的？能活到现在不容易。我叫老张，以前是个兵。"' },
      { text: '"打仗讲究一个字——稳。别贪刀，防御有时候比攻击更重要。"' },
      { text: '"我以前的战友，一半变成了那种东西。另一半……被上面的人放弃了。"' },
      { text: '"听说过方舟计划吗？军方的人撤退前一直在念叨这个。"' },
      { text: '"我教你一个技巧吧。记住，敌人蓄力的时候一定要防御。"', gold: 10 },
      { text: '"第七指挥部……我就是从那儿出来的。净化协议是我亲眼看着签发的。"', journal: 'j06' },
      { text: '"年轻人，如果你真的要往下走，拿着这个。可能用得上。"', item: 'rusty_key' },
      { text: '"我老了，走不动了。但如果你找到了方舟……替我看看那些混蛋过得怎么样。"' },
    ],
  },
  xiaoyun: {
    id: 'xiaoyun',
    name: '小芸',
    icon: '👩‍⚕️',
    unlockFloor: 5,
    dialogues: [
      { text: '"你受伤了？让我看看……我以前是中心医院的外科医生。"', hp: 10 },
      { text: '"医院沦陷那天，我亲眼看着院长注射了B-07。他说是疫苗。十分钟后他就不认识我了。"' },
      { text: '"我偷偷保留了一些医疗用品。你需要的话可以找我。"', item: 'medkit' },
      { text: '"你知道吗，B-07不是病毒。它更像是……催化剂。它会激活人体内沉睡的基因。"' },
      { text: '"我在研究变异体的样本。如果给我足够的材料，也许我能做出解药……至少是减缓变异的药剂。"', recipe: 'craft_metal_plate' },
      { text: '"有个科学家把解药配方藏在了下面。如果你找到了，带给我。"', journal: 'j17' },
      { text: '"拜托了，如果你到了最底层，选择治愈。不要毁掉一切。还有人值得被拯救。"' },
    ],
  },
  agui: {
    id: 'agui',
    name: '阿鬼',
    icon: '🎭',
    unlockFloor: 8,
    dialogues: [
      { text: '"嘿嘿嘿……新面孔。我叫阿鬼。你需要什么，我都能搞到——只要价格合适。"' },
      { text: '"别用那种眼神看我。末日之后，道德是最不值钱的东西。"' },
      { text: '"我有个消息要卖给你。便宜，只要20金币。"', gold: -20, journal: 'j15' },
      { text: '"深处有些人在收集活体样本。变异体的、人类的都要。出价很高。我只是中间人。"' },
      { text: '"你想知道我怎么活到现在的？很简单——我谁都不相信。包括你。"', item: 'energy_drink' },
      { text: '"方舟？那地方我去过门口。守门的东西有三米高，浑身铁皮。我看了一眼就跑了。"', journal: 'j19' },
      { text: '"如果你真打算下到底……我这里有点好东西，算你半价。以后记得照顾我生意。"', recipe: 'craft_signal_flare' },
      { text: '"世界变成这样，也没什么不好。至少现在人人平等了——都是猎物。嘿嘿嘿。"' },
    ],
  },
};

// === NPC Quests (Commissions) ===

export type QuestRequirement =
  | { type: 'collect'; itemId: string; count: number }
  | { type: 'kill'; enemyId: string; count: number }
  | { type: 'reach_floor'; floor: number };

export interface NpcQuest {
  id: string;
  npcId: string;
  name: string;
  desc: string;
  requirement: QuestRequirement;
  reward: {
    gold?: number;
    item?: string;
    skillPoints?: number;
    recipe?: string;
  };
}

export const NPC_QUESTS: NpcQuest[] = [
  // 老张的委托
  {
    id: 'q_laozhang_1', npcId: 'laozhang', name: '废铁回收',
    desc: '帮老张收集3块废铁来加固营地防御。',
    requirement: { type: 'collect', itemId: 'scrap_metal', count: 3 },
    reward: { gold: 30, skillPoints: 1 },
  },
  {
    id: 'q_laozhang_2', npcId: 'laozhang', name: '清除匪徒',
    desc: '老张听说附近有一伙匪徒，帮他解决掉3个。',
    requirement: { type: 'kill', enemyId: 'bandit', count: 3 },
    reward: { gold: 40, item: 'fire_axe' },
  },
  {
    id: 'q_laozhang_3', npcId: 'laozhang', name: '深入侦察',
    desc: '老张想知道第8层以下的情况，帮他探个路。',
    requirement: { type: 'reach_floor', floor: 8 },
    reward: { gold: 50, skillPoints: 2 },
  },
  // 小芸的委托
  {
    id: 'q_xiaoyun_1', npcId: 'xiaoyun', name: '药品原料',
    desc: '小芸需要2瓶化学品来配制药剂。',
    requirement: { type: 'collect', itemId: 'chemicals', count: 2 },
    reward: { gold: 20, item: 'medkit' },
  },
  {
    id: 'q_xiaoyun_2', npcId: 'xiaoyun', name: '变异样本',
    desc: '小芸想研究狂尸鬼的组织样本，帮她击杀2只。',
    requirement: { type: 'kill', enemyId: 'feral_ghoul', count: 2 },
    reward: { skillPoints: 1, recipe: 'craft_detector' },
  },
  {
    id: 'q_xiaoyun_3', npcId: 'xiaoyun', name: '实验室数据',
    desc: '小芸需要15层的实验数据来完善解药，替她去一趟。',
    requirement: { type: 'reach_floor', floor: 15 },
    reward: { gold: 60, skillPoints: 2, item: 'revival_syringe' },
  },
  // 阿鬼的委托
  {
    id: 'q_agui_1', npcId: 'agui', name: '电子零件',
    desc: '阿鬼要3块电路板来修他的"设备"。别问什么设备。',
    requirement: { type: 'collect', itemId: 'circuit_board', count: 3 },
    reward: { gold: 45, item: 'detector' },
  },
  {
    id: 'q_agui_2', npcId: 'agui', name: '赏金猎人',
    desc: '阿鬼悬赏暗影潜行者的头。杀2只，赏金翻倍。',
    requirement: { type: 'kill', enemyId: 'shadow_stalker', count: 2 },
    reward: { gold: 80 },
  },
  {
    id: 'q_agui_3', npcId: 'agui', name: '方舟通行证',
    desc: '阿鬼说到达最底层就能拿到"通行证"。他想看看那是什么。',
    requirement: { type: 'reach_floor', floor: 20 },
    reward: { gold: 100, skillPoints: 3 },
  },
];

// === Deep Floor Special Events ===

export interface StoryEvent {
  floor: number;
  title: string;
  text: string;
  journal?: string;
  choices: StoryChoice[];
}

export interface StoryChoice {
  text: string;
  result: string;
  hp?: number;
  gold?: number;
  item?: string;
  journal?: string;
}

export const STORY_EVENTS: StoryEvent[] = [
  {
    floor: 10,
    title: '军方通信室',
    text: '你推开一扇厚重的钢门，里面是一个满是屏幕的房间。大部分已经损坏，但有一台还在闪烁，上面显示着加密通信记录。',
    journal: 'j18',
    choices: [
      { text: '📖 仔细阅读所有记录', result: '你花了很长时间阅读。真相令人不寒而栗——这一切都是计划好的。', hp: -3, journal: 'j18' },
      { text: '💾 下载数据', result: '你把能保存的数据都拷贝了下来。也许以后有用。', item: 'circuit_board' },
      { text: '🔨 砸烂一切', result: '你无法控制自己的愤怒。这些人不配被记住。', hp: -2, gold: 5 },
    ],
  },
  {
    floor: 15,
    title: '地下实验室主控室',
    text: '这里就是一切的源头。B-07培养皿还在运转，散发着诡异的荧光。控制台上有一份标注为"解药"的文件。',
    journal: 'j20',
    choices: [
      { text: '📋 取走解药配方', result: '你小心地将配方收好。20层的设备是合成解药的唯一希望。', journal: 'j20' },
      { text: '🧪 尝试自己合成', result: '没有完整设备，你只能做出一份粗糙的试剂。但聊胜于无。', item: 'herb_potion', hp: -5 },
      { text: '💣 销毁实验室', result: '你打碎了所有培养皿。荧光液体在地上蒸发，空气变得刺鼻。至少这里不会再产生新的怪物了。', hp: -8, gold: 20 },
    ],
  },
  {
    floor: 20,
    title: '方舟',
    text: '你终于到了最底层。巨大的钢铁大门上写着"方舟"两个字。门是开着的。里面的景象让你震惊——到处是变异体的残骸，和曾经辉煌的生活设施。在最深处，你找到了解药合成设备和自毁装置。',
    choices: [
      { text: '💊 合成解药', result: '你启动了设备，用收集的材料合成了解药。一道蓝光照亮了整个方舟。也许……这个世界还有救。\n\n【结局：希望之光】\n你带着解药回到了地面。路还很长，但至少有了方向。', gold: 100 },
      { text: '💥 启动自毁', result: '你按下了红色按钮。倒计时开始。你头也不回地往上跑。身后传来剧烈的爆炸声和崩塌声。\n\n【结局：焦土】\n一切都结束了。好的坏的，都埋在了地下。', gold: 50 },
      { text: '🚪 关上门离开', result: '你看了最后一眼，然后用力拉上了钢门。有些东西，还是让它永远留在地下吧。\n\n【结局：沉默】\n你回到了地面，什么也没说。篝火还在燃烧。日子还要继续过。', gold: 30 },
    ],
  },
];

/** Camp shop stock by shop level */
export const CAMP_SHOP_STOCK: Record<number, string[]> = {
  1: ['bandage', 'canned_food', 'clean_water', 'dried_meat', 'stale_bread', 'cloth', 'scrap_metal'],
  2: ['medkit', 'energy_drink', 'herb_potion', 'kitchen_knife', 'torn_jacket', 'circuit_board', 'fuel_can'],
  3: ['machete', 'leather_vest', 'nail_bat', 'chemicals', 'scrap_shield', 'rusty_key'],
};

/** Premium items that rotate randomly in shop (2 per visit, expensive) */
export const PREMIUM_SHOP_POOL = [
  { itemId: 'fire_axe', price: 80 },
  { itemId: 'riot_vest', price: 70 },
  { itemId: 'metal_plate', price: 100 },
  { itemId: 'rebar_spear', price: 60 },
  { itemId: 'revival_syringe', price: 120 },
  { itemId: 'signal_flare', price: 60 },
  { itemId: 'detector', price: 70 },
  { itemId: 'stim_shot', price: 50 },
  { itemId: 'hardened_blade', price: 150 },
  { itemId: 'rad_suit', price: 110 },
];
