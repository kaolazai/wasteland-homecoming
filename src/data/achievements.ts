export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Check function receives player stats */
  check: (stats: AchievementStats) => boolean;
  reward?: { gold?: number; skillPoints?: number };
}

export interface AchievementStats {
  maxFloorReached: number;
  totalKills: number;
  totalDeaths: number;
  totalGoldEarned: number;
  bossKills: number;
  journalCount: number;
  maxBuildingLevel: number;  // sum of all building levels
  skillCount: number;
  completedQuests: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Exploration
  { id: 'floor_5', name: '初探深渊', icon: '🏚️', desc: '到达第5层',
    check: s => s.maxFloorReached >= 5, reward: { gold: 20 } },
  { id: 'floor_10', name: '深入虎穴', icon: '🕳️', desc: '到达第10层',
    check: s => s.maxFloorReached >= 10, reward: { gold: 50 } },
  { id: 'floor_15', name: '不归之路', icon: '⬇️', desc: '到达第15层',
    check: s => s.maxFloorReached >= 15, reward: { gold: 80, skillPoints: 1 } },
  { id: 'floor_20', name: '方舟之门', icon: '🚪', desc: '到达第20层',
    check: s => s.maxFloorReached >= 20, reward: { gold: 150, skillPoints: 2 } },

  // Combat
  { id: 'kill_10', name: '初试锋芒', icon: '⚔️', desc: '累计击杀10只敌人',
    check: s => s.totalKills >= 10, reward: { gold: 15 } },
  { id: 'kill_50', name: '杀戮机器', icon: '💀', desc: '累计击杀50只敌人',
    check: s => s.totalKills >= 50, reward: { gold: 40 } },
  { id: 'kill_100', name: '废土猎手', icon: '🏆', desc: '累计击杀100只敌人',
    check: s => s.totalKills >= 100, reward: { gold: 80, skillPoints: 1 } },
  { id: 'boss_1', name: 'Boss猎人', icon: '👑', desc: '首次击杀Boss',
    check: s => s.bossKills >= 1, reward: { gold: 30 } },
  { id: 'boss_3', name: '传说杀手', icon: '🐉', desc: '击杀3个Boss',
    check: s => s.bossKills >= 3, reward: { skillPoints: 2 } },

  // Collection
  { id: 'journal_10', name: '记录者', icon: '📜', desc: '收集10条日志',
    check: s => s.journalCount >= 10 },
  { id: 'journal_20', name: '真相追寻者', icon: '📖', desc: '收集全部20条日志',
    check: s => s.journalCount >= 20, reward: { skillPoints: 1 } },
  { id: 'skill_5', name: '技艺精湛', icon: '⚡', desc: '学会5种技能',
    check: s => s.skillCount >= 5, reward: { gold: 30 } },
  { id: 'skill_8', name: '全能战士', icon: '🌟', desc: '学会全部8种技能',
    check: s => s.skillCount >= 8, reward: { gold: 100, skillPoints: 2 } },

  // Base
  { id: 'build_10', name: '基地建设者', icon: '🏗️', desc: '建筑等级总和达到10',
    check: s => s.maxBuildingLevel >= 10, reward: { gold: 30 } },
  { id: 'build_25', name: '废土家园', icon: '🏰', desc: '建筑等级总和达到25',
    check: s => s.maxBuildingLevel >= 25, reward: { gold: 80, skillPoints: 1 } },

  // Quests
  { id: 'quest_3', name: '靠谱的人', icon: '🤝', desc: '完成3个NPC委托',
    check: s => s.completedQuests >= 3, reward: { gold: 30 } },
  { id: 'quest_9', name: '营地支柱', icon: '🏅', desc: '完成全部9个NPC委托',
    check: s => s.completedQuests >= 9, reward: { gold: 100, skillPoints: 3 } },

  // Survival
  { id: 'death_0', name: '钢铁意志', icon: '💪', desc: '完成一次探索且从未死亡',
    check: s => s.totalDeaths === 0 && s.maxFloorReached >= 5 },
  { id: 'gold_500', name: '废土富翁', icon: '💰', desc: '累计获得500金币',
    check: s => s.totalGoldEarned >= 500, reward: { gold: 50 } },
];
