export interface EndingDef {
  id: string;
  name: string;
  desc: string;
  conditions: {
    karmaMin?: number;
    karmaMax?: number;
    requiredQuests?: string[];
    requiredLore?: string[];
    requiredClears?: string[];
  };
  epilogue: string;
}

// Skeleton — to be filled in Phase 9
export const ENDINGS: Record<string, EndingDef> = {
  ending_true: {
    id: 'ending_true',
    name: '真相大白',
    desc: '你揭开了方舟的全部真相，让幸存者们做出自己的选择。',
    conditions: {
      karmaMin: -30,
      karmaMax: 30,
      requiredClears: ['ark_entrance'],
      requiredLore: ['lore_ark_truth'],
    },
    epilogue: '你将方舟的真相公布于众。有人愤怒，有人绝望，但更多的人选择了面对。废土上第一次燃起了真正的希望之火。',
  },
  ending_hero: {
    id: 'ending_hero',
    name: '废土英雄',
    desc: '你以善行赢得了所有人的信任，成为了新时代的领袖。',
    conditions: {
      karmaMin: 50,
      requiredClears: ['ark_entrance'],
    },
    epilogue: '你的善行传遍了废土的每一个角落。人们围聚在你身边，在废墟上建起了新的城市。这一次，他们发誓不会重蹈覆辙。',
  },
  ending_tyrant: {
    id: 'ending_tyrant',
    name: '废土霸主',
    desc: '你以铁腕统治废土，用力量建立了新的秩序。',
    conditions: {
      karmaMax: -50,
      requiredClears: ['ark_entrance'],
    },
    epilogue: '你用铁与血建立了新的秩序。人们畏惧你，服从你。废土上终于有了规则——你的规则。但在每个人的眼中，你看到的都是恐惧。',
  },
  ending_wanderer: {
    id: 'ending_wanderer',
    name: '永远的流浪者',
    desc: '你没有揭开真相，选择继续在废土上漫无目的地游荡。',
    conditions: {},
    epilogue: '你背起行囊，头也不回地离开了营地。废土广袤无垠，总有新的废墟等待探索，新的故事等待发现。也许有一天，你会找到属于自己的答案。',
  },
};
