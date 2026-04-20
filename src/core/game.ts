import {
  GameState, type PartyMember, createInitialState, createInitialGameState, saveState, loadState, clearSave,
  getAttack, getDefense, applyDefense, calcDamageTaken, getHungerMultiplier, type InventoryItem,
  canUseConsumables, canEscape, getEscapeChance,
  applyMutation, clearMutation, MUTATIONS,
  addItem, removeItem, hasItem,
  isInventoryFull, getInventoryUsed, calcInventorySlots,
  loadMeta, saveMeta, unlockSlot, getMaxSlots,
  type MutationType, type DelayedEffect, type SavedEnemy,
  type SaveMeta,
} from './state';
import {
  updateStatusBar, appendMessage, clearMessages, setActions, renderMap, hideMap,
  showCombatScreen, hideCombatScreen, updateCombatBars, updateEnemyBars, updatePartyBars, updateTurnOrder,
  appendCombatMsg, setCombatActions,
  showInventoryScreen, hideInventoryScreen, renderInventoryGrid,
  setInventoryDetail, setInventoryActions,
  showHomeButton, hideHomeButton, setBagButtonCallback, showConfirm,
  scrollToBottom,
  type ActionButton,
} from '../ui/renderer';
import {
  EXPLORE_EVENTS, ENEMIES, TRADER_STOCK, TRADER_BETRAY_CHANCE,
  GAMBLE_OPTIONS, CURSED_CHEST_OUTCOMES, DEMON_DEALS,
  weightedPick, rollCursedChest, rollGamble,
  type Outcome, type EnemyData, type EnemyAbility,
} from '../data/events';
import { ITEMS, rollLoot, rollAffix, LOOT_TABLES, AFFIXES, type WeaponAffix } from '../data/items';
import { WORLD_NODES, type WorldNode } from '../data/nodes';
import { generateFloorMap, getRoomDescription, type FloorMap, type Room } from '../data/maps';
import { RECIPES, STARTER_RECIPES } from '../data/recipes';
import { JOURNAL_ENTRIES, NPCS, NPC_QUESTS, STORY_EVENTS, CAMP_SHOP_STOCK, PREMIUM_SHOP_POOL, type NpcDef } from '../data/journal';
import { SKILLS, POINT_SKILLS, EXPLORATION_SKILLS, JOB_SKILLS, type SkillEffect } from '../data/skills';
import { JOBS, type JobDef } from '../data/jobs';
import { LORE_FRAGMENTS, PUZZLES, BOSS_WEAKNESSES } from '../data/lore';
import { ACHIEVEMENTS, type AchievementStats } from '../data/achievements';
import { COMPANIONS } from '../data/companions';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface RunStats {
  startFloor: number;
  maxFloor: number;
  kills: number;
  goldEarned: number;
  itemsFound: number;
  roomsExplored: number;
}

export class Game {
  state: GameState;
  private runStats: RunStats | null = null;

  constructor() {
    this.state = loadState() ?? createInitialState();
  }

  start() {
    updateStatusBar(this.state);
    clearMessages();
    hideMap();

    if (this.state.map) {
      showHomeButton(() => { this.state.currentNodeId = 'camp'; this.returnToBase(); });
      appendMessage('—— 废 土 归 来 ——', 'system');
      appendMessage('你从短暂的休息中醒来，继续探索……', 'narrator');
      this.showMapView();
    } else if (this.state.currentNodeId && this.state.currentNodeId !== 'camp') {
      appendMessage('—— 废 土 归 来 ——', 'system');
      appendMessage('你回到了之前的位置……', 'narrator');
      this.showWorldMap();
    } else {
      appendMessage('—— 废 土 归 来 ——', 'system');
      appendMessage('文明崩塌后的第147天。', 'narrator');
      appendMessage('你在一座废弃建筑的地下室醒来，外面的世界已经面目全非。', 'narrator');
      appendMessage('你需要在这片废墟中搜寻物资，建设营地，活下去。', 'narrator');
      this.showBaseActions();
    }
  }

  // ==================== BASE ====================

  private showBaseActions() {
    this.state.map = null;
    clearMutation(this.state);
    this.state.savedEnemies = [];
    this.state.healUsedThisRun = false;
    this.state.adReviveUsed = false;
    // Update maxFloorReached
    if (this.state.floor > this.state.maxFloorReached) {
      this.state.maxFloorReached = this.state.floor;
    }
    // Init starter recipes
    if (this.state.knownRecipes.length === 0) {
      this.state.knownRecipes = [...STARTER_RECIPES];
    }
    // Unlock camp NPCs based on maxFloorReached
    for (const npcId of Object.keys(NPCS)) {
      const npc = NPCS[npcId];
      if (this.state.maxFloorReached >= npc.unlockFloor && !this.state.campNpcs.includes(npcId)) {
        this.state.campNpcs.push(npcId);
        appendMessage(`📢 ${npc.icon} ${npc.name}来到了营地！`, 'loot');
      }
    }
    // Recalc inventory slots
    this.state.inventorySlots = calcInventorySlots(this.state);
    saveState(this.state);
    hideMap();
    appendMessage('', 'divider');
    appendMessage('【营 地】', 'system');
    appendMessage('篝火噼啪作响，这里暂时是安全的。', 'narrator');
    updateStatusBar(this.state);

    setBagButtonCallback(() => this.showInventory('base'));

    const kitchenLv = this.state.baseLevel.kitchen;
    const mealCost = Math.max(3, 8 - kitchenLv);

    const actions: ActionButton[] = [
      { text: '🗺️ 出发探索', primary: true, callback: () => this.showWorldMap() },
      ...(this.state.endlessUnlocked ? [{
        text: `♾️ 无尽模式 (最高${this.state.endlessHighFloor}F)`,
        callback: () => this.enterEndless(),
      }] : []),
      { text: '😴 休息 (天数+1)', disabled: this.state.party[0].hp >= this.state.party[0].maxHp && this.state.stamina >= this.state.maxStamina, callback: () => this.rest() },
      { text: `🍖 吃饭 (${mealCost}💰)`, disabled: this.state.stamina >= this.state.maxStamina || this.state.gold < mealCost, callback: () => this.eat() },
      { text: '🔨 建筑升级', callback: () => this.showBuildingsMenu() },
    ];

    // Crafting (requires workbench >= 1)
    if (this.state.baseLevel.workbench >= 1) {
      actions.push({ text: '🔬 制作', callback: () => this.showCrafting() });
    }

    // Camp shop (requires shop >= 1)
    if (this.state.baseLevel.shop >= 1) {
      actions.push({ text: '🏪 商店', callback: () => this.showCampShop() });
    }

    // NPCs
    for (const npcId of this.state.campNpcs) {
      const npc = NPCS[npcId];
      if (npc) {
        actions.push({ text: `${npc.icon} ${npc.name}`, callback: () => this.showNpcDialog(npcId) });
      }
    }

    // Jobs & Skills
    actions.push({
      text: `🎭 职业转换`,
      callback: () => this.showJobMenu(),
    });
    actions.push({
      text: `⚡ 技能${this.state.skillPoints > 0 ? ` (${this.state.skillPoints}点可用)` : ''}`,
      callback: () => this.showSkillsPage(),
    });

    // Literature & Journal
    if (this.state.journalEntries.length > 0 || this.state.collectedLore.length > 0) {
      actions.push({ text: '📜 文献/记录', callback: () => this.showLiteratureMenu() });
    }

    // Karma status
    const karmaLabel = this.state.karma > 20 ? '善' : this.state.karma < -20 ? '恶' : '中立';
    actions.push({ text: `⚖️ 因果 (${this.state.karma} · ${karmaLabel})`, callback: () => this.showKarmaStatus() });

    actions.push({ text: '🏅 成就', callback: () => this.showAchievements() });
    actions.push({ text: '💾 存档', callback: () => this.showSaveManager() });

    setActions(actions);
  }

  // === Buildings Menu ===

  private showBuildingsMenu() {
    clearMessages();
    appendMessage('—— 🔨 建筑升级 ——', 'system');

    type BuildingKey = keyof typeof this.state.baseLevel;
    const buildings: { key: BuildingKey; icon: string; name: string; maxLv: number; costs: number[]; unlock: number; desc: string; effectPerLevel: string }[] = [
      { key: 'armory', icon: '⚔️', name: '武器库', maxLv: 5, costs: [30,60,100,150,200], unlock: 0, desc: '强化武器装备', effectPerLevel: '基础攻击力 +2' },
      { key: 'shelter', icon: '🛖', name: '避难所', maxLv: 5, costs: [30,60,100,150,200], unlock: 0, desc: '加固营地防御', effectPerLevel: '最大HP +5' },
      { key: 'kitchen', icon: '🍳', name: '厨房', maxLv: 5, costs: [30,60,100,150,200], unlock: 0, desc: '改善伙食条件', effectPerLevel: '最大体力 +15' },
      { key: 'warehouse', icon: '🗄️', name: '仓库', maxLv: 3, costs: [60,120,240], unlock: 2, desc: '扩大存储空间', effectPerLevel: '背包 +4格' },
      { key: 'workbench', icon: '🔬', name: '工作台', maxLv: 3, costs: [80,160,300], unlock: 3, desc: '制作物品', effectPerLevel: '解锁更高级配方' },
      { key: 'clinic', icon: '🏥', name: '医疗站', maxLv: 3, costs: [80,160,300], unlock: 3, desc: '医疗设施', effectPerLevel: '休息回复量翻倍' },
      { key: 'signalTower', icon: '📡', name: '信号塔', maxLv: 3, costs: [100,200,400], unlock: 5, desc: '探测周围环境', effectPerLevel: '进入地牢多揭示1个房间' },
      { key: 'shop', icon: '🏪', name: '商铺', maxLv: 3, costs: [100,200,400], unlock: 5, desc: '营地交易所', effectPerLevel: '增加商品种类' },
    ];

    // Show building details as text
    for (const b of buildings) {
      const lv = this.state.baseLevel[b.key];
      if (this.state.maxFloorReached < b.unlock) {
        appendMessage(`🔒 ${b.name} — 到达${b.unlock}F解锁`, 'system');
      } else if (lv >= b.maxLv) {
        appendMessage(`${b.icon} ${b.name} Lv.${lv} — 已满级`, 'loot');
      } else {
        appendMessage(`${b.icon} ${b.name} Lv.${lv} — ${b.effectPerLevel}`, 'narrator');
      }
    }

    appendMessage('', 'divider');
    appendMessage('选择要升级的建筑：', 'system');

    const actions: ActionButton[] = [];

    for (const b of buildings) {
      const lv = this.state.baseLevel[b.key];
      if (this.state.maxFloorReached < b.unlock) continue; // Don't show locked buildings as buttons
      if (lv >= b.maxLv) continue; // Don't show maxed buildings as buttons

      const cost = b.costs[lv];
      actions.push({
        text: `${b.icon} ${b.name} → Lv${lv + 1} (${cost}💰)`,
        disabled: this.state.gold < cost,
        callback: () => this.upgradeBuilding(b.key, b.name, cost),
      });
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  private upgradeBuilding(key: string, name: string, cost: number) {
    this.state.gold -= cost;
    (this.state.baseLevel as unknown as Record<string, number>)[key]++;
    const lv = (this.state.baseLevel as unknown as Record<string, number>)[key];
    appendMessage(`🔨 ${name}升级到 Lv.${lv}！`, 'loot');

    switch (key) {
      case 'armory':
        appendMessage(`⚔️ 基础攻击力 +2`, 'system');
        break;
      case 'kitchen':
        this.state.maxStamina += 15;
        this.state.stamina = Math.min(this.state.stamina + 15, this.state.maxStamina);
        appendMessage(`🍖 最大体力度 +15`, 'system');
        break;
      case 'shelter': {
        // FIX C1: recalculate from clean base, no double-counting
        const newMaxHp = this.state.maxHpBase + this.state.baseLevel.shelter * 5;
        this.state.party[0].maxHp = newMaxHp;
        this.state.party[0].hp = Math.min(this.state.party[0].hp + 5, this.state.party[0].maxHp);
        appendMessage(`❤️ 最大生命 +5`, 'system');
      }
        break;
      case 'warehouse':
        this.state.inventorySlots = calcInventorySlots(this.state);
        appendMessage(`🗄️ 背包容量 → ${this.state.inventorySlots} 格`, 'system');
        break;
      case 'workbench':
        appendMessage(`🔬 工作台升级！可制作更高级的物品。`, 'system');
        break;
      case 'clinic':
        appendMessage(`🏥 医疗站升级！营地休息回复量提升。`, 'system');
        break;
      case 'signalTower':
        appendMessage(`📡 信号塔升级！进入地牢时能预先探测更多房间。`, 'system');
        break;
      case 'shop':
        appendMessage(`🏪 商铺升级！商品种类增加。`, 'system');
        break;
    }

    updateStatusBar(this.state);
    this.showBuildingsMenu();
  }

  private rest() {
    // Advance day
    this.state.day++;
    // Full stamina restore
    this.state.stamina = this.state.maxStamina;
    // Clinic multiplier: base heal * (1 + clinic level)
    const clinicBonus = 1 + this.state.baseLevel.clinic;
    const heal = (5 + this.state.baseLevel.shelter * 3) * clinicBonus;
    // Heal all alive party members
    for (const m of this.state.party) {
      if (m.isAlive) {
        m.hp = Math.min(m.maxHp, m.hp + heal);
        m.mp = m.maxMp; // Full MP restore on rest
      }
    }
    // Revive fallen members at 1 HP
    for (const m of this.state.party) {
      if (!m.isAlive) {
        m.isAlive = true;
        m.hp = 1;
        appendMessage(`${m.name} 恢复了意识 (1 HP)`, 'loot');
      }
    }
    appendMessage(`夜幕降临，你休息了一晚。⏰ 第${this.state.day}天`, 'narrator');
    appendMessage(`❤️ 全员 +${heal} HP | 🍖 体力恢复满 | 💎 MP恢复满`, 'loot');
    if (this.state.baseLevel.clinic > 0) {
      appendMessage(`🏥 医疗站效果：回复量 x${clinicBonus}`, 'system');
    }
    // Check day-based unlocks
    this.refreshNodeUnlocks();
    const newUnlocks = Object.values(WORLD_NODES).filter(n =>
      n.unlockCondition.type === 'day' &&
      this.state.day >= (n.unlockCondition.value as number) &&
      !this.state.unlockedNodeIds.includes(n.id)
    );
    for (const n of newUnlocks) {
      this.state.unlockedNodeIds.push(n.id);
      appendMessage(`🗺️ 新地点已解锁：${n.icon} ${n.name}`, 'event');
    }
    // Day-threshold companion recruitment (old_chen)
    for (const comp of Object.values(COMPANIONS)) {
      if (comp.recruitCondition.type === 'day_threshold' && this.state.day >= (comp.recruitCondition.value as number)) {
        const alreadyHave = this.state.party.some(m => m.id === comp.id) || this.state.companions.some(m => m.id === comp.id);
        if (!alreadyHave) {
          const member: PartyMember = {
            id: comp.id, companionId: comp.id, name: comp.name, level: 1, exp: 0,
            hp: comp.baseStats.hp, maxHp: comp.baseStats.hp,
            mp: comp.baseStats.mp, maxMp: comp.baseStats.mp,
            baseAttack: comp.baseStats.attack, baseDefense: comp.baseStats.defense, speed: comp.baseStats.speed,
            currentJobId: comp.defaultJobId, jobLevels: { [comp.defaultJobId]: 1 }, sp: 0,
            equipment: { weapon: null, armor: null, accessory: null },
            learnedSkills: [], equippedSkills: [], statusEffects: [], isAlive: true,
          };
          if (this.state.party.length < 4) {
            this.state.party.push(member);
            appendMessage(`${comp.icon} ${comp.name}来到了营地，加入了队伍！`, 'loot');
          } else {
            this.state.companions.push(member);
            appendMessage(`${comp.icon} ${comp.name}来到了营地！（后备队伍）`, 'loot');
          }
          appendMessage(`  "${comp.desc}"`, 'narrator');
        }
      }
    }
    updateStatusBar(this.state);
    saveState(this.state);
    this.showBaseActions();
  }

  private eat() {
    // Kitchen provides meals: cost gold, restore hunger
    const kitchenLv = this.state.baseLevel.kitchen;
    const restore = 30 + kitchenLv * 10;
    const cost = Math.max(3, 8 - kitchenLv);
    this.state.gold -= cost;
    this.state.stamina = Math.min(this.state.maxStamina, this.state.stamina + restore);
    appendMessage(`你吃了一顿饭。🍖 +${restore} 体力 (${cost}💰)`, 'narrator');
    if (kitchenLv > 0) {
      appendMessage(`🍳 厨房 Lv.${kitchenLv}：饭菜更丰盛了`, 'system');
    }
    updateStatusBar(this.state);
    this.showBaseActions();
  }

  // === Crafting ===

  private showCrafting() {
    clearMessages();
    appendMessage(`—— 🔬 制作 (工作台 Lv.${this.state.baseLevel.workbench}) ——`, 'system');

    const actions: ActionButton[] = [];

    for (const recipeId of this.state.knownRecipes) {
      const recipe = RECIPES[recipeId];
      if (!recipe) continue;

      const levelOk = this.state.baseLevel.workbench >= recipe.minLevel;
      const materialsOk = recipe.materials.every(([matId, count]) => {
        const inv = this.state.inventory.find(i => i.id === matId);
        return inv && inv.count >= count;
      });

      const matDesc = recipe.materials.map(([matId, count]) => {
        const def = ITEMS[matId];
        const have = this.state.inventory.find(i => i.id === matId)?.count ?? 0;
        return `${def?.name ?? matId}${have}/${count}`;
      }).join(' ');

      if (!levelOk) {
        actions.push({
          text: `🔒 ${recipe.name} (需工作台Lv${recipe.minLevel})`,
          disabled: true,
          callback: () => {},
        });
      } else {
        actions.push({
          text: `${recipe.name} [${matDesc}]`,
          disabled: !materialsOk || isInventoryFull(this.state),
          callback: () => {
            // Consume materials
            for (const [matId, count] of recipe.materials) {
              removeItem(this.state, matId, count);
            }
            // Produce output
            if (addItem(this.state, recipe.output, recipe.outputCount)) {
              const outDef = ITEMS[recipe.output];
              appendMessage(`✅ 制作成功：${outDef?.icon ?? ''} ${outDef?.name ?? recipe.output} x${recipe.outputCount}`, 'loot');
            } else {
              appendMessage('背包已满！', 'combat');
            }
            updateStatusBar(this.state);
            this.showCrafting();
          },
        });
      }
    }

    if (actions.length === 0) {
      appendMessage('你还没有配方。探索废墟时可能会找到。', 'narrator');
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  // === Camp Shop ===

  private itemEffectSummary(def: typeof ITEMS[string]): string {
    if (def.type === 'weapon') return `攻击+${def.attack}`;
    if (def.type === 'armor') return `防御+${def.defense}`;
    if (def.type === 'consumable') {
      const parts: string[] = [];
      if (def.hpRestore) parts.push(`HP+${def.hpRestore}`);
      if (def.hungerRestore) parts.push(def.hungerRestore > 0 ? `体力+${def.hungerRestore}` : `体力${def.hungerRestore}`);
      return parts.join(' ') || def.desc;
    }
    return def.desc;
  }

  private showCampShop() {
    clearMessages();
    appendMessage(`—— 🏪 营地商店 (Lv.${this.state.baseLevel.shop}) ——`, 'system');

    const shopLv = this.state.baseLevel.shop;
    const stock: string[] = [];
    for (let lv = 1; lv <= shopLv; lv++) {
      const items = CAMP_SHOP_STOCK[lv];
      if (items) stock.push(...items);
    }

    // Display item list with descriptions
    for (const itemId of stock) {
      const def = ITEMS[itemId];
      if (!def) continue;
      const price = Math.ceil(def.price * 1.2);
      appendMessage(`${def.icon} ${def.name} — ${this.itemEffectSummary(def)} (${price}💰)`, 'narrator');
    }

    const actions: ActionButton[] = [];

    for (const itemId of stock) {
      const def = ITEMS[itemId];
      if (!def) continue;
      const price = Math.ceil(def.price * 1.2);
      actions.push({
        text: `${def.icon} ${def.name} ${this.itemEffectSummary(def)} (${price}💰)`,
        disabled: this.state.gold < price || isInventoryFull(this.state),
        callback: () => {
          this.state.gold -= price;
          if (addItem(this.state, itemId)) {
            appendMessage(`🛒 购买了【${def.name}】`, 'loot');
          } else {
            appendMessage('背包已满！', 'combat');
            this.state.gold += price;
          }
          updateStatusBar(this.state);
          this.showCampShop();
        },
      });
    }

    // Premium rotating stock (2 random picks, seeded by turns for consistency within session)
    if (shopLv >= 2) {
      appendMessage('—— 稀有商品 ——', 'system');
      const seed = this.state.turns;
      const pool = [...PREMIUM_SHOP_POOL];
      const picks: typeof PREMIUM_SHOP_POOL = [];
      for (let i = 0; i < Math.min(2, pool.length); i++) {
        const idx = (seed * 7 + i * 13) % pool.length;
        picks.push(pool.splice(idx % pool.length, 1)[0]);
      }
      for (const p of picks) {
        const def = ITEMS[p.itemId];
        if (!def) continue;
        appendMessage(`⭐ ${def.icon} ${def.name} — ${this.itemEffectSummary(def)} (${p.price}💰)`, 'narrator');
        actions.push({
          text: `⭐ ${def.icon} ${def.name} ${this.itemEffectSummary(def)} (${p.price}💰)`,
          disabled: this.state.gold < p.price || isInventoryFull(this.state),
          callback: () => {
            this.state.gold -= p.price;
            if (addItem(this.state, p.itemId)) {
              appendMessage(`🛒 购买了稀有商品【${def.name}】`, 'loot');
            } else {
              appendMessage('背包已满！', 'combat');
              this.state.gold += p.price;
            }
            updateStatusBar(this.state);
            this.showCampShop();
          },
        });
      }
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  // === NPC Dialogue ===

  private showNpcDialog(npcId: string) {
    const npc = NPCS[npcId];
    if (!npc) return;

    clearMessages();
    appendMessage(`—— ${npc.icon} ${npc.name} ——`, 'system');

    const progress = this.state.npcProgress[npcId] ?? 0;

    if (progress >= npc.dialogues.length) {
      appendMessage(`${npc.name}没有更多话要说了。`, 'narrator');
      setActions([{ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } }]);
      return;
    }

    const dialogue = npc.dialogues[progress];
    appendMessage(dialogue.text, 'narrator');

    // Apply dialogue effects
    if (dialogue.gold) {
      if (dialogue.gold > 0) {
        this.state.gold += dialogue.gold;
        appendMessage(`💰 +${dialogue.gold}`, 'loot');
      } else {
        if (this.state.gold < Math.abs(dialogue.gold)) {
          appendMessage(`💰 金币不足。`, 'combat');
          setActions([{ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } }]);
          return;
        }
        this.state.gold += dialogue.gold;
        appendMessage(`💸 ${dialogue.gold}`, 'combat');
      }
    }
    if (dialogue.hp) {
      this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + dialogue.hp);
      appendMessage(`❤️ +${dialogue.hp} HP`, 'loot');
    }
    if (dialogue.item) {
      const def = ITEMS[dialogue.item];
      if (def && addItem(this.state, dialogue.item)) {
        appendMessage(`🎁 ${npc.name}给了你【${def.name}】`, 'loot');
      }
    }
    if (dialogue.recipe && !this.state.knownRecipes.includes(dialogue.recipe)) {
      this.state.knownRecipes.push(dialogue.recipe);
      const recipeDef = RECIPES[dialogue.recipe];
      appendMessage(`📋 学会了配方：${recipeDef?.name ?? dialogue.recipe}`, 'loot');
    }
    if (dialogue.journal && !this.state.journalEntries.includes(dialogue.journal)) {
      this.state.journalEntries.push(dialogue.journal);
      const entry = JOURNAL_ENTRIES.find(j => j.id === dialogue.journal);
      if (entry) {
        appendMessage(`📜 获得日志：【${entry.title}】`, 'event');
      }
    }

    // Advance progress
    this.state.npcProgress[npcId] = progress + 1;
    updateStatusBar(this.state);
    saveState(this.state);

    const actions: ActionButton[] = [
      {
        text: '💬 继续',
        primary: true,
        disabled: progress + 1 >= npc.dialogues.length,
        callback: () => this.showNpcDialog(npcId),
      },
    ];

    // Show available quests from this NPC
    const npcQuests = NPC_QUESTS.filter(q => q.npcId === npcId);
    for (const quest of npcQuests) {
      if (this.state.completedQuests.includes(quest.id)) continue;
      if (this.state.activeQuests.includes(quest.id)) {
        // Check completion
        const done = this.isQuestComplete(quest);
        actions.push({
          text: done ? `✅ 交付：${quest.name}` : `📋 ${quest.name}（进行中）`,
          primary: done,
          disabled: !done,
          callback: () => this.completeQuest(quest),
        });
      } else {
        actions.push({
          text: `📌 委托：${quest.name}`,
          callback: () => this.acceptQuest(quest),
        });
      }
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  private isQuestComplete(quest: typeof NPC_QUESTS[0]): boolean {
    const req = quest.requirement;
    switch (req.type) {
      case 'collect': {
        const inv = this.state.inventory.find(i => i.id === req.itemId);
        return (inv?.count ?? 0) >= req.count;
      }
      case 'kill':
        return (this.state.questKills[req.enemyId] ?? 0) >= req.count;
      case 'reach_floor':
        return this.state.maxFloorReached >= req.floor;
    }
  }

  private acceptQuest(quest: typeof NPC_QUESTS[0]) {
    this.state.activeQuests.push(quest.id);
    // Reset kill counter for this quest's enemy if kill-type
    if (quest.requirement.type === 'kill') {
      this.state.questKills[quest.requirement.enemyId] = 0;
    }
    clearMessages();
    const npc = NPCS[quest.npcId];
    appendMessage(`${npc?.icon ?? ''} ${npc?.name ?? ''}的委托`, 'system');
    appendMessage(`📌 接受委托：${quest.name}`, 'loot');
    appendMessage(quest.desc, 'narrator');
    const req = quest.requirement;
    if (req.type === 'collect') appendMessage(`目标：收集 ${ITEMS[req.itemId]?.name ?? req.itemId} ×${req.count}`, 'system');
    if (req.type === 'kill') appendMessage(`目标：击杀 ${ENEMIES[req.enemyId]?.name ?? req.enemyId} ×${req.count}`, 'system');
    if (req.type === 'reach_floor') appendMessage(`目标：到达第 ${req.floor} 层`, 'system');
    saveState(this.state);
    setActions([{ text: '🔙 返回', callback: () => this.showNpcDialog(quest.npcId) }]);
  }

  private completeQuest(quest: typeof NPC_QUESTS[0]) {
    // Consume collected items if collect-type
    if (quest.requirement.type === 'collect') {
      removeItem(this.state, quest.requirement.itemId, quest.requirement.count);
    }
    // Mark completed
    this.state.activeQuests = this.state.activeQuests.filter(id => id !== quest.id);
    this.state.completedQuests.push(quest.id);
    // Award rewards
    clearMessages();
    const npc = NPCS[quest.npcId];
    appendMessage(`${npc?.icon ?? ''} ${npc?.name ?? ''}`, 'system');
    appendMessage(`✅ 完成委托：${quest.name}！`, 'loot');
    const r = quest.reward;
    if (r.gold) { this.state.gold += r.gold; appendMessage(`💰 +${r.gold}`, 'loot'); }
    if (r.skillPoints) { this.state.skillPoints += r.skillPoints; appendMessage(`🌟 +${r.skillPoints} 技能点`, 'loot'); }
    if (r.item) {
      const def = ITEMS[r.item];
      if (def && addItem(this.state, r.item)) appendMessage(`🎁 获得【${def.name}】`, 'loot');
    }
    if (r.recipe && !this.state.knownRecipes.includes(r.recipe)) {
      this.state.knownRecipes.push(r.recipe);
      const recipeDef = RECIPES[r.recipe];
      appendMessage(`📋 学会了配方：${recipeDef?.name ?? r.recipe}`, 'loot');
    }
    updateStatusBar(this.state);
    saveState(this.state);
    setActions([{ text: '🔙 返回', callback: () => this.showNpcDialog(quest.npcId) }]);
  }

  // === Journal ===

  private showJournal() {
    clearMessages();
    const total = JOURNAL_ENTRIES.length;
    const collected = this.state.journalEntries.length;
    appendMessage(`—— 📜 记录 (${collected}/${total}) ——`, 'system');

    // Milestone rewards
    const milestones = [
      { count: 5,  reward: '💰 +30', claimed: 'journal_m5' },
      { count: 10, reward: '🌟 +1 技能点', claimed: 'journal_m10' },
      { count: 15, reward: '🎁 肾上腺素针', claimed: 'journal_m15' },
      { count: 20, reward: '🏆 全收集！💰 +100 🌟 +3', claimed: 'journal_m20' },
    ];
    for (const m of milestones) {
      const isClaimed = this.state.completedQuests.includes(m.claimed);
      if (collected >= m.count && !isClaimed) {
        appendMessage(`🎉 里程碑达成：收集 ${m.count} 条记录！奖励: ${m.reward}`, 'loot');
        this.state.completedQuests.push(m.claimed);
        if (m.count === 5) this.state.gold += 30;
        if (m.count === 10) this.state.skillPoints += 1;
        if (m.count === 15) addItem(this.state, 'revival_syringe');
        if (m.count === 20) { this.state.gold += 100; this.state.skillPoints += 3; }
        updateStatusBar(this.state);
        saveState(this.state);
      }
      const status = isClaimed ? '✅' : collected >= m.count ? '🎉' : `${collected}/${m.count}`;
      appendMessage(`${status} 收集 ${m.count} 条 → ${m.reward}`, 'system');
    }
    appendMessage('', 'divider');

    if (collected === 0) {
      appendMessage('还没有收集到任何记录。', 'narrator');
    } else {
      for (const entryId of this.state.journalEntries) {
        const entry = JOURNAL_ENTRIES.find(j => j.id === entryId);
        if (entry) {
          appendMessage(`【${entry.title}】`, 'event');
          appendMessage(entry.content, 'narrator');
          appendMessage('', 'divider');
        }
      }
    }

    setActions([{ text: '🔙 返回', callback: () => { clearMessages(); this.showLiteratureMenu(); } }]);
  }

  // === Literature & Puzzle System (Phase 7) ===

  private showLiteratureMenu() {
    clearMessages();
    const loreCount = this.state.collectedLore.length;
    const totalLore = Object.keys(LORE_FRAGMENTS).length;
    const journalCount = this.state.journalEntries.length;

    appendMessage(`—— 📜 文献/记录 ——`, 'system');
    appendMessage(`文献碎片：${loreCount}/${totalLore} | 旧日志：${journalCount}`, 'system');

    // Show discovered weaknesses
    if (this.state.discoveredWeaknesses.length > 0) {
      appendMessage('', 'divider');
      appendMessage('已发现的弱点：', 'system');
      for (const wid of this.state.discoveredWeaknesses) {
        const w = BOSS_WEAKNESSES[wid];
        if (w) appendMessage(`  ⚠️ ${w.name} — ${w.effectType === 'item' ? `使用${ITEMS[w.effectValue]?.name ?? w.effectValue}` : `使用技能${SKILLS[w.effectValue]?.name ?? w.effectValue}`} 伤害x${w.damageMultiplier}`, 'loot');
      }
    }

    appendMessage('', 'divider');

    const actions: ActionButton[] = [];

    // View lore fragments
    if (loreCount > 0) {
      actions.push({
        text: `📖 查看文献碎片 (${loreCount})`,
        callback: () => {
          clearMessages();
          appendMessage('—— 📖 文献碎片 ——', 'system');
          for (const loreId of this.state.collectedLore) {
            const lore = LORE_FRAGMENTS[loreId];
            if (lore) {
              appendMessage(`【${lore.title}】(${lore.category})`, 'event');
              appendMessage(lore.content, 'narrator');
              appendMessage('', 'divider');
            }
          }
          setActions([{ text: '🔙 返回', callback: () => this.showLiteratureMenu() }]);
        },
      });
    }

    // View old journals
    if (journalCount > 0) {
      actions.push({
        text: `📜 旧日志 (${journalCount})`,
        callback: () => this.showJournal(),
      });
    }

    // Attempt puzzles
    const availablePuzzles = Object.values(PUZZLES).filter(
      p => !this.state.solvedPuzzles.includes(p.id)
    );
    if (availablePuzzles.length > 0) {
      actions.push({
        text: `🧩 谜题 (${availablePuzzles.length}个可尝试)`,
        callback: () => this.showPuzzleMenu(),
      });
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  private showPuzzleMenu() {
    clearMessages();
    appendMessage('—— 🧩 谜题 ——', 'system');
    appendMessage('使用收集到的文献碎片来解开谜题。', 'narrator');
    appendMessage('', 'divider');

    const actions: ActionButton[] = [];

    for (const puzzle of Object.values(PUZZLES)) {
      if (this.state.solvedPuzzles.includes(puzzle.id)) continue;

      const hasAllLore = puzzle.requiredLoreIds.every(
        id => this.state.collectedLore.includes(id)
      );
      const missingCount = puzzle.requiredLoreIds.filter(
        id => !this.state.collectedLore.includes(id)
      ).length;

      if (hasAllLore) {
        actions.push({
          text: `🧩 ${puzzle.name} ✓可解`,
          primary: true,
          callback: () => this.solvePuzzle(puzzle.id),
        });
      } else {
        actions.push({
          text: `🧩 ${puzzle.name} (缺${missingCount}条线索)`,
          disabled: true,
          callback: () => {},
        });
      }
    }

    actions.push({ text: '🔙 返回', callback: () => this.showLiteratureMenu() });
    setActions(actions);
  }

  private solvePuzzle(puzzleId: string) {
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) return;

    clearMessages();
    appendMessage(`—— 🧩 ${puzzle.name} ——`, 'system');
    appendMessage(puzzle.desc, 'narrator');
    appendMessage('', 'divider');
    appendMessage('你将收集到的线索拼凑在一起……', 'narrator');
    appendMessage('', 'divider');
    appendMessage(`🎉 谜题解开了！`, 'loot');

    this.state.solvedPuzzles.push(puzzleId);

    // Apply rewards
    const r = puzzle.rewards;
    if (r.gold) {
      this.state.gold += r.gold;
      appendMessage(`💰 +${r.gold} 金币`, 'loot');
    }
    if (r.exp) {
      this.state.party[0].exp += r.exp;
      appendMessage(`📊 +${r.exp} 经验值`, 'loot');
      this.checkJobLevelUp();
    }
    if (r.items) {
      for (const item of r.items) {
        if (addItem(this.state, item.id, item.count)) {
          appendMessage(`🎁 获得【${ITEMS[item.id]?.name ?? item.id}】x${item.count}`, 'loot');
        }
      }
    }
    if (r.unlockNodes) {
      for (const nid of r.unlockNodes) {
        if (!this.state.unlockedNodeIds.includes(nid)) {
          this.state.unlockedNodeIds.push(nid);
          const node = WORLD_NODES[nid];
          appendMessage(`🗺️ 新地点解锁：${node?.icon ?? ''} ${node?.name ?? nid}`, 'event');
        }
      }
    }
    if (r.revealWeakness) {
      if (!this.state.discoveredWeaknesses.includes(r.revealWeakness)) {
        this.state.discoveredWeaknesses.push(r.revealWeakness);
        const w = BOSS_WEAKNESSES[r.revealWeakness];
        if (w) {
          appendMessage(`⚠️ 发现了弱点：${w.name}！`, 'event');
        }
      }
    }

    updateStatusBar(this.state);
    saveState(this.state);

    setActions([{ text: '🔙 返回', callback: () => this.showLiteratureMenu() }]);
  }

  // === Karma Status ===

  private showKarmaStatus() {
    clearMessages();
    const k = this.state.karma;
    const tier = k >= 50 ? '圣者' : k >= 20 ? '善人' : k > -20 ? '中立' : k > -50 ? '恶人' : '堕落者';
    appendMessage(`—— ⚖️ 因果系统 ——`, 'system');
    appendMessage(`当前因果值: ${k} (${tier})`, 'narrator');
    appendMessage('', 'divider');

    if (k >= 50) {
      appendMessage('你的善行已被世人铭记。有些人愿意主动帮助你。', 'event');
    } else if (k >= 20) {
      appendMessage('你是个好人，废土中的人们信任你。', 'event');
    } else if (k > -20) {
      appendMessage('你既不善也不恶，只是一个努力活下去的人。', 'event');
    } else if (k > -50) {
      appendMessage('你的所作所为让人畏惧。有些人会拒绝与你合作。', 'event');
    } else {
      appendMessage('黑暗笼罩着你。你的名字成了恐惧的代名词。', 'event');
    }

    appendMessage('', 'divider');
    appendMessage('因果影响:', 'system');
    appendMessage('· 因果值影响NPC态度和部分事件选项', 'narrator');
    appendMessage('· 极端因果值可解锁特殊节点和结局', 'narrator');
    appendMessage('· 部分同伴只会加入善良/邪恶的队伍', 'narrator');

    if (this.state.karmaHistory.length > 0) {
      appendMessage('', 'divider');
      appendMessage('最近因果记录:', 'system');
      const recent = this.state.karmaHistory.slice(-5);
      for (const entry of recent) {
        const sign = entry.karmaChange > 0 ? '+' : '';
        appendMessage(`  第${entry.day}天: ${sign}${entry.karmaChange}`, entry.karmaChange > 0 ? 'loot' : 'combat');
      }
    }

    setActions([{ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } }]);
  }

  // === Skills Page ===

  private getAchievementStats(): AchievementStats {
    const bl = this.state.baseLevel;
    const buildSum = bl.armory + bl.kitchen + bl.shelter + bl.workbench + bl.clinic + bl.signalTower + bl.shop + bl.warehouse;
    // Filter out journal milestone IDs from quest count
    const realQuests = this.state.completedQuests.filter(id => id.startsWith('q_'));
    return {
      maxFloorReached: this.state.maxFloorReached,
      totalKills: this.state.lifetimeKills,
      totalDeaths: this.state.lifetimeDeaths,
      totalGoldEarned: this.state.lifetimeGold,
      bossKills: this.state.lifetimeBossKills,
      journalCount: this.state.journalEntries.length,
      maxBuildingLevel: buildSum,
      skillCount: this.state.skills.length,
      completedQuests: realQuests.length,
    };
  }

  private showAchievements() {
    clearMessages();
    const stats = this.getAchievementStats();
    const unlocked = this.state.unlockedAchievements;
    const total = ACHIEVEMENTS.length;
    const done = unlocked.length;
    appendMessage(`—— 🏅 成就 (${done}/${total}) ——`, 'system');

    let newUnlocks = false;
    for (const ach of ACHIEVEMENTS) {
      const wasUnlocked = unlocked.includes(ach.id);
      const isComplete = ach.check(stats);

      if (isComplete && !wasUnlocked) {
        // Newly unlocked!
        unlocked.push(ach.id);
        newUnlocks = true;
        appendMessage(`🎉 新成就解锁！${ach.icon} ${ach.name}`, 'loot');
        if (ach.reward) {
          if (ach.reward.gold) { this.state.gold += ach.reward.gold; appendMessage(`  💰 +${ach.reward.gold}`, 'loot'); }
          if (ach.reward.skillPoints) { this.state.skillPoints += ach.reward.skillPoints; appendMessage(`  🌟 +${ach.reward.skillPoints} 技能点`, 'loot'); }
        }
      }

      const status = unlocked.includes(ach.id) ? '✅' : '🔒';
      const rewardText = ach.reward ? ` → ${[ach.reward.gold ? `${ach.reward.gold}💰` : '', ach.reward.skillPoints ? `${ach.reward.skillPoints}SP` : ''].filter(Boolean).join(' ')}` : '';
      appendMessage(`${status} ${ach.icon} ${ach.name} — ${ach.desc}${rewardText}`, unlocked.includes(ach.id) ? 'system' : 'narrator');
    }

    if (newUnlocks) {
      updateStatusBar(this.state);
      saveState(this.state);
    }

    setActions([{ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } }]);
  }

  // ==================== JOB SYSTEM ====================

  private showJobMenu(selectedJobId?: string) {
    clearMessages();
    const p = this.state.party[0];
    const currentJob = JOBS[p.currentJobId];
    const jobLv = p.jobLevels[p.currentJobId] ?? 1;

    appendMessage(`—— 🎭 职业系统 ——`, 'system');
    appendMessage(`当前职业：${currentJob?.icon ?? '?'} ${currentJob?.name ?? p.currentJobId} Lv.${jobLv}`, 'narrator');
    appendMessage(`SP: ${p.sp} | 技能点: ${this.state.skillPoints}`, 'system');

    // Show current job skills
    if (currentJob) {
      const unlocked = currentJob.skillUnlocks.filter(u => jobLv >= u.jobLevel);
      const locked = currentJob.skillUnlocks.filter(u => jobLv < u.jobLevel);
      if (unlocked.length > 0) {
        appendMessage('已解锁技能：', 'system');
        for (const u of unlocked) {
          const s = SKILLS[u.skillId];
          if (s) appendMessage(`  ${s.icon} ${s.name} — ${s.desc}`, 'narrator');
        }
      }
      if (locked.length > 0) {
        appendMessage('未解锁：', 'system');
        for (const u of locked) {
          const s = SKILLS[u.skillId];
          if (s) appendMessage(`  Lv.${u.jobLevel} → ${s.icon} ${s.name}`, 'system');
        }
      }
    }

    // Selected job detail
    if (selectedJobId && selectedJobId !== p.currentJobId) {
      const job = JOBS[selectedJobId];
      if (job) {
        appendMessage('', 'divider');
        appendMessage(`${job.icon} ${job.name}`, 'event');
        appendMessage(job.desc, 'narrator');
        appendMessage(`转职消耗：${job.spCost} SP`, 'system');
        appendMessage(`成长：HP+${job.growth.hp} MP+${job.growth.mp} ATK+${job.growth.attack} DEF+${job.growth.defense} SPD+${job.growth.speed}`, 'system');

        // Check prerequisites
        const prereqMet = job.prerequisiteJobs.every(
          req => (p.jobLevels[req.jobId] ?? 0) >= req.level
        );
        const prereqStr = job.prerequisiteJobs.map(
          req => `${JOBS[req.jobId]?.name ?? req.jobId} Lv.${req.level}`
        ).join(', ');
        if (job.prerequisiteJobs.length > 0) {
          appendMessage(`前置条件：${prereqStr} ${prereqMet ? '✓' : '✗'}`, prereqMet ? 'loot' : 'combat');
        }

        const canChange = prereqMet && p.sp >= job.spCost;
        setActions([
          {
            text: canChange ? `🎭 转职为${job.name} (-${job.spCost}SP)` : `🎭 无法转职`,
            primary: canChange,
            disabled: !canChange,
            callback: () => {
              p.sp -= job.spCost;
              p.currentJobId = job.id;
              if (!p.jobLevels[job.id]) p.jobLevels[job.id] = 1;
              // Unlock job level 1 skills
              for (const u of job.skillUnlocks) {
                if ((p.jobLevels[job.id] ?? 1) >= u.jobLevel && !this.state.skills.includes(u.skillId)) {
                  this.state.skills.push(u.skillId);
                  const s = SKILLS[u.skillId];
                  appendMessage(`⚡ 学会了：${s?.icon ?? ''} ${s?.name ?? u.skillId}！`, 'loot');
                }
              }
              saveState(this.state);
              clearMessages();
              appendMessage(`🎭 转职成功！现在是 ${job.icon} ${job.name}！`, 'loot');
              this.showJobMenu();
            },
          },
          { text: '🔙 返回', callback: () => this.showJobMenu() },
        ]);
        return;
      }
    }

    // Job list
    appendMessage('', 'divider');
    appendMessage('可选职业：', 'system');

    const actions: ActionButton[] = [];
    for (const jobId of Object.keys(JOBS)) {
      const job = JOBS[jobId];
      const isCurrentJob = jobId === p.currentJobId;
      const lvl = p.jobLevels[jobId] ?? 0;
      const prereqMet = job.prerequisiteJobs.every(
        req => (p.jobLevels[req.jobId] ?? 0) >= req.level
      );

      if (isCurrentJob) {
        actions.push({ text: `${job.icon} ${job.name} Lv.${lvl} [当前]`, disabled: true, callback: () => {} });
      } else if (!prereqMet) {
        const prereqs = job.prerequisiteJobs.map(r => `${JOBS[r.jobId]?.name ?? r.jobId} Lv.${r.level}`).join(', ');
        actions.push({ text: `${job.icon} ${job.name} 🔒(需${prereqs})`, disabled: true, callback: () => {} });
      } else {
        actions.push({
          text: `${job.icon} ${job.name}${lvl > 0 ? ` Lv.${lvl}` : ''} (${job.spCost}SP)`,
          callback: () => this.showJobMenu(jobId),
        });
      }
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  /** Level up the current job when gaining exp — call after combat victory */
  private checkJobLevelUp() {
    const p = this.state.party[0];
    const job = JOBS[p.currentJobId];
    if (!job) return;
    const currentLv = p.jobLevels[p.currentJobId] ?? 1;
    // Simple exp threshold: level * 20
    const expNeeded = currentLv * 20;
    if (p.exp >= expNeeded && currentLv < 10) {
      p.exp -= expNeeded;
      p.jobLevels[p.currentJobId] = currentLv + 1;
      const newLv = currentLv + 1;
      // Apply growth
      p.maxHp += job.growth.hp;
      p.hp += job.growth.hp;
      p.maxMp += job.growth.mp;
      p.mp += job.growth.mp;
      p.baseAttack += job.growth.attack;
      p.baseDefense += job.growth.defense;
      p.speed += job.growth.speed;
      this.state.maxHpBase += job.growth.hp;
      appendMessage(`🎉 ${job.icon} ${job.name} 升级到 Lv.${newLv}！`, 'loot');
      appendMessage(`  HP+${job.growth.hp} MP+${job.growth.mp} ATK+${job.growth.attack} DEF+${job.growth.defense} SPD+${job.growth.speed}`, 'system');
      // Unlock new skills at this level
      for (const u of job.skillUnlocks) {
        if (newLv >= u.jobLevel && !this.state.skills.includes(u.skillId)) {
          this.state.skills.push(u.skillId);
          const s = SKILLS[u.skillId];
          appendMessage(`⚡ 学会了新技能：${s?.icon ?? ''} ${s?.name ?? u.skillId}！`, 'loot');
        }
      }
    }
  }

  private showSkillsPage(selectedId?: string) {
    clearMessages();
    appendMessage(`—— ⚡ 技能 (技能点: ${this.state.skillPoints}) ——`, 'system');

    // Show owned skills
    if (this.state.skills.length > 0) {
      appendMessage('【已学会】', 'system');
      for (const sid of this.state.skills) {
        const s = SKILLS[sid];
        if (s) appendMessage(`${s.icon} ${s.name}：${s.desc} (CD ${s.cooldown}回合)`, 'narrator');
      }
      appendMessage('', 'divider');
    }

    // If a skill is selected, show its detail + learn button
    if (selectedId) {
      const skill = SKILLS[selectedId];
      if (skill) {
        appendMessage(`${skill.icon} ${skill.name}`, 'event');
        appendMessage(`${skill.desc}`, 'narrator');
        appendMessage(`冷却：${skill.cooldown} 回合 | 消耗：${skill.pointCost} 技能点`, 'system');

        const canLearn = this.state.skillPoints >= skill.pointCost;
        setActions([
          {
            text: canLearn ? `⚡ 学习${skill.name}` : `⚡ 技能点不足`,
            primary: canLearn,
            disabled: !canLearn,
            callback: () => {
              this.state.skillPoints -= skill.pointCost;
              this.state.skills.push(selectedId);
              saveState(this.state);
              clearMessages();
              appendMessage(`⚡ 学会了：${skill.icon} ${skill.name}！`, 'loot');
              this.showSkillsPage();
            },
          },
          { text: '🔙 返回技能列表', callback: () => this.showSkillsPage() },
        ]);
        return;
      }
    }

    // Skill list
    const actions: ActionButton[] = [];

    for (const skillId of POINT_SKILLS) {
      const skill = SKILLS[skillId];
      if (!skill) continue;
      const owned = this.state.skills.includes(skillId);
      if (owned) {
        actions.push({ text: `${skill.icon} ${skill.name} ✓`, disabled: true, callback: () => {} });
      } else {
        actions.push({
          text: `${skill.icon} ${skill.name} (${skill.pointCost}点)`,
          callback: () => this.showSkillsPage(skillId),
        });
      }
    }

    // Exploration skills (only show owned ones)
    const ownedExploration = EXPLORATION_SKILLS.filter(id => this.state.skills.includes(id));
    if (ownedExploration.length > 0) {
      for (const skillId of ownedExploration) {
        const skill = SKILLS[skillId];
        actions.push({ text: `${skill.icon} ${skill.name} ✓`, disabled: true, callback: () => {} });
      }
    }

    actions.push({ text: '🔙 返回', callback: () => { clearMessages(); this.showBaseActions(); } });
    setActions(actions);
  }

  // ==================== SAVE MANAGER ====================

  private showSaveManager() {
    clearMessages();
    appendMessage('—— 💾 存档管理 ——', 'system');
    appendMessage('选择一个档位进行操作：', 'system');

    const meta = loadMeta();
    const actions: ActionButton[] = [];

    for (let i = 0; i < meta.totalSlots; i++) {
      const slot = meta.slots[i];
      const isCurrent = i === meta.activeSlot;

      if (slot?.occupied) {
        const time = slot.savedAt ? new Date(slot.savedAt).toLocaleDateString() : '';
        const label = `${isCurrent ? '▶ ' : ''}档位${i + 1}: ${slot.floor}F | 💰${slot.gold} | ${time}`;
        actions.push({
          text: label,
          primary: isCurrent,
          callback: () => this.showSlotActions(i),
        });
      } else {
        actions.push({
          text: `档位${i + 1}: 空`,
          callback: () => this.showSlotActions(i),
        });
      }
    }

    // Unlock new slot (IAP)
    if (meta.totalSlots < getMaxSlots()) {
      actions.push({
        text: `💎 解锁新档位 (¥6)`,
        callback: () => {
          showConfirm('确定要购买新档位吗？', () => {
            appendMessage('💎 购买中……', 'system');
            setTimeout(() => {
              if (unlockSlot()) {
                appendMessage('✅ 购买成功！新档位已解锁。', 'loot');
              } else {
                appendMessage('已达最大档位数。', 'system');
              }
              this.showSaveManager();
            }, 500);
          });
        },
      });
    } else {
      actions.push({ text: '💎 档位已满', disabled: true, callback: () => {} });
    }

    actions.push({
      text: '🔙 返回',
      callback: () => {
        clearMessages();
        this.showBaseActions();
      },
    });

    setActions(actions);
  }

  private showSlotActions(slotIdx: number) {
    clearMessages();
    const meta = loadMeta();
    const slot = meta.slots[slotIdx];
    const isCurrent = slotIdx === meta.activeSlot;
    const actions: ActionButton[] = [];

    if (slot?.occupied) {
      const time = slot.savedAt ? new Date(slot.savedAt).toLocaleDateString() : '';
      appendMessage(`—— 档位${slotIdx + 1} ——`, 'system');
      appendMessage(`楼层: ${slot.floor}F | 金币: 💰${slot.gold} | 回合: ${slot.turns} | 存档时间: ${time}`, 'system');
      if (isCurrent) appendMessage('▶ 这是当前使用的存档', 'system');

      // Save to this slot
      actions.push({
        text: '💾 保存到此档位',
        callback: () => {
          saveState(this.state, slotIdx);
          const m = loadMeta();
          m.activeSlot = slotIdx;
          saveMeta(m);
          clearMessages();
          appendMessage(`✅ 已保存到档位${slotIdx + 1}`, 'loot');
          this.showSaveManager();
        },
      });

      // Switch to this slot (only if not current)
      if (!isCurrent) {
        actions.push({
          text: '🔄 切换到此档位',
          callback: () => {
            showConfirm(`确定切换到档位${slotIdx + 1}吗？\n当前进度会自动保存。`, () => {
              saveState(this.state);
              const targetState = loadState(slotIdx);
              if (targetState) {
                this.state = targetState;
                const m = loadMeta();
                m.activeSlot = slotIdx;
                saveMeta(m);
                clearMessages();
                appendMessage(`✅ 已切换到档位${slotIdx + 1}`, 'loot');
                this.showBaseActions();
              }
            });
          },
        });
      }

      // Reset this slot
      actions.push({
        text: '📺 重置此档位 (看广告)',
        danger: true,
        callback: () => {
          showConfirm(`确定要重置档位${slotIdx + 1}吗？\n所有进度将被清除。`, () => {
            appendMessage('📺 广告加载中……', 'system');
            setTimeout(() => {
              clearSave(slotIdx);
              if (isCurrent) {
                this.state = createInitialState();
                saveState(this.state, slotIdx);
                clearMessages();
                appendMessage('✅ 广告播放完毕，存档已重置！', 'loot');
                this.start();
              } else {
                clearMessages();
                appendMessage('✅ 广告播放完毕，存档已重置！', 'loot');
                this.showSaveManager();
              }
            }, 1000);
          });
        },
      });
    } else {
      appendMessage(`—— 档位${slotIdx + 1}（空） ——`, 'system');
      appendMessage('这是一个空档位，可以保存当前进度或创建新存档。', 'system');

      // Save current progress to this empty slot
      actions.push({
        text: '💾 保存到此档位',
        callback: () => {
          saveState(this.state, slotIdx);
          clearMessages();
          appendMessage(`✅ 已保存到档位${slotIdx + 1}`, 'loot');
          this.showSaveManager();
        },
      });

      // Create new game in this slot
      actions.push({
        text: '🆕 在此档位开始新游戏',
        callback: () => {
          showConfirm(`确定在档位${slotIdx + 1}创建新存档吗？\n将切换到新存档。`, () => {
            const newState = createInitialState();
            saveState(newState, slotIdx);
            const m = loadMeta();
            m.activeSlot = slotIdx;
            saveMeta(m);
            this.state = newState;
            clearMessages();
            appendMessage(`✅ 在档位${slotIdx + 1}创建了新存档`, 'loot');
            this.start();
          });
        },
      });
    }

    actions.push({
      text: '🔙 返回存档列表',
      callback: () => this.showSaveManager(),
    });

    setActions(actions);
  }

  /** Add loot item with potential affix */
  private addLootItem(itemId: string): { added: boolean; name: string } {
    const def = ITEMS[itemId];
    if (!def) return { added: false, name: itemId };
    const affix = rollAffix(this.state.floor, def.type);
    if (affix) {
      // Items with affixes are unique — store with affix
      const inv: InventoryItem = { id: itemId, count: 1, affix };
      if (getInventoryUsed(this.state) + 1 > this.state.inventorySlots) return { added: false, name: def.name };
      // Check if same item+affix exists
      const existing = this.state.inventory.find(i => i.id === itemId && i.affix === affix);
      if (existing) {
        existing.count++;
      } else {
        this.state.inventory.push(inv);
      }
      const affixDef = AFFIXES[affix];
      return { added: true, name: `${affixDef.prefix}${def.name}` };
    }
    return { added: addItem(this.state, itemId), name: def.name };
  }

  // ==================== WORLD MAP ====================

  /** Check if a node should be unlocked based on its conditions */
  private isNodeUnlocked(node: WorldNode): boolean {
    if (this.state.unlockedNodeIds.includes(node.id)) return true;
    const cond = node.unlockCondition;
    switch (cond.type) {
      case 'none': return true;
      case 'clear_node': return this.state.clearedNodeIds.includes(cond.value as string);
      case 'day': return this.state.day >= (cond.value as number);
      case 'quest': return this.state.completedQuests.includes(cond.value as string);
      case 'karma': return Math.abs(this.state.karma) >= (cond.value as number);
      case 'lore_count': return this.state.collectedLore.length >= (cond.value as number);
      default: return false;
    }
  }

  /** Refresh which nodes are unlocked */
  private refreshNodeUnlocks() {
    for (const nodeId of Object.keys(WORLD_NODES)) {
      if (!this.state.unlockedNodeIds.includes(nodeId) && this.isNodeUnlocked(WORLD_NODES[nodeId])) {
        this.state.unlockedNodeIds.push(nodeId);
      }
    }
  }

  private showWorldMap() {
    this.refreshNodeUnlocks();
    clearMessages();
    appendMessage('—— 🗺️ 世界地图 ——', 'system');
    appendMessage(`当前位置：${WORLD_NODES[this.state.currentNodeId ?? 'camp']?.name ?? '营地'} | 体力：${this.state.stamina}/${this.state.maxStamina} | 第${this.state.day}天`, 'system');
    appendMessage('', 'divider');

    const currentNodeId = this.state.currentNodeId ?? 'camp';
    const currentNode = WORLD_NODES[currentNodeId];
    if (!currentNode) {
      this.showBaseActions();
      return;
    }

    // Show available destinations
    const destinations = currentNode.connections
      .filter(id => this.state.unlockedNodeIds.includes(id))
      .map(id => WORLD_NODES[id])
      .filter(Boolean);

    // Show locked connections as hints
    const lockedConns = currentNode.connections
      .filter(id => !this.state.unlockedNodeIds.includes(id))
      .map(id => WORLD_NODES[id])
      .filter(Boolean);

    if (destinations.length > 0) {
      appendMessage('可前往的地点：', 'system');
    }

    const actions: ActionButton[] = [];

    for (const dest of destinations) {
      const isCleared = this.state.clearedNodeIds.includes(dest.id);
      const costMultiplier = getHungerMultiplier(this.state);
      const staCost = dest.staminaCost * costMultiplier;
      const canTravel = this.state.stamina >= staCost;
      const clearedTag = isCleared ? ' ✓' : '';
      const bossTag = dest.bossId && !isCleared ? ' ⚠️BOSS' : '';

      actions.push({
        text: `${dest.icon} ${dest.name} (${staCost}体力)${clearedTag}${bossTag}`,
        primary: !isCleared && canTravel,
        disabled: !canTravel,
        callback: () => this.travelToNode(dest.id),
      });
    }

    for (const locked of lockedConns) {
      const cond = locked.unlockCondition;
      let hint = '???';
      if (cond.type === 'clear_node') hint = `通关${WORLD_NODES[cond.value as string]?.name ?? '?'}`;
      else if (cond.type === 'day') hint = `第${cond.value}天`;
      else if (cond.type === 'quest') hint = '完成特定任务';
      actions.push({
        text: `🔒 ${locked.icon} ${locked.name} (${hint})`,
        disabled: true,
        callback: () => {},
      });
    }

    // If at camp, show return button; otherwise show camp return
    if (currentNodeId === 'camp') {
      actions.push({ text: '🔙 返回营地', callback: () => { clearMessages(); this.showBaseActions(); } });
    } else {
      const campNode = WORLD_NODES['camp'];
      const campCost = (campNode?.staminaCost ?? 0) * getHungerMultiplier(this.state);
      actions.push({
        text: `🏕️ 返回营地 (${campCost}体力)`,
        primary: false,
        callback: () => {
          this.state.currentNodeId = 'camp';
          clearMessages();
          appendMessage('你返回了营地。', 'narrator');
          this.showBaseActions();
        },
      });
    }

    setActions(actions);
  }

  private travelToNode(nodeId: string) {
    const node = WORLD_NODES[nodeId];
    if (!node) return;

    // Deduct stamina
    const cost = node.staminaCost * getHungerMultiplier(this.state);
    this.state.stamina -= cost;
    this.state.currentNodeId = nodeId;

    if (this.state.stamina <= 0) {
      this.state.stamina = 0;
      this.state.party[0].hp -= 2;
      appendMessage('⚠️ 你精疲力竭…… (HP -2)', 'combat');
      if (this.state.party[0].hp <= 0) {
        this.onDeath();
        return;
      }
    }

    clearMessages();
    appendMessage(`你前往了 ${node.icon} ${node.name}……`, 'narrator');
    appendMessage(node.desc, 'narrator');

    updateStatusBar(this.state);
    saveState(this.state);

    switch (node.type) {
      case 'camp':
        this.showBaseActions();
        break;
      case 'dungeon':
      case 'boss_lair':
        // Set floor to node's level range and enter dungeon
        this.state.floor = node.levelRange[0];
        this.enterDungeon();
        break;
      case 'field':
        this.handleFieldNode(node);
        break;
      case 'outpost':
        this.handleOutpostNode(node);
        break;
      case 'ruin':
        this.handleFieldNode(node);
        break;
      default:
        this.handleFieldNode(node);
        break;
    }
  }

  /** Handle a field/ruin node — single encounter based on node encounters list */
  private handleFieldNode(node: WorldNode) {
    showHomeButton(() => {
      this.state.currentNodeId = 'camp';
      this.returnToBase();
    });

    if (node.encounters.length === 0) {
      appendMessage('这里似乎没什么特别的。', 'narrator');
      if (!this.state.clearedNodeIds.includes(node.id)) {
        this.state.clearedNodeIds.push(node.id);
      }
      this.refreshNodeUnlocks();
      setActions([{
        text: '🗺️ 继续探索',
        primary: true,
        callback: () => this.showWorldMap(),
      }]);
      return;
    }

    // Pick a random encounter based on weights
    const totalWeight = node.encounters.reduce((sum, e) => sum + (e.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    let encounter = node.encounters[0];
    for (const enc of node.encounters) {
      roll -= enc.weight ?? 1;
      if (roll <= 0) { encounter = enc; break; }
    }

    // Handle one-time encounters
    const ns = this.state.nodeState[node.id] ?? { exploredRooms: [], internalMap: null, visitCounts: {}, bossDefeated: false };
    if (encounter.oneTime && ns.visitCounts[encounter.id]) {
      // Already done, pick another or show empty
      appendMessage('这里你已经探索过了，没有新发现。', 'narrator');
      setActions([{
        text: '🗺️ 返回地图',
        primary: true,
        callback: () => this.showWorldMap(),
      }]);
      return;
    }
    ns.visitCounts[encounter.id] = (ns.visitCounts[encounter.id] ?? 0) + 1;
    this.state.nodeState[node.id] = ns;

    // FIX C6: limit gambler encounters to 3 per node visit
    if (encounter.type === 'event' && encounter.id.includes('gambl')) {
      const count = ns.visitCounts[encounter.id] ?? 0;
      if (count > 3) {
        appendMessage('赌徒已经离开了。', 'narrator');
        setActions([{
          text: '🗺️ 返回地图',
          primary: true,
          callback: () => this.showWorldMap(),
        }]);
        return;
      }
    }

    switch (encounter.type) {
      case 'combat': {
        const enemyData = ENEMIES[encounter.id];
        if (enemyData) {
          this.startCombat(enemyData, enemyData.hp, -1, (escaped) => {
            if (!escaped && !this.state.clearedNodeIds.includes(node.id)) {
              // Mark node as cleared after defeating combat
              if (!node.bossId) this.state.clearedNodeIds.push(node.id);
            }
            this.refreshNodeUnlocks();
            setActions([{
              text: '🗺️ 返回地图',
              primary: true,
              callback: () => this.showWorldMap(),
            }]);
          });
        } else {
          appendMessage(`遇到了未知敌人...`, 'narrator');
          setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
        }
        break;
      }
      case 'lore': {
        // Collect lore fragment
        const lore = LORE_FRAGMENTS[encounter.id];
        if (!this.state.collectedLore.includes(encounter.id)) {
          this.state.collectedLore.push(encounter.id);
          if (lore) {
            appendMessage(`📜 发现文献：【${lore.title}】`, 'loot');
            appendMessage(lore.content, 'narrator');
          } else {
            appendMessage(`📜 发现了文献碎片：【${encounter.id}】`, 'loot');
          }
        } else {
          appendMessage('这里的记录你已经看过了。', 'narrator');
        }
        setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
        break;
      }
      case 'recruit': {
        const comp = COMPANIONS[encounter.id];
        if (!comp) {
          appendMessage('这里似乎曾有人驻足……但已经离开了。', 'narrator');
          setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
          break;
        }
        // Already recruited?
        const alreadyHave = this.state.party.some(m => m.id === comp.id) || this.state.companions.some(m => m.id === comp.id);
        if (alreadyHave) {
          appendMessage('这里你已经探索过了。', 'narrator');
          setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
          break;
        }
        // Karma check for wolf companion
        if (comp.recruitCondition.type === 'karma_threshold') {
          const threshold = comp.recruitCondition.value as number;
          if (threshold < 0 && this.state.karma > threshold) {
            appendMessage(`远处传来低沉的咆哮声，但那个身影似乎不信任你……`, 'narrator');
            setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
            break;
          }
        }
        appendMessage(`${comp.icon} 你遇到了 ${comp.name}`, 'event');
        appendMessage(comp.desc, 'narrator');
        appendMessage(`性格: ${comp.personality} | 职业: ${JOBS[comp.defaultJobId]?.name ?? comp.defaultJobId}`, 'system');
        appendMessage(`HP:${comp.baseStats.hp} ATK:${comp.baseStats.attack} DEF:${comp.baseStats.defense} SPD:${comp.baseStats.speed}`, 'system');

        setActions([
          {
            text: `🤝 邀请${comp.name}加入`,
            primary: true,
            callback: () => {
              const member: PartyMember = {
                id: comp.id,
                companionId: comp.id,
                name: comp.name,
                level: 1,
                exp: 0,
                hp: comp.baseStats.hp,
                maxHp: comp.baseStats.hp,
                mp: comp.baseStats.mp,
                maxMp: comp.baseStats.mp,
                baseAttack: comp.baseStats.attack,
                baseDefense: comp.baseStats.defense,
                speed: comp.baseStats.speed,
                currentJobId: comp.defaultJobId,
                jobLevels: { [comp.defaultJobId]: 1 },
                sp: 0,
                equipment: { weapon: null, armor: null, accessory: null },
                learnedSkills: [],
                equippedSkills: [],
                statusEffects: [],
                isAlive: true,
              };
              // Add to party if < 4, otherwise to reserves
              if (this.state.party.length < 4) {
                this.state.party.push(member);
                appendMessage(`${comp.icon} ${comp.name}加入了队伍！`, 'loot');
              } else {
                this.state.companions.push(member);
                appendMessage(`${comp.icon} ${comp.name}加入了后备队伍（营地可管理）`, 'loot');
              }
              this.state.karma += 3;
              updateStatusBar(this.state);
              setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
            },
          },
          {
            text: '🚶 继续赶路',
            callback: () => {
              appendMessage(`${comp.name}目送你离开，也许你们还会再见。`, 'narrator');
              setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
            },
          },
        ]);
        break;
      }
      case 'rest': {
        const heal = Math.ceil(this.state.party[0].maxHp * 0.3);
        this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + heal);
        appendMessage(`你找到了一个安全的角落休息。❤️ +${heal}`, 'loot');
        updateStatusBar(this.state);
        setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
        break;
      }
      case 'puzzle': {
        // Find puzzles associated with this node
        const nodePuzzles = Object.values(PUZZLES).filter(p => p.nodeId === node.id && !this.state.solvedPuzzles.includes(p.id));
        if (nodePuzzles.length > 0) {
          const puzzle = nodePuzzles[0];
          appendMessage(`📜 你发现了一个谜题：${puzzle.name}`, 'event');
          appendMessage(puzzle.desc, 'narrator');
          // Check if player has required lore
          const hasAllLore = puzzle.requiredLoreIds.every(id => this.state.collectedLore.includes(id));
          if (hasAllLore) {
            setActions([
              { text: '🧩 尝试解答', primary: true, callback: () => this.solvePuzzle(puzzle.id) },
              { text: '🗺️ 返回地图', callback: () => this.showWorldMap() },
            ]);
          } else {
            appendMessage(`你缺少关键的文献线索……还需要收集更多资料。`, 'system');
            setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
          }
        } else {
          appendMessage('这里的谜题你已经全部解开了。', 'narrator');
          setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
        }
        break;
      }
      default: {
        // Event or trader — use existing event system
        appendMessage('你发现了一些有趣的东西。', 'narrator');
        // Give a small reward
        const g = rand(5, 15);
        this.state.gold += g;
        appendMessage(`💰 +${g} 金币`, 'loot');
        setActions([{ text: '🗺️ 返回地图', primary: true, callback: () => this.showWorldMap() }]);
        break;
      }
    }
  }

  /** Handle outpost node — safe area with trading */
  private handleOutpostNode(node: WorldNode) {
    showHomeButton(() => {
      this.state.currentNodeId = 'camp';
      this.returnToBase();
    });

    appendMessage(`${node.icon} ${node.name}`, 'event');
    appendMessage(node.desc, 'narrator');
    appendMessage('', 'divider');

    const actions: ActionButton[] = [];

    // Rest option
    actions.push({
      text: '😴 休息',
      disabled: this.state.party[0].hp >= this.state.party[0].maxHp,
      callback: () => {
        const heal = Math.ceil(this.state.party[0].maxHp * 0.5);
        this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + heal);
        this.state.stamina = Math.min(this.state.maxStamina, this.state.stamina + 30);
        appendMessage(`休息了一会儿。❤️ +${heal}，体力 +30`, 'loot');
        updateStatusBar(this.state);
        this.handleOutpostNode(node);
      },
    });

    // Look around for encounters
    actions.push({
      text: '🔍 四处看看',
      callback: () => {
        clearMessages();
        this.handleFieldNode(node);
      },
    });

    // Mark as visited
    if (!this.state.clearedNodeIds.includes(node.id)) {
      this.state.clearedNodeIds.push(node.id);
      this.refreshNodeUnlocks();
    }

    actions.push({
      text: '🗺️ 返回地图',
      callback: () => { clearMessages(); this.showWorldMap(); },
    });

    setActions(actions);
  }

  // ==================== DUNGEON / MAP ====================

  private enterEndless() {
    this.state.floor = 21;
    clearMessages();
    appendMessage('—— ♾️ 无尽模式 ——', 'system');
    appendMessage('方舟之下，深渊无尽。你踏入了未知的黑暗……', 'narrator');
    appendMessage('每5层出现一个强化Boss。你能走多远？', 'system');
    this.enterDungeon();
  }

  private enterDungeon() {
    clearMessages();
    showHomeButton(() => this.returnToBase());
    appendMessage(`—— 废墟 第${this.state.floor}层 ——`, 'system');
    appendMessage('你推开沉重的门，走进废墟深处……', 'narrator');

    // Initialize run stats
    this.runStats = {
      startFloor: this.state.floor,
      maxFloor: this.state.floor,
      kills: 0,
      goldEarned: 0,
      itemsFound: 0,
      roomsExplored: 0,
    };

    const map = generateFloorMap(this.state.floor);
    this.state.map = map;

    // Darksight mutation: reveal all rooms
    if (this.state.activeMutation === 'darksight') {
      for (const room of map.rooms) {
        room.explored = true;
      }
      appendMessage('👁️ 你的变异视觉让你看穿了整层的布局。', 'event');
    }

    // Signal tower: reveal extra rooms
    const towerLv = this.state.baseLevel.signalTower;
    if (towerLv > 0 && this.state.activeMutation !== 'darksight') {
      const unrevealed = map.rooms
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.explored);
      const toReveal = Math.min(towerLv, unrevealed.length);
      for (let i = 0; i < toReveal; i++) {
        const pick = unrevealed.splice(Math.floor(Math.random() * unrevealed.length), 1)[0];
        map.rooms[pick.i].explored = true;
      }
      if (toReveal > 0) {
        appendMessage(`📡 信号塔探测到了 ${toReveal} 个房间的信息。`, 'system');
      }
    }

    // Track max floor
    if (this.state.floor > this.state.maxFloorReached) {
      this.state.maxFloorReached = this.state.floor;
    }

    this.showMapView();
  }

  private showMapView() {
    const map = this.state.map!;
    updateStatusBar(this.state);
    setBagButtonCallback(() => this.showInventory('dungeon'));
    renderMap(map, (roomIdx) => this.moveToRoom(roomIdx), this.state.baseLevel.signalTower);

    const currentRoom = map.rooms[map.playerPos];
    const actions: ActionButton[] = [];

    if (currentRoom.type === 'stairs' && currentRoom.explored) {
      actions.unshift({ text: '⬇️ 进入下一层', primary: true, callback: () => this.goDeeper() });
    }

    // Show mutation status
    if (this.state.activeMutation) {
      const m = MUTATIONS[this.state.activeMutation];
      actions.push({ text: `🧬 ${m.name}`, disabled: true, callback: () => {} });
    }

    setActions(actions);
  }

  private moveToRoom(roomIdx: number) {
    const map = this.state.map!;

    // Consume resources (hunger multiplier from bloodlust)
    this.state.turns++;
    const hungerCost = 3 * getHungerMultiplier(this.state);
    this.state.stamina -= hungerCost;
    if (this.state.stamina <= 0) {
      this.state.stamina = 0;
      this.state.party[0].hp -= 2;
      appendMessage('⚠️ 你精疲力竭…… (HP -2)', 'combat');
    } else if (this.state.stamina <= Math.floor(this.state.maxStamina * 0.3) && this.state.stamina > 0) {
      appendMessage('⚠️ 你感到体力不支，快补充点能量吧！（打开背包使用食物）', 'system');
    }

    if (this.state.party[0].hp <= 0) {
      this.onDeath();
      return;
    }

    // Regen mutation: +3 HP on entering new room
    if (this.state.activeMutation === 'regen') {
      const heal = Math.min(3, this.state.party[0].maxHp - this.state.party[0].hp);
      if (heal > 0) {
        this.state.party[0].hp += heal;
        appendMessage(`🧬 再生体：❤️ +${heal}`, 'loot');
      }
    }

    // Move player
    map.playerPos = roomIdx;
    const room = map.rooms[roomIdx];
    room.explored = true;
    if (this.runStats) this.runStats.roomsExplored++;

    // Reveal adjacent rooms
    for (const conn of room.connections) {
      map.rooms[conn].explored = true;
    }

    updateStatusBar(this.state);
    appendMessage('', 'divider');

    // Handle room type
    if (room.cleared) {
      appendMessage(getRoomDescription({ ...room, type: 'empty' }), 'narrator');
      this.showMapView();
      return;
    }

    switch (room.type) {
      case 'empty':
      case 'start':
        appendMessage(getRoomDescription(room), 'narrator');
        room.cleared = true;
        this.showMapView();
        break;
      case 'loot':
        this.handleLootRoom(room);
        break;
      case 'enemy':
        this.handleEnemyRoom(room, roomIdx);
        break;
      case 'event':
        this.handleEventRoom(room);
        break;
      case 'trader':
        this.handleTraderRoom(room);
        break;
      case 'rest':
        this.handleRestRoom(room);
        break;
      case 'stairs':
        appendMessage(getRoomDescription(room), 'event');
        room.cleared = true;
        this.showMapView();
        break;
      case 'locked':
        this.handleLockedRoom(room);
        break;
      case 'boss':
        this.handleEnemyRoom(room, roomIdx);
        break;
      case 'gambler':
        this.handleGamblerRoom(room);
        break;
      case 'cursed_chest':
        this.handleCursedChestRoom(room);
        break;
      case 'demon':
        this.handleDemonRoom(room);
        break;
      case 'fake_rest':
        this.handleFakeRestRoom(room, roomIdx);
        break;
      case 'fake_loot':
        this.handleFakeLootRoom(room, roomIdx);
        break;
      default:
        room.cleared = true;
        this.showMapView();
    }
  }

  // ==================== ROOM HANDLERS ====================

  private handleLootRoom(room: Room) {
    appendMessage(getRoomDescription(room), 'event');
    const lootId = rollLoot(this.state.floor);
    const item = ITEMS[lootId];
    if (item) {
      if (addItem(this.state, lootId)) {
        appendMessage(`🎁 获得了【${item.name}】！`, 'loot');
      } else {
        appendMessage(`🎁 发现了【${item.name}】，但背包已满！`, 'combat');
      }
    }
    const gold = rand(2, 8 + this.state.floor * 2);
    this.state.gold += gold;
    appendMessage(`💰 +${gold}`, 'loot');
    room.cleared = true;
    updateStatusBar(this.state);
    this.showMapView();
  }

  /** Resolve enemy data, handling elite_ prefix */
  private resolveEnemy(rawId: string): EnemyData | null {
    if (rawId.startsWith('elite_')) {
      const baseId = rawId.slice(6);
      const base = ENEMIES[baseId];
      if (!base) return null;
      return {
        ...base,
        id: rawId,
        name: `精英${base.name}`,
        hp: Math.floor(base.hp * 1.4),
        attack: base.attack + 2,
        defense: base.defense + 1,
        goldDrop: [Math.floor(base.goldDrop[0] * 1.5), Math.floor(base.goldDrop[1] * 1.5)] as [number, number],
        lootChance: Math.min(1, base.lootChance + 0.2),
        desc: `【精英】${base.desc}`,
      };
    }
    return ENEMIES[rawId] ?? null;
  }

  private handleEnemyRoom(room: Room, roomIdx: number) {
    const enemyId = room.enemyId ?? 'mutant_rat';
    const enemyData = this.resolveEnemy(enemyId);
    if (!enemyData) {
      room.cleared = true;
      this.showMapView();
      return;
    }

    // Check for saved enemy (escaped previously)
    const savedIdx = this.state.savedEnemies.findIndex(
      se => se.roomIdx === roomIdx && se.enemyId === enemyId
    );
    let startHp = enemyData.hp;
    if (savedIdx >= 0) {
      startHp = this.state.savedEnemies[savedIdx].currentHp;
      this.state.savedEnemies.splice(savedIdx, 1);
      appendMessage('⚠️ 你之前逃跑的敌人还在这里！', 'combat');
    }

    appendMessage(getRoomDescription(room), 'event');
    appendMessage(`⚠️ ${enemyData.name}出现了！`, 'combat');
    appendMessage(`"${enemyData.desc}"`, 'narrator');

    this.startCombat(enemyData, startHp, roomIdx, (escaped) => {
      if (!escaped) {
        room.cleared = true;
      }
      this.showMapView();
    });
  }

  private handleEventRoom(room: Room) {
    const available = EXPLORE_EVENTS.filter(e => !e.minFloor || this.state.floor >= e.minFloor);
    const event = weightedPick(available);
    appendMessage(event.text, 'event');

    const buttons: ActionButton[] = event.choices.map(choice => ({
      text: choice.text,
      callback: () => {
        this.resolveOutcome(choice.outcome, () => {
          room.cleared = true;
          this.showMapView();
        });
      },
    }));

    hideMap();
    setActions(buttons);
  }

  private currentTraderStock: string[] = [];

  private handleTraderRoom(room: Room) {
    appendMessage(getRoomDescription(room), 'event');
    // Generate stock once when entering the trader room
    this.currentTraderStock = TRADER_STOCK.buy.filter(() => Math.random() < 0.6).slice(0, 5);
    if (this.currentTraderStock.length === 0) this.currentTraderStock.push('bandage', 'canned_food');
    this.showTraderUI(room, 'buy');
  }

  private showTraderUI(room: Room, tab: 'buy' | 'sell') {
    hideMap();
    const actions: ActionButton[] = [];

    // Tab buttons
    actions.push({
      text: tab === 'buy' ? '🛒 购买 ←' : '🛒 购买',
      primary: tab === 'buy',
      callback: () => this.showTraderUI(room, 'buy'),
    });
    actions.push({
      text: tab === 'sell' ? '💰 出售 ←' : '💰 出售',
      primary: tab === 'sell',
      callback: () => this.showTraderUI(room, 'sell'),
    });

    if (tab === 'buy') {
      const stock = this.currentTraderStock;

      for (const itemId of stock) {
        const item = ITEMS[itemId];
        if (!item) continue;
        const price = Math.ceil(item.price * 1.5);
        actions.push({
          text: `${item.icon} ${item.name} ${this.itemEffectSummary(item)} (${price}💰)`,
          disabled: this.state.gold < price || isInventoryFull(this.state),
          callback: () => {
            this.state.gold -= price;
            if (addItem(this.state, itemId)) {
              appendMessage(`🛒 买入【${item.name}】`, 'loot');
            } else {
              appendMessage('背包已满！', 'combat');
              this.state.gold += price; // refund
            }
            // Trader betrayal check
            if (Math.random() < TRADER_BETRAY_CHANCE) {
              this.traderBetray(room);
              return;
            }
            updateStatusBar(this.state);
            this.showTraderUI(room, 'buy');
          },
        });
      }
    } else {
      // Sell tab - all sellable items
      const sellable = this.state.inventory.filter(inv => {
        const def = ITEMS[inv.id];
        return def && inv.count > 0;
      });
      if (sellable.length === 0) {
        appendMessage('没有可出售的物品。', 'system');
      }
      for (const inv of sellable) {
        const def = ITEMS[inv.id];
        const price = Math.max(1, Math.floor(def.price * TRADER_STOCK.sellMultiplier));
        if (def.price <= 0) continue;
        // Don't sell equipped items directly
        const isEquipped = this.state.equippedWeapon === inv.id || this.state.equippedArmor === inv.id;
        actions.push({
          text: `${def.name}x${inv.count} (${price}💰/个)${isEquipped ? ' [装备中]' : ''}`,
          disabled: isEquipped,
          callback: () => {
            this.state.gold += price;
            removeItem(this.state, inv.id);
            appendMessage(`💰 卖出【${def.name}】，获得 ${price} 金币`, 'loot');
            // Trader betrayal check
            if (Math.random() < TRADER_BETRAY_CHANCE) {
              this.traderBetray(room);
              return;
            }
            updateStatusBar(this.state);
            this.showTraderUI(room, 'sell');
          },
        });
      }
    }

    actions.push({
      text: '👋 离开商店',
      callback: () => {
        room.cleared = true;
        this.showMapView();
      },
    });

    setActions(actions);
  }

  private traderBetray(room: Room) {
    appendMessage('', 'divider');
    appendMessage('商人突然掏出一把刀——"把你的东西都留下！"', 'event');
    const bandit = ENEMIES['bandit'];
    if (bandit) {
      this.startCombat(bandit, bandit.hp, -1, () => {
        room.cleared = true;
        this.showMapView();
      });
    }
  }

  private handleRestRoom(room: Room) {
    appendMessage(getRoomDescription(room), 'event');
    hideMap();

    setActions([
      {
        text: '😴 休息 (❤️ +10, 🍖 -10)',
        primary: true,
        callback: () => {
          this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + 10);
          this.state.stamina = Math.max(0, this.state.stamina - 10);
          appendMessage('你小睡了一会儿，感觉好多了。', 'narrator');
          appendMessage('❤️ +10 HP', 'loot');
          room.cleared = true;
          updateStatusBar(this.state);
          this.showMapView();
        },
      },
      {
        text: '🔍 搜索房间',
        callback: () => {
          if (Math.random() < 0.5) {
            const lootId = pick(LOOT_TABLES.common);
            if (addItem(this.state, lootId)) {
              appendMessage(`你在枕头底下发现了【${ITEMS[lootId].name}】`, 'loot');
            } else {
              appendMessage(`你发现了【${ITEMS[lootId].name}】，但背包已满。`, 'combat');
            }
          } else {
            appendMessage('什么也没找到。', 'narrator');
          }
          room.cleared = true;
          updateStatusBar(this.state);
          this.showMapView();
        },
      },
      {
        text: '➡️ 直接离开',
        callback: () => {
          room.cleared = true;
          this.showMapView();
        },
      },
    ]);
  }

  private handleLockedRoom(room: Room) {
    appendMessage(getRoomDescription(room), 'event');
    hideMap();

    const hasKey = hasItem(this.state, 'rusty_key') || hasItem(this.state, 'keycard');
    const actions: ActionButton[] = [];

    if (hasKey) {
      const keyId = hasItem(this.state, 'keycard') ? 'keycard' : 'rusty_key';
      actions.push({
        text: '🔑 使用钥匙开门',
        primary: true,
        callback: () => {
          removeItem(this.state, keyId);
          appendMessage('锁打开了！里面是一个小型仓库。', 'loot');
          const n = rand(2, 3);
          for (let i = 0; i < n; i++) {
            const id = pick(LOOT_TABLES.rare);
            if (addItem(this.state, id)) {
              appendMessage(`🎁 获得【${ITEMS[id].name}】`, 'loot');
            } else {
              appendMessage(`🎁 发现了【${ITEMS[id].name}】，但背包已满。`, 'combat');
            }
          }
          const gold = rand(15, 30);
          this.state.gold += gold;
          appendMessage(`💰 +${gold}`, 'loot');
          room.cleared = true;
          updateStatusBar(this.state);
          this.showMapView();
        },
      });
    }

    actions.push({
      text: '💪 暴力破门 (HP -5)',
      callback: () => {
        this.state.party[0].hp -= 5;
        appendMessage('你用力撞开了门，肩膀疼得厉害。(HP -5)', 'combat');
        if (this.state.party[0].hp <= 0) { this.onDeath(); return; }
        const id = rollLoot(this.state.floor);
        if (addItem(this.state, id)) {
          appendMessage(`🎁 获得【${ITEMS[id].name}】`, 'loot');
        } else {
          appendMessage(`🎁 发现了【${ITEMS[id].name}】，但背包已满。`, 'combat');
        }
        const gold = rand(5, 15);
        this.state.gold += gold;
        appendMessage(`💰 +${gold}`, 'loot');
        room.cleared = true;
        updateStatusBar(this.state);
        this.showMapView();
      },
    });

    actions.push({
      text: '🔙 算了',
      callback: () => { this.showMapView(); },
    });

    setActions(actions);
  }

  // === NEW ROOM HANDLERS ===

  private handleGamblerRoom(room: Room) {
    appendMessage('一个穿着花哨的人坐在一张折叠桌后面，桌上摆着骰子和扑克牌。', 'event');
    appendMessage('"来试试手气吧，朋友！"', 'narrator');
    this.showGamblerUI(room);
  }

  private showGamblerUI(room: Room) {
    hideMap();
    const actions: ActionButton[] = [];

    for (const option of GAMBLE_OPTIONS) {
      actions.push({
        text: option.name,
        disabled: this.state.gold < option.cost,
        callback: () => {
          this.state.gold -= option.cost;
          const result = rollGamble(option);
          appendMessage(result.text, result.gold && result.gold > 0 ? 'loot' : 'combat');

          if (result.gold) {
            this.state.gold = Math.max(0, this.state.gold + result.gold);
            if (result.gold > 0) {
              appendMessage(`💰 +${result.gold}`, 'loot');
            } else {
              appendMessage(`💸 ${result.gold}`, 'combat');
            }
          }
          if (result.item) {
            const def = ITEMS[result.item];
            if (def && addItem(this.state, result.item)) {
              appendMessage(`🎁 获得【${def.name}】`, 'loot');
            }
          }
          if (result.hp) {
            this.state.party[0].hp = Math.max(0, Math.min(this.state.party[0].maxHp, this.state.party[0].hp + result.hp));
          }

          updateStatusBar(this.state);
          this.showGamblerUI(room);
        },
      });
    }

    actions.push({
      text: '👋 离开赌场',
      callback: () => {
        room.cleared = true;
        this.showMapView();
      },
    });

    setActions(actions);
  }

  private handleCursedChestRoom(room: Room) {
    appendMessage('房间中央有一个散发着诡异光芒的宝箱，箱体上刻满了不明符文。', 'event');
    hideMap();

    setActions([
      {
        text: '📦 打开宝箱',
        primary: true,
        callback: () => {
          const outcome = rollCursedChest();
          appendMessage(outcome.text, outcome.type === 'jackpot' ? 'loot' : 'combat');

          if (outcome.gold) {
            this.state.gold += outcome.gold;
            appendMessage(`💰 +${outcome.gold}`, 'loot');
          }
          if (outcome.hp) {
            this.state.party[0].hp = Math.max(0, Math.min(this.state.party[0].maxHp, this.state.party[0].hp + outcome.hp));
            appendMessage(`💔 HP ${outcome.hp}`, 'combat');
          }
          if (outcome.item) {
            const def = ITEMS[outcome.item];
            if (def && addItem(this.state, outcome.item)) {
              appendMessage(`🎁 获得【${def.name}】`, 'loot');
            }
          }

          // Sealed enemy - fight
          if (outcome.combat) {
            const enemy = ENEMIES[outcome.combat];
            if (enemy) {
              room.cleared = true;
              updateStatusBar(this.state);
              this.startCombat(enemy, enemy.hp, -1, () => {
                this.showMapView();
              });
              return;
            }
          }

          // Curse - random mutation
          if (outcome.type === 'curse') {
            const mutationTypes: MutationType[] = ['flesh', 'iron', 'bloodlust', 'darksight', 'regen'];
            const mType = pick(mutationTypes);
            applyMutation(this.state, mType);
            const m = MUTATIONS[mType];
            appendMessage(`🧬 你发生了变异：${m.name}！`, 'event');
            appendMessage(`  效果：${m.benefit} | 代价：${m.cost}`, 'system');
          }

          if (this.state.party[0].hp <= 0) { this.onDeath(); return; }
          room.cleared = true;
          updateStatusBar(this.state);
          this.showMapView();
        },
      },
      {
        text: '🚫 不碰这东西',
        callback: () => {
          room.cleared = true;
          this.showMapView();
        },
      },
    ]);
  }

  private handleDemonRoom(room: Room) {
    appendMessage('一个黑色的身影浮在半空中，红色的眼睛直视着你。', 'event');
    appendMessage('"我有你想要的东西……但一切都有代价。"', 'narrator');
    this.showDemonUI(room);
  }

  private showDemonUI(room: Room) {
    hideMap();
    const actions: ActionButton[] = [];

    for (const deal of DEMON_DEALS) {
      actions.push({
        text: `${deal.offer} — ${deal.costDesc}`,
        callback: () => {
          // FIX M2: Confirmation dialog for permanent-cost deals
          showConfirm(`确定要交易吗？\n获得: ${deal.offerDesc}\n代价: ${deal.costDesc}\n\n⚠️ 此操作不可撤销！`, () => {
            appendMessage(`你接受了交易。`, 'narrator');
            appendMessage(`${deal.offerDesc}`, 'event');

            // Apply cost
            if (deal.costType === 'maxHp') {
              this.state.maxHpBase -= deal.costAmount;
              const cleanMaxHp = this.state.maxHpBase + this.state.baseLevel.shelter * 5;
              if (this.state.activeMutation === 'flesh') {
                this.state.party[0].maxHp = Math.floor(cleanMaxHp * 0.75);
              } else {
                this.state.party[0].maxHp = cleanMaxHp;
              }
              this.state.party[0].hp = Math.min(this.state.party[0].hp, this.state.party[0].maxHp);
              appendMessage(`💔 最大HP永久 -${deal.costAmount}`, 'combat');
            } else {
              this.state.maxStamina -= deal.costAmount;
              this.state.stamina = Math.min(this.state.stamina, this.state.maxStamina);
              appendMessage(`😫 最大体力永久 -${deal.costAmount}`, 'combat');
            }

            // Apply reward
            if (deal.item) {
              if (addItem(this.state, deal.item)) {
                const def = ITEMS[deal.item];
                appendMessage(`🎁 获得【${def.name}】`, 'loot');
              } else {
                appendMessage('背包已满，物品丢失了……', 'combat');
              }
            }

            // Special: reveal map
            if (deal.offer === '全图透视') {
              const map = this.state.map;
              if (map) {
                for (const r of map.rooms) {
                  r.explored = true;
                }
                appendMessage('👁️ 整层地图已显现。', 'loot');
              }
            }

            // Karma: demon deals are dark choices
            this.state.karma -= 10;
            this.state.karmaHistory.push({
              nodeId: this.state.currentNodeId ?? 'dungeon',
              choiceId: `demon_deal_${deal.item ?? deal.offer}`,
              karmaChange: -10,
              day: this.state.day,
            });
            appendMessage('⚖️ 因果 -10（与暗影交易）', 'system');

            room.cleared = true;
            updateStatusBar(this.state);
            this.showMapView();
          });
        },
      });
    }

    actions.push({
      text: '🚫 拒绝交易',
      callback: () => {
        appendMessage('"……你会后悔的。"黑影消失了。', 'narrator');
        room.cleared = true;
        this.showMapView();
      },
    });

    setActions(actions);
  }

  private handleFakeRestRoom(room: Room, roomIdx: number) {
    // Looks like a rest room, but it's an ambush
    appendMessage('这里看起来很安全，有一张整洁的行军床。', 'event');
    hideMap();

    setActions([
      {
        text: '😴 休息',
        primary: true,
        callback: () => {
          appendMessage('你闭上眼睛……', 'narrator');
          appendMessage('突然——一个暗影从床下窜出！', 'combat');
          const enemyId = room.enemyId ?? 'ambush_hunter';
          const enemy = this.resolveEnemy(enemyId);
          if (enemy) {
            // Surprise attack: lose HP first
            const surprise = rand(3, 6);
            this.state.party[0].hp -= surprise;
            appendMessage(`⚠️ 偷袭！你受到了 ${surprise} 点伤害！`, 'combat');
            updateStatusBar(this.state);
            if (this.state.party[0].hp <= 0) { this.onDeath(); return; }

            this.startCombat(enemy, enemy.hp, roomIdx, (escaped) => {
              if (!escaped) room.cleared = true;
              this.showMapView();
            });
          } else {
            room.cleared = true;
            this.showMapView();
          }
        },
      },
      {
        text: '🔍 先检查一下',
        callback: () => {
          if (Math.random() < 0.5) {
            appendMessage('你发现床下有异常的气味！这是个陷阱！', 'event');
            appendMessage('你可以选择战斗或离开。', 'narrator');
            setActions([
              {
                text: '🗡️ 掀翻床铺！',
                primary: true,
                callback: () => {
                  const enemyId = room.enemyId ?? 'ambush_hunter';
                  const enemy = this.resolveEnemy(enemyId);
                  if (enemy) {
                    this.startCombat(enemy, enemy.hp, roomIdx, (escaped) => {
                      if (!escaped) room.cleared = true;
                      this.showMapView();
                    });
                  }
                },
              },
              {
                text: '🏃 赶紧离开',
                callback: () => {
                  room.cleared = true;
                  this.showMapView();
                },
              },
            ]);
          } else {
            appendMessage('看起来没什么异常。', 'narrator');
            this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + 5);
            appendMessage('你安心地休息了一会儿。❤️ +5', 'loot');
            room.cleared = true;
            updateStatusBar(this.state);
            this.showMapView();
          }
        },
      },
      {
        text: '➡️ 直接离开',
        callback: () => {
          room.cleared = true;
          this.showMapView();
        },
      },
    ]);
  }

  private handleFakeLootRoom(room: Room, roomIdx: number) {
    // Looks like loot, but it's a mimic
    appendMessage('你发现了一个闪闪发光的箱子！看起来装满了好东西。', 'event');
    hideMap();

    setActions([
      {
        text: '📦 打开箱子',
        primary: true,
        callback: () => {
          appendMessage('箱子突然张开了嘴——它是活的！', 'combat');
          const enemyId = room.enemyId ?? 'trap_mimic';
          const enemy = this.resolveEnemy(enemyId);
          if (enemy) {
            this.startCombat(enemy, enemy.hp, roomIdx, (escaped) => {
              if (!escaped) {
                room.cleared = true;
                // Extra loot for defeating mimic
                const gold = rand(10, 25);
                this.state.gold += gold;
                appendMessage(`击败拟态箱后你找到了 💰 +${gold}`, 'loot');
                updateStatusBar(this.state);
              }
              this.showMapView();
            });
          }
        },
      },
      {
        text: '🔍 小心检查',
        callback: () => {
          if (Math.random() < 0.4) {
            appendMessage('你注意到箱子在微微颤动……这不是普通的箱子！', 'event');
            setActions([
              {
                text: '🗡️ 先发制人！',
                primary: true,
                callback: () => {
                  const enemyId = room.enemyId ?? 'trap_mimic';
                  const enemy = this.resolveEnemy(enemyId);
                  if (enemy) {
                    // Player gets advantage: enemy starts with less HP
                    const startHp = Math.floor(enemy.hp * 0.7);
                    appendMessage('你一刀砍向箱子——拟态箱尖叫着跳起来！', 'combat');
                    this.startCombat(enemy, startHp, roomIdx, (escaped) => {
                      if (!escaped) room.cleared = true;
                      this.showMapView();
                    });
                  }
                },
              },
              {
                text: '🏃 赶紧跑',
                callback: () => {
                  room.cleared = true;
                  this.showMapView();
                },
              },
            ]);
          } else {
            appendMessage('看起来就是一个普通的宝箱。', 'narrator');
            // Actually triggers the mimic anyway
            appendMessage('你放心地打开了箱子——', 'narrator');
            appendMessage('箱子突然张开了嘴！', 'combat');
            const enemyId = room.enemyId ?? 'trap_mimic';
            const enemy = this.resolveEnemy(enemyId);
            if (enemy) {
              this.startCombat(enemy, enemy.hp, roomIdx, (escaped) => {
                if (!escaped) room.cleared = true;
                this.showMapView();
              });
            }
          }
        },
      },
      {
        text: '🚫 不碰',
        callback: () => {
          room.cleared = true;
          this.showMapView();
        },
      },
    ]);
  }

  // ==================== COMBAT (Phase 3: Party-based NvM) ====================

  /**
   * Combat actor — represents either a party member or an enemy in turn order.
   * Status effects (poison, stun, shield, weaken) are stored per-actor.
   */
  private _combatEnemy: {
    id: string; name: string; desc: string;
    currentHp: number; maxHp: number; attack: number; defense: number;
    speed: number; goldDrop: [number, number]; lootChance: number;
    abilities?: EnemyAbility[];
    // Per-enemy state (FIX C2: no shared closure vars)
    charging: boolean; stunned: boolean;
    weakenTurns: number;
    /** Poison ON the enemy (e.g. from corrode affix) */
    poisonTurns: number; poisonDmg: number;
  } | null = null;

  private startCombat(
    enemyData: EnemyData,
    startHp: number,
    roomIdx: number,
    onEnd: (escaped: boolean) => void,
  ) {
    // Build enemy combat object with per-actor status
    const enemy = {
      ...enemyData,
      currentHp: Math.min(startHp, enemyData.hp),
      maxHp: enemyData.hp,
      speed: 8 + rand(-2, 2),
      charging: false,
      stunned: false,
      weakenTurns: 0,
      poisonTurns: 0,
      poisonDmg: 0,
    };
    this._combatEnemy = enemy;

    // Per-party-member combat state
    const memberState: Record<string, {
      shieldActive: boolean;
      /** Poison on this party member (from enemy abilities) */
      poisonTurns: number; poisonDmg: number;
    }> = {};
    for (const m of this.state.party) {
      memberState[m.id] = { shieldActive: false, poisonTurns: 0, poisonDmg: 0 };
    }

    let turn = 1;
    const skillCooldowns: Record<string, number> = {};

    showCombatScreen(enemy.name, enemy.desc);

    // Darksight: show enemy HP values
    if (this.state.activeMutation === 'darksight') {
      appendCombatMsg(`👁️ 暗视觉：${enemy.name} HP ${enemy.currentHp}/${enemy.maxHp} ATK ${enemy.attack} DEF ${enemy.defense}`, 'info');
    }

    // Phase 8: Boss weakness system
    const bossWeakness = Object.values(BOSS_WEAKNESSES).find(w => w.bossId === enemy.id);
    const weaknessDiscovered = bossWeakness && this.state.discoveredWeaknesses.includes(bossWeakness.id);
    if (bossWeakness && !weaknessDiscovered) {
      // Undiscovered: boss gets 150% HP
      enemy.maxHp = Math.ceil(enemy.maxHp * 1.5);
      enemy.currentHp = Math.min(enemy.currentHp, enemy.maxHp);
      appendCombatMsg(`⚠️ ${enemy.name}散发着强大的威压！（未发现弱点，HP x1.5）`, 'info');
    } else if (bossWeakness && weaknessDiscovered) {
      appendCombatMsg(`💡 你已掌握${enemy.name}的弱点：${bossWeakness.name}`, 'info');
      if (bossWeakness.effectType === 'item') {
        appendCombatMsg(`  使用${ITEMS[bossWeakness.effectValue]?.name ?? bossWeakness.effectValue}可造成${bossWeakness.damageMultiplier}倍伤害`, 'info');
      } else if (bossWeakness.effectType === 'skill') {
        appendCombatMsg(`  使用技能${SKILLS[bossWeakness.effectValue]?.name ?? bossWeakness.effectValue}可造成${bossWeakness.damageMultiplier}倍伤害`, 'info');
      }
    }

    const exitCombat = () => {
      hideCombatScreen();
      this._combatEnemy = null;
    };

    const aliveParty = () => this.state.party.filter(m => m.isAlive && m.hp > 0);

    const refreshBars = () => {
      updateEnemyBars([{ id: enemy.id, name: enemy.name, currentHp: enemy.currentHp, maxHp: enemy.maxHp }]);
      updatePartyBars(this.state.party);
      updateStatusBar(this.state);
    };

    refreshBars();
    appendCombatMsg(`—— 战斗开始 ——`, 'info');

    // ── Build turn order by speed ──
    const buildTurnOrder = (): Array<{ type: 'party'; member: PartyMember } | { type: 'enemy' }> => {
      const actors: Array<{ type: 'party'; member: PartyMember; speed: number } | { type: 'enemy'; speed: number }> = [];
      for (const m of aliveParty()) {
        actors.push({ type: 'party', member: m, speed: m.speed + rand(-1, 1) });
      }
      actors.push({ type: 'enemy', speed: enemy.speed ?? (enemy.attack + rand(0, 3)) });
      actors.sort((a, b) => b.speed - a.speed);
      return actors;
    };

    // ── Check if party is wiped ──
    const isPartyWiped = (): boolean => aliveParty().length === 0;

    const showDeathUI = () => {
      appendCombatMsg(`全队覆没……`, 'result');
      setCombatActions([{
        text: '💀 …',
        danger: true,
        callback: () => { exitCombat(); this.onDeath(); },
      }]);
    };

    // ── Apply poison to a party member at start of their turn ──
    const applyMemberPoison = (m: PartyMember) => {
      const ms = memberState[m.id];
      if (!ms || ms.poisonTurns <= 0) return;
      const pd = calcDamageTaken(this.state, ms.poisonDmg);
      m.hp -= pd;
      ms.poisonTurns--;
      appendCombatMsg(`☠️ ${m.name} 毒素伤害 -${pd} HP${ms.poisonTurns > 0 ? ` (剩余${ms.poisonTurns}回合)` : ' (毒素消散)'}`, 'atk-enemy');
      if (m.hp <= 0) {
        m.hp = 0;
        m.isAlive = false;
        appendCombatMsg(`💀 ${m.name} 倒下了！`, 'result');
      }
      refreshBars();
    };

    // ── Apply poison to enemy at start of enemy turn ──
    const applyEnemyPoison = () => {
      if (enemy.poisonTurns <= 0) return;
      const pd = enemy.poisonDmg;
      enemy.currentHp -= pd;
      enemy.poisonTurns--;
      appendCombatMsg(`☠️ ${enemy.name} 中毒伤害 -${pd} HP${enemy.poisonTurns > 0 ? ` (剩余${enemy.poisonTurns}回合)` : ' (毒素消散)'}`, 'atk-player');
      refreshBars();
    };

    // ── onEnemyKill: rewards and loot ──
    const onEnemyKill = () => {
      appendCombatMsg(`${enemy.name}倒下了！`, 'result');

      if (this.runStats) this.runStats.kills++;
      this.state.lifetimeKills++;

      const gold = rand(enemy.goldDrop[0], enemy.goldDrop[1]);
      this.state.gold += gold;
      this.state.lifetimeGold += gold;
      if (this.runStats) this.runStats.goldEarned += gold;
      appendCombatMsg(`💰 +${gold} 金币`, 'result');

      let lootMultiplier = 1;
      if (this.state.activeMutation === 'bloodlust') lootMultiplier = 1.5;

      if (Math.random() < enemy.lootChance * lootMultiplier) {
        const lootId = rollLoot(this.state.floor);
        const result = this.addLootItem(lootId);
        if (result.added) {
          appendCombatMsg(`🎁 获得【${result.name}】`, 'result');
        } else {
          appendCombatMsg(`🎁 发现了【${result.name}】，但背包已满。`, 'info');
        }
      }

      // Bloodlust mutation: heal protagonist 15% maxHP on kill
      if (this.state.activeMutation === 'bloodlust') {
        const p = this.state.party[0];
        if (p.isAlive) {
          const heal = Math.ceil(p.maxHp * 0.15);
          p.hp = Math.min(p.maxHp, p.hp + heal);
          appendCombatMsg(`🩸 嗜血本能：❤️ +${heal}`, 'result');
        }
      }

      // Lifesteal charm
      if (hasItem(this.state, 'lifesteal_charm')) {
        const p = this.state.party[0];
        if (p.isAlive) {
          p.hp = Math.min(p.maxHp, p.hp + 10);
          appendCombatMsg(`✨ 生命虹吸：❤️ +10`, 'result');
        }
      }

      // Track quest kills
      const baseEnemyId = enemy.id.startsWith('elite_') ? enemy.id.slice(6) : enemy.id;
      if (this.state.activeQuests.length > 0) {
        this.state.questKills[baseEnemyId] = (this.state.questKills[baseEnemyId] ?? 0) + 1;
      }

      // Boss kill: award skill points (FIX M3: use isBoss flag or known boss IDs)
      const isBoss = enemy.id === 'warlord' || enemy.id === 'mutant_king' || enemy.id === 'ark_guardian'
        || enemy.id === 'mutant_queen' || enemy.id === 'ark_overseer';
      if (isBoss) {
        this.state.lifetimeBossKills++;
        const spGain = (enemy.id === 'ark_guardian' || enemy.id === 'ark_overseer') ? 3
          : (enemy.id === 'mutant_king' || enemy.id === 'mutant_queen') ? 2 : 1;
        this.state.skillPoints += spGain;
        this.state.party[0].sp += spGain;
        appendCombatMsg(`🌟 Boss击杀！获得 ${spGain} 技能点`, 'result');
      }

      // Discover exploration skill
      const discoverChance = isBoss ? 0.15 : 0.08;
      if (Math.random() < discoverChance) {
        const available = EXPLORATION_SKILLS.filter(id => !this.state.skills.includes(id));
        if (available.length > 0) {
          const skillId = pick(available);
          this.state.skills.push(skillId);
          const skill = SKILLS[skillId];
          appendCombatMsg(`⚡ 战斗顿悟！学会了稀有技能：${skill.icon} ${skill.name}！`, 'result');
        }
      }

      // MP recovery on victory: +5 MP to all alive members
      for (const m of aliveParty()) {
        m.mp = Math.min(m.maxMp, m.mp + 5);
      }

      // Exp gain: base 5 + enemy HP/2, boss x3
      const expGain = Math.ceil((5 + enemy.maxHp / 2) * (isBoss ? 3 : 1));
      this.state.party[0].exp += expGain;
      appendCombatMsg(`📊 获得 ${expGain} 经验值`, 'result');
      this.checkJobLevelUp();

      refreshBars();

      // Victory options
      setCombatActions([
        {
          text: '✅ 继续探索',
          primary: true,
          callback: () => {
            exitCombat();
            appendMessage(`🏆 击败了${enemy.name}！`, 'loot');
            onEnd(false);
          },
        },
        {
          text: '🔍 搜刮尸体',
          callback: () => {
            this.lootCorpse(enemy, refreshBars, exitCombat, onEnd);
          },
        },
      ]);
    };

    // ── Enemy turn (FIX M1: enemy acts on its own turn, not coupled to defend) ──
    const doEnemyTurn = () => {
      // Stun check
      if (enemy.stunned) {
        enemy.stunned = false;
        appendCombatMsg(`💫 ${enemy.name}处于眩晕状态，无法行动！`, 'info');
        return;
      }

      // Apply enemy's own poison at turn start
      applyEnemyPoison();
      if (enemy.currentHp <= 0) {
        onEnemyKill();
        return;
      }

      // Pick a random alive target
      const alive = aliveParty();
      if (alive.length === 0) return;
      const target = alive[Math.floor(Math.random() * alive.length)];
      const targetDef = getDefense(this.state, ITEMS);
      let totalDmg = 0;

      // Process enemy abilities
      if (enemy.abilities) {
        for (const ability of enemy.abilities) {
          if (Math.random() >= ability.chance) continue;

          if (ability.type === 'charge' && !enemy.charging) {
            enemy.charging = true;
            appendCombatMsg(`⚡ ${enemy.name}开始蓄力——${ability.name}！`, 'atk-enemy');
            refreshBars();
            return;
          }

          if (ability.type === 'poison') {
            // FIX C2: poison is stored on the TARGET member, not shared closure
            const ms = memberState[target.id];
            if (ms) {
              ms.poisonDmg = ability.poisonDmg ?? 2;
              ms.poisonTurns = ability.poisonDuration ?? 2;
            }
            appendCombatMsg(`☠️ ${enemy.name}使用了${ability.name}！${target.name}中毒了！(${ms?.poisonDmg ?? 2}伤害/回合, ${ms?.poisonTurns ?? 2}回合)`, 'atk-enemy');
          }

          if (ability.type === 'summon') {
            appendCombatMsg(`📢 ${enemy.name}使用了${ability.name}！`, 'atk-enemy');
            const extraDmg = rand(2, 5);
            totalDmg += extraDmg;
            appendCombatMsg(`援军造成了 ${extraDmg} 点额外伤害！`, 'atk-enemy');
          }
        }
      }

      // Weaken debuff
      let enemyAtk = enemy.attack;
      if (enemy.weakenTurns > 0) {
        enemyAtk = Math.floor(enemyAtk * 0.5);
        enemy.weakenTurns--;
        appendCombatMsg(`📣 战吼效果：${enemy.name}攻击力减半${enemy.weakenTurns > 0 ? ` (剩余${enemy.weakenTurns}回合)` : ' (消散)'}`, 'info');
      }

      // Charged attack
      let atkMultiplier = 1;
      if (enemy.charging) {
        const chargeAbility = enemy.abilities?.find(a => a.type === 'charge');
        atkMultiplier = chargeAbility?.chargeMultiplier ?? 2;
        appendCombatMsg(`💥 ${enemy.name}释放了蓄力攻击！`, 'atk-enemy');
        enemy.charging = false;
      }

      // Enemy crit (10%)
      let enemyCrit = false;
      if (Math.random() < 0.1) {
        atkMultiplier *= 1.5;
        enemyCrit = true;
      }

      const rawAtkValue = Math.floor(enemyAtk * atkMultiplier) + rand(-1, 1);
      const rawDmg = applyDefense(rawAtkValue, targetDef);
      let eDmg = calcDamageTaken(this.state, rawDmg);

      const details: string[] = [];
      if (targetDef > 0) details.push(`🛡️-${rawAtkValue - rawDmg}`);
      if (this.state.activeMutation === 'iron') details.push('铁皮-40%');
      if (this.state.activeMutation === 'darksight') details.push('暗视+1');

      // Shield from iron_wall skill
      const ms = memberState[target.id];
      if (ms?.shieldActive) {
        const shieldReduction = this.state.activeMutation === 'iron' ? 0.3 : 0.5;
        eDmg = Math.max(1, Math.floor(eDmg * shieldReduction));
        ms.shieldActive = false;
        details.push(this.state.activeMutation === 'iron' ? '铁壁-70%' : '铁壁-50%');
      }

      totalDmg += eDmg;
      target.hp -= totalDmg;

      const detailStr = details.length > 0 ? ` (${details.join(' ')})` : '';
      const targetLabel = this.state.party.length > 1 ? `${target.name}` : '你';
      if (enemyCrit) {
        appendCombatMsg(`💥 暴击！${enemy.name}攻击${targetLabel}，造成 ${totalDmg} 点伤害${detailStr}`, 'atk-enemy');
      } else {
        appendCombatMsg(`← ${enemy.name}攻击${targetLabel}，造成 ${totalDmg} 点伤害${detailStr}`, 'atk-enemy');
      }

      if (target.hp <= 0) {
        target.hp = 0;
        target.isAlive = false;
        appendCombatMsg(`💀 ${target.name} 倒下了！`, 'result');
      }

      refreshBars();
    };

    // ── Tick cooldowns ──
    const tickCooldowns = () => {
      for (const sid of Object.keys(skillCooldowns)) {
        if (skillCooldowns[sid] > 0) skillCooldowns[sid]--;
      }
    };

    // ── Run one full round (all actors take turns in speed order) ──
    const runRound = () => {
      const turnOrder = buildTurnOrder();
      let actorIdx = 0;

      const nextActor = () => {
        // Check victory/defeat before proceeding
        if (enemy.currentHp <= 0) {
          onEnemyKill();
          return;
        }
        if (isPartyWiped()) {
          showDeathUI();
          return;
        }

        if (actorIdx >= turnOrder.length) {
          // Round complete — start next round
          turn++;
          tickCooldowns();
          // MP regen: +2 MP per round for alive members
          for (const m of aliveParty()) {
            m.mp = Math.min(m.maxMp, m.mp + 2);
          }
          runRound();
          return;
        }

        const actor = turnOrder[actorIdx];
        actorIdx++;

        if (actor.type === 'enemy') {
          // Enemy's independent turn (FIX M1)
          doEnemyTurn();
          if (enemy.currentHp <= 0) {
            onEnemyKill();
            return;
          }
          if (isPartyWiped()) {
            showDeathUI();
            return;
          }
          nextActor();
        } else {
          // Party member's turn
          const member = actor.member;
          if (!member.isAlive || member.hp <= 0) {
            nextActor();
            return;
          }

          // Apply poison at start of this member's turn
          applyMemberPoison(member);
          if (!member.isAlive || member.hp <= 0) {
            if (isPartyWiped()) { showDeathUI(); return; }
            nextActor();
            return;
          }

          showMemberCombatUI(member, nextActor);
        }
      };

      appendCombatMsg(`—— 第 ${turn} 回合 ——`, 'info');
      nextActor();
    };

    // ── Show combat UI for a specific party member ──
    const showMemberCombatUI = (
      member: PartyMember,
      onTurnEnd: () => void,
    ) => {
      // Highlight active member
      updatePartyBars(this.state.party, this.state.party.indexOf(member));

      const memberLabel = this.state.party.length > 1 ? `${member.name}` : '你';
      const playerAtk = getAttack(this.state, ITEMS);

      const combatActions: ActionButton[] = [
        {
          text: '⚔️ 攻击',
          primary: true,
          callback: () => {
            const isLowHp = member.hp < member.maxHp * 0.2;

            // Desperate attack (25% when HP < 20%)
            if (isLowHp && Math.random() < 0.25) {
              const dmg = Math.max(1, applyDefense(playerAtk + rand(-1, 2), enemy.defense) * 3);
              enemy.currentHp -= dmg;
              appendCombatMsg(`🔥 ${memberLabel}发动濒死一击！造成 ${dmg} 点伤害！`, 'atk-player');
              refreshBars();
              onTurnEnd();
              return;
            }

            // Crit (15% + precise affix 10%)
            let critChance = 0.15;
            if (this.state.equippedWeaponAffix === 'precise') critChance += 0.1;
            let critMultiplier = 1;
            let isCrit = false;
            if (Math.random() < critChance) {
              critMultiplier = 1.5;
              isCrit = true;
            }

            // Dodge (8%)
            if (Math.random() < 0.08) {
              appendCombatMsg(`→ ${enemy.name}闪避了${memberLabel}的攻击！`, 'info');
            } else {
              const rawPlayerAtk = playerAtk + rand(-1, 2);
              const afterDef = applyDefense(rawPlayerAtk, enemy.defense);
              const dmg = Math.max(1, Math.floor(afterDef * critMultiplier));
              enemy.currentHp -= dmg;
              const pDetails: string[] = [];
              if (enemy.defense > 0) pDetails.push(`敌防-${rawPlayerAtk - afterDef}`);
              if (isCrit) pDetails.push('暴击x1.5');
              if (this.state.activeMutation === 'flesh') pDetails.push('血肉+50%');
              const pDetailStr = pDetails.length > 0 ? ` (${pDetails.join(' ')})` : '';
              if (isCrit) {
                appendCombatMsg(`💥 暴击！${memberLabel}攻击了${enemy.name}，造成 ${dmg} 点伤害${pDetailStr}`, 'atk-player');
              } else {
                appendCombatMsg(`→ ${memberLabel}攻击了${enemy.name}，造成 ${dmg} 点伤害${pDetailStr}`, 'atk-player');
              }

              // Weapon affix effects on hit — FIX C2: corrode poisons the ENEMY, not player
              if (this.state.equippedWeaponAffix === 'corrode' && dmg > 0) {
                enemy.poisonDmg = 2;
                enemy.poisonTurns = 2;
                appendCombatMsg(`🧪 腐蚀词缀：${enemy.name}被腐蚀了！(2伤害/回合, 2回合)`, 'info');
              }
              if (this.state.equippedWeaponAffix === 'vampiric' && dmg > 0) {
                const vHeal = Math.max(1, Math.floor(dmg * 0.1));
                member.hp = Math.min(member.maxHp, member.hp + vHeal);
                appendCombatMsg(`🩸 吸血词缀：${memberLabel}回复 ${vHeal} HP`, 'info');
              }
            }
            refreshBars();
            onTurnEnd();
          },
        },
        {
          text: '🛡️ 防御',
          callback: () => {
            // Defend: double defense for this member until next turn
            const ms = memberState[member.id];
            if (ms) ms.shieldActive = true;
            appendCombatMsg(`→ ${memberLabel}进入防御姿态！`, 'atk-player');
            refreshBars();
            // FIX M1: defend no longer triggers enemy turn — enemy has its own slot
            onTurnEnd();
          },
        },
        {
          text: '💊 道具',
          callback: () => this.showCombatItems(
            (usedItemId) => {
              // FIX C4: If item has combatDamage, deal it to the enemy
              const itemDef = ITEMS[usedItemId];
              if (itemDef?.combatDamage) {
                let dmg = itemDef.combatDamage;
                // Mechanical bonus (e.g. EMP grenade +30 vs mechanical enemies)
                const isMech = enemy.id.includes('mech') || enemy.id.includes('robot')
                  || enemy.id.includes('ark_') || enemy.id.includes('trap_mimic');
                if (isMech && itemDef.combatDamageMech) {
                  dmg += itemDef.combatDamageMech;
                  appendCombatMsg(`⚡ 对机械目标额外造成 ${itemDef.combatDamageMech} 点伤害！`, 'info');
                }
                // Boss weakness: item matches weakness effectValue
                if (bossWeakness && weaknessDiscovered && bossWeakness.effectType === 'item'
                    && bossWeakness.effectValue === usedItemId) {
                  dmg = Math.ceil(dmg * bossWeakness.damageMultiplier);
                  appendCombatMsg(`💡 弱点命中！伤害 x${bossWeakness.damageMultiplier}！`, 'result');
                }
                enemy.currentHp -= dmg;
                appendCombatMsg(`💥 ${itemDef.name}对${enemy.name}造成了 ${dmg} 点伤害！`, 'atk-player');
              }
              refreshBars();
              onTurnEnd();
            },
            () => { showMemberCombatUI(member, onTurnEnd); },
          ),
        },
      ];

      // Skills (use MP instead of cooldown-only)
      for (const skillId of this.state.skills) {
        const skill = SKILLS[skillId];
        if (!skill) continue;
        const cd = skillCooldowns[skillId] ?? 0;
        const mpCost = skill.mpCost ?? Math.ceil(skill.cooldown * 3);
        const hasEnoughMp = member.mp >= mpCost;
        const ready = cd <= 0 && hasEnoughMp;
        let label = `${skill.icon} ${skill.name}`;
        if (cd > 0) label += ` (${cd}回合)`;
        else if (!hasEnoughMp) label += ` (MP不足)`;
        else label += ` (${mpCost}MP)`;

        combatActions.push({
          text: label,
          disabled: !ready,
          callback: () => {
            member.mp -= mpCost;
            skillCooldowns[skillId] = skill.cooldown;
            this.executeSkill(skill, enemy, playerAtk, refreshBars, appendCombatMsg, { enemyStunned: enemy.stunned }, member,
              bossWeakness ? { effectType: bossWeakness.effectType, effectValue: bossWeakness.effectValue, damageMultiplier: bossWeakness.damageMultiplier, discovered: !!weaknessDiscovered } : undefined);

            // Apply skill state to enemy
            if (skill.effect.type === 'shield') {
              const ms2 = memberState[member.id];
              if (ms2) ms2.shieldActive = true;
            }
            if (skill.effect.type === 'debuff') enemy.weakenTurns = skill.effect.turns;
            if (skill.effect.type === 'stun') enemy.stunned = true;

            refreshBars();
            onTurnEnd();
          },
        });
      }

      // Escape
      if (canEscape(this.state)) {
        combatActions.push({
          text: '🏃 逃跑',
          danger: true,
          callback: () => {
            const chance = getEscapeChance(this.state);
            if (Math.random() < chance) {
              appendCombatMsg('你们成功脱离了战斗！', 'result');
              this.state.stamina -= 5;

              if (roomIdx >= 0) {
                this.state.savedEnemies.push({
                  roomIdx,
                  enemyId: enemyData.id,
                  currentHp: enemy.currentHp,
                });
              }

              refreshBars();
              setCombatActions([{
                text: '✅ 离开',
                primary: true,
                callback: () => {
                  exitCombat();
                  appendMessage('你逃离了战斗。敌人仍在原地。', 'narrator');
                  onEnd(true);
                },
              }]);
            } else {
              // FIX C3: escape failure damage goes through defense pipeline
              const rawDmg = enemy.attack + rand(0, 2);
              const afterDef = applyDefense(rawDmg, getDefense(this.state, ITEMS));
              const finalDmg = calcDamageTaken(this.state, afterDef);
              member.hp -= finalDmg;
              appendCombatMsg(`逃跑失败！${enemy.name}趁机攻击${memberLabel}，HP -${finalDmg}`, 'atk-enemy');

              if (member.hp <= 0) {
                member.hp = 0;
                member.isAlive = false;
                appendCombatMsg(`💀 ${member.name} 倒下了！`, 'result');
              }
              refreshBars();

              if (isPartyWiped()) {
                showDeathUI();
                return;
              }
              onTurnEnd();
            }
          },
        });
      } else {
        combatActions.push({
          text: '🏃 逃跑 (无法)',
          disabled: true,
          callback: () => {},
        });
      }

      setCombatActions(combatActions);
    };

    // Start first round
    runRound();
  }

  /** Loot corpse after enemy kill (extracted from closure for readability) */
  private lootCorpse(
    enemy: { id: string; name: string },
    refreshBars: () => void,
    exitCombat: () => void,
    onEnd: (escaped: boolean) => void,
  ) {
    const roll = Math.random();
    const finishLoot = () => {
      refreshBars();
      setCombatActions([{
        text: '✅ 继续探索',
        primary: true,
        callback: () => {
          exitCombat();
          appendMessage(`🏆 击败了${enemy.name}！`, 'loot');
          onEnd(false);
        },
      }]);
    };

    if (roll < 0.35) {
      const bonusGold = rand(5, 15);
      this.state.gold += bonusGold;
      appendCombatMsg(`💰 额外搜到了 +${bonusGold} 金币！`, 'result');
      const bonusLoot = rollLoot(this.state.floor);
      if (addItem(this.state, bonusLoot)) {
        appendCombatMsg(`🎁 还找到了【${ITEMS[bonusLoot].name}】！`, 'result');
      }
      finishLoot();
    } else if (roll < 0.50) {
      const available = JOURNAL_ENTRIES.filter(
        j => this.state.floor >= j.minFloor && !this.state.journalEntries.includes(j.id)
      );
      if (available.length > 0) {
        const entry = pick(available);
        this.state.journalEntries.push(entry.id);
        appendCombatMsg(`📜 在尸体旁发现了一份记录：【${entry.title}】`, 'result');
      } else {
        const g = rand(3, 10);
        this.state.gold += g;
        appendCombatMsg(`搜了半天只找到 ${g} 金币。`, 'result');
      }
      finishLoot();
    } else if (roll < 0.65) {
      const unknownRecipes = Object.keys(RECIPES).filter(
        r => !this.state.knownRecipes.includes(r)
      );
      if (unknownRecipes.length > 0) {
        const recipeId = pick(unknownRecipes);
        this.state.knownRecipes.push(recipeId);
        const recipe = RECIPES[recipeId];
        appendCombatMsg(`📋 在口袋里发现了制作笔记：${recipe.name}！`, 'result');
      } else {
        const g = rand(5, 12);
        this.state.gold += g;
        appendCombatMsg(`口袋里只有 ${g} 金币。`, 'result');
      }
      finishLoot();
    } else if (roll < 0.75) {
      appendCombatMsg('翻遍了全身，什么值钱的东西都没有。', 'info');
      finishLoot();
    } else if (roll < 0.85) {
      const trapDmg = rand(2, 4);
      this.state.party[0].hp -= trapDmg;
      appendCombatMsg(`尸体上绑着一根细线——是陷阱！💔 HP -${trapDmg}`, 'atk-enemy');
      if (this.state.party[0].hp <= 0) {
        this.state.party[0].hp = 0;
        this.state.party[0].isAlive = false;
        appendCombatMsg('你失去了意识……', 'result');
        setCombatActions([{
          text: '💀 …',
          danger: true,
          callback: () => { exitCombat(); this.onDeath(); },
        }]);
        return;
      }
      finishLoot();
    } else {
      appendCombatMsg('⚠️ 你搜刮得太入迷，另一个敌人偷袭了你！', 'atk-enemy');
      const ambushDmg = rand(3, 6);
      this.state.party[0].hp -= ambushDmg;
      appendCombatMsg(`💔 HP -${ambushDmg}`, 'atk-enemy');
      refreshBars();
      if (this.state.party[0].hp <= 0) {
        this.state.party[0].hp = 0;
        this.state.party[0].isAlive = false;
        appendCombatMsg('你失去了意识……', 'result');
        setCombatActions([{
          text: '💀 …',
          danger: true,
          callback: () => { exitCombat(); this.onDeath(); },
        }]);
        return;
      }
      setCombatActions([{
        text: '✅ 赶紧离开',
        primary: true,
        callback: () => {
          exitCombat();
          appendMessage(`🏆 击败了${enemy.name}，但被偷袭受伤了。`, 'loot');
          onEnd(false);
        },
      }]);
    }
  }

  private executeSkill(
    skill: typeof SKILLS[string],
    enemy: { currentHp: number; maxHp: number; defense: number; name: string; stunned?: boolean },
    playerAtk: number,
    refreshBars: () => void,
    log: (text: string, type: 'atk-player' | 'atk-enemy' | 'info' | 'result') => void,
    synergy?: { enemyStunned: boolean },
    actor?: PartyMember,
    bossWeakness?: { effectType: string; effectValue: string; damageMultiplier: number; discovered: boolean },
  ) {
    const member = actor ?? this.state.party[0];
    const eff = skill.effect;
    const mutation = this.state.activeMutation;
    // Boss weakness skill multiplier
    const weakMult = (bossWeakness?.discovered && bossWeakness.effectType === 'skill' && bossWeakness.effectValue === skill.id)
      ? bossWeakness.damageMultiplier : 1;
    if (weakMult > 1) log(`💡 弱点命中！伤害 x${weakMult}！`, 'result');
    switch (eff.type) {
      case 'damage': {
        let mult = eff.multiplier;
        if (skill.id === 'heavy_strike' && mutation === 'flesh') {
          mult = 3;
          log('🔥 血肉强化+重击联动！', 'info');
        }
        const dmg = Math.max(1, Math.floor(applyDefense(playerAtk + rand(-1, 2), enemy.defense) * mult * weakMult));
        enemy.currentHp -= dmg;
        log(`${skill.icon} ${skill.name}！造成 ${dmg} 点伤害`, 'atk-player');
        break;
      }
      case 'heal': {
        const heal = Math.min(eff.amount, member.maxHp - member.hp);
        member.hp += heal;
        log(`${skill.icon} ${skill.name}！${member.name}恢复 ${heal} HP`, 'atk-player');
        break;
      }
      case 'debuff':
        log(`${skill.icon} ${skill.name}！${enemy.name}的攻击力被削弱了！`, 'atk-player');
        break;
      case 'shield': {
        const shieldPct = mutation === 'iron' ? '70%' : '50%';
        if (mutation === 'iron') log('🔥 铁皮化+铁壁联动！减伤70%！', 'info');
        log(`${skill.icon} ${skill.name}！${member.name}下次受到的伤害将减${shieldPct}！`, 'atk-player');
        break;
      }
      case 'drain': {
        const dmg = Math.max(1, Math.floor(applyDefense(playerAtk + rand(-1, 2), enemy.defense) * eff.multiplier * weakMult));
        enemy.currentHp -= dmg;
        let healAmount = dmg;
        if (mutation === 'bloodlust') {
          healAmount = dmg * 2;
          log('🔥 嗜血本能+吸血斩联动！回复翻倍！', 'info');
        }
        const healed = Math.min(healAmount, member.maxHp - member.hp);
        member.hp += healed;
        log(`${skill.icon} ${skill.name}！造成 ${dmg} 伤害，${member.name}回复 ${healed} HP`, 'atk-player');
        break;
      }
      case 'execute': {
        const hpRatio = enemy.currentHp / enemy.maxHp;
        let threshold = eff.hpThreshold;
        if (synergy?.enemyStunned) {
          threshold = 0.5;
          log('🔥 眩晕+处决联动！阈值提升至50%！', 'info');
        }
        if (hpRatio <= threshold) {
          const execMult = enemy.maxHp >= 50 ? 3 : 5;
          const dmg = Math.max(1, Math.floor(applyDefense(playerAtk + rand(-1, 2), enemy.defense) * execMult * weakMult));
          enemy.currentHp -= dmg;
          log(`${skill.icon} ${skill.name}！致命一击，造成 ${dmg} 点伤害！`, 'atk-player');
        } else {
          const dmg = applyDefense(playerAtk + rand(-1, 2), enemy.defense);
          enemy.currentHp -= dmg;
          log(`${skill.icon} 目标HP过高，处决失败，仅造成 ${dmg} 点伤害`, 'info');
        }
        break;
      }
      case 'aoe': {
        let total = 0;
        for (let i = 0; i < 2; i++) {
          const dmg = Math.max(1, Math.floor(applyDefense(playerAtk + rand(-1, 2), enemy.defense) * eff.multiplier * weakMult));
          enemy.currentHp -= dmg;
          total += dmg;
        }
        log(`${skill.icon} ${skill.name}！两连击共造成 ${total} 点伤害`, 'atk-player');
        break;
      }
      case 'stun':
        log(`${skill.icon} ${skill.name}！${enemy.name}被击晕了！`, 'atk-player');
        break;
    }
    refreshBars();
  }

  private showCombatItems(onUse: (itemId: string) => void, onCancel: () => void) {
    // Regen mutation: can't use consumables
    if (!canUseConsumables(this.state)) {
      appendCombatMsg('🧬 再生体变异：无法使用消耗品！', 'info');
      onCancel();
      return;
    }

    const consumables = this.state.inventory.filter(inv => {
      const def = ITEMS[inv.id];
      return def && def.type === 'consumable' && inv.count > 0;
    });

    if (consumables.length === 0) {
      appendCombatMsg('没有可用的道具。', 'info');
      onCancel();
      return;
    }

    const actions: ActionButton[] = consumables.map(inv => {
      const def = ITEMS[inv.id];
      let desc = def.name;
      if (def.hpRestore) desc += ` ❤️+${def.hpRestore}`;
      if (def.hungerRestore) desc += ` 🍖+${def.hungerRestore}`;
      if (def.combatDamage) desc += ` 💥${def.combatDamage}`;
      return {
        text: `${desc} (x${inv.count})`,
        callback: () => {
          const itemId = inv.id;
          this.useConsumable(itemId);
          appendCombatMsg(`使用了【${def.name}】`, 'atk-player');
          onUse(itemId);
        },
      };
    });

    actions.push({ text: '🔙 返回', callback: onCancel });

    setCombatActions(actions);
  }

  // ==================== OUTCOME ====================

  private resolveOutcome(outcome: Outcome, onDone: () => void) {
    appendMessage(outcome.text, 'narrator');

    if (outcome.hp) {
      this.state.party[0].hp = Math.max(0, Math.min(this.state.party[0].maxHp, this.state.party[0].hp + outcome.hp));
      appendMessage(outcome.hp > 0 ? `❤️ +${outcome.hp} HP` : `💔 ${outcome.hp} HP`, outcome.hp > 0 ? 'loot' : 'combat');
    }
    if (outcome.hunger) {
      this.state.stamina = Math.max(0, Math.min(this.state.maxStamina, this.state.stamina + outcome.hunger));
      appendMessage(outcome.hunger > 0 ? `🍖 +${outcome.hunger} 体力` : `😫 ${outcome.hunger} 体力`, outcome.hunger > 0 ? 'loot' : 'combat');
    }
    if (outcome.gold) {
      this.state.gold = Math.max(0, this.state.gold + outcome.gold);
      appendMessage(outcome.gold > 0 ? `💰 +${outcome.gold}` : `💸 ${outcome.gold}`, outcome.gold > 0 ? 'loot' : 'combat');
    }
    if (outcome.item) {
      const def = ITEMS[outcome.item];
      if (def) {
        if (addItem(this.state, outcome.item)) {
          appendMessage(`🎁 获得【${def.name}】`, 'loot');
        } else {
          appendMessage(`🎁 发现了【${def.name}】，但背包已满。`, 'combat');
        }
      }
    }

    // Karma from outcome
    if (outcome.karma) {
      this.state.karma += outcome.karma;
      this.state.karmaHistory.push({
        nodeId: this.state.currentNodeId ?? 'dungeon',
        choiceId: 'event_choice',
        karmaChange: outcome.karma,
        day: this.state.day,
      });
      const label = outcome.karma > 0 ? `⚖️ 因果 +${outcome.karma}` : `⚖️ 因果 ${outcome.karma}`;
      appendMessage(label, 'system');
    }

    // Mutation from outcome
    if (outcome.mutation) {
      if (this.state.activeMutation) {
        appendMessage(`你已经有一个变异了，新的变异没有生效。`, 'system');
      } else {
        applyMutation(this.state, outcome.mutation);
        const m = MUTATIONS[outcome.mutation];
        appendMessage(`🧬 你发生了变异：${m.name}！`, 'event');
        appendMessage(`  效果：${m.benefit} | 代价：${m.cost}`, 'system');
      }
    }

    // Delayed effect
    if (outcome.delayed) {
      const d = outcome.delayed;
      this.state.delayedEffects.push({
        triggerFloor: this.state.floor + d.floorsLater,
        text: d.text,
        hp: d.hp,
        hunger: d.hunger,
        mutation: d.mutation,
      });
    }

    updateStatusBar(this.state);

    if (outcome.combat) {
      const enemy = ENEMIES[outcome.combat];
      if (enemy) {
        this.startCombat(enemy, enemy.hp, -1, () => onDone());
        return;
      }
    }

    if (this.state.party[0].hp <= 0) {
      this.onDeath();
      return;
    }

    onDone();
  }

  // ==================== INVENTORY ====================

  private showInventory(context: 'base' | 'dungeon', selectedItemId?: string) {
    showInventoryScreen(this.state);
    renderInventoryGrid(this.state, (itemId) => {
      this.showInventory(context, itemId);
    }, selectedItemId);

    // Show detail for selected item
    if (selectedItemId) {
      const def = ITEMS[selectedItemId];
      if (def) {
        const inv = this.state.inventory.find(i => i.id === selectedItemId);
        let statsHtml = '';
        if (def.type === 'weapon') statsHtml = `<span class="inv-detail-stats">⚔️ 攻击 +${def.attack}</span>`;
        if (def.type === 'armor') statsHtml = `<span class="inv-detail-stats">🛡️ 防御 +${def.defense}</span>`;
        if (def.type === 'consumable') {
          const parts: string[] = [];
          if (def.hpRestore) parts.push(`❤️ +${def.hpRestore}`);
          if (def.hungerRestore) parts.push(def.hungerRestore > 0 ? `🍖 +${def.hungerRestore}` : `🍖 ${def.hungerRestore}`);
          if (parts.length) statsHtml = `<span class="inv-detail-stats">${parts.join('  ')}</span>`;
        }
        // Show affix info
        let affixHtml = '';
        if (inv?.affix && AFFIXES[inv.affix as WeaponAffix]) {
          const aff = AFFIXES[inv.affix as WeaponAffix];
          affixHtml = `<span class="inv-detail-stats" style="color:#e8a838">✨ ${aff.name}：${aff.desc}</span>`;
        }
        const displayName = inv?.affix && AFFIXES[inv.affix as WeaponAffix]
          ? `${AFFIXES[inv.affix as WeaponAffix].prefix}${def.name}`
          : def.name;
        setInventoryDetail(
          `<div class="inv-detail-name">${def.icon} ${displayName}${inv && inv.count > 1 ? ` x${inv.count}` : ''}</div>` +
          `<div class="inv-detail-desc">${def.desc}</div>` +
          statsHtml + affixHtml
        );
        this.showItemActions(selectedItemId, context);
      }
    } else {
      setInventoryDetail('');
      const actions: ActionButton[] = [];
      if (this.state.activeMutation) {
        const m = MUTATIONS[this.state.activeMutation];
        actions.push({ text: `🧬 ${m.name}`, disabled: true, callback: () => {} });
      }
      actions.push({
        text: '🔙 返回',
        primary: true,
        callback: () => {
          hideInventoryScreen();
          if (context === 'base') {
            this.showBaseActions();
          } else {
            this.showMapView();
          }
        },
      });
      setInventoryActions(actions);
    }
  }

  private showItemActions(itemId: string, context: 'base' | 'dungeon') {
    const def = ITEMS[itemId];
    if (!def) return;

    const actions: ActionButton[] = [];

    if (def.type === 'weapon') {
      const equipped = this.state.equippedWeapon === itemId;
      const inv = this.state.inventory.find(i => i.id === itemId);
      const affixLabel = inv?.affix ? ` [${AFFIXES[inv.affix as WeaponAffix]?.name ?? ''}]` : '';
      actions.push({
        text: equipped ? '❌ 卸下' : `⚔️ 装备${affixLabel}`,
        primary: !equipped,
        callback: () => {
          if (equipped) {
            this.state.equippedWeapon = null;
            this.state.equippedWeaponAffix = null;
          } else {
            this.state.equippedWeapon = itemId;
            this.state.equippedWeaponAffix = inv?.affix ?? null;
          }
          updateStatusBar(this.state);
          this.showInventory(context, itemId);
        },
      });
    }

    if (def.type === 'armor') {
      const equipped = this.state.equippedArmor === itemId;
      const inv = this.state.inventory.find(i => i.id === itemId);
      const affixLabel = inv?.affix ? ` [${AFFIXES[inv.affix as WeaponAffix]?.name ?? ''}]` : '';
      actions.push({
        text: equipped ? '❌ 卸下' : `🛡️ 装备${affixLabel}`,
        primary: !equipped,
        callback: () => {
          if (equipped) {
            this.state.equippedArmor = null;
            this.state.equippedArmorAffix = null;
          } else {
            this.state.equippedArmor = itemId;
            this.state.equippedArmorAffix = inv?.affix ?? null;
          }
          updateStatusBar(this.state);
          this.showInventory(context, itemId);
        },
      });
    }

    if (def.type === 'consumable') {
      // Special items: signal_flare and detector (only in dungeon)
      if (itemId === 'signal_flare' && context === 'dungeon') {
        actions.push({
          text: '🚀 使用信号弹（跳过本层）',
          primary: true,
          callback: () => {
            removeItem(this.state, itemId);
            hideInventoryScreen();
            appendMessage('🚀 信号弹照亮了通往下层的路！', 'event');
            this.goDeeper();
          },
        });
      } else if (itemId === 'detector' && context === 'dungeon') {
        actions.push({
          text: '📡 使用探测器（揭示全图）',
          primary: true,
          callback: () => {
            removeItem(this.state, itemId);
            const map = this.state.map;
            if (map) {
              for (const r of map.rooms) r.explored = true;
            }
            appendMessage('📡 探测器扫描了整层！所有房间已显现。', 'loot');
            updateStatusBar(this.state);
            const still = this.state.inventory.find(i => i.id === itemId && i.count > 0);
            this.showInventory(context, still ? itemId : undefined);
          },
        });
      } else {
        const canUse = canUseConsumables(this.state);
        actions.push({
          text: canUse ? '🫗 使用' : '🫗 变异阻止',
          primary: canUse,
          disabled: !canUse,
          callback: () => {
            this.useConsumable(itemId);
            // If item still exists, keep selected
            const still = this.state.inventory.find(i => i.id === itemId && i.count > 0);
            this.showInventory(context, still ? itemId : undefined);
          },
        });
      }
    }

    actions.push({
      text: '🗑️ 丢弃',
      danger: true,
      callback: () => {
        removeItem(this.state, itemId);
        // FIX M4: also clear affix when discarding equipped items
        if (this.state.equippedWeapon === itemId) {
          this.state.equippedWeapon = null;
          this.state.equippedWeaponAffix = null;
        }
        if (this.state.equippedArmor === itemId) {
          this.state.equippedArmor = null;
          this.state.equippedArmorAffix = null;
        }
        updateStatusBar(this.state);
        this.showInventory(context);
      },
    });

    actions.push({
      text: '🔙 返回',
      callback: () => {
        hideInventoryScreen();
        if (context === 'base') {
          this.showBaseActions();
        } else {
          this.showMapView();
        }
      },
    });

    setInventoryActions(actions);
  }

  private useConsumable(itemId: string) {
    const def = ITEMS[itemId];
    if (!def) return;
    if (!canUseConsumables(this.state)) {
      appendMessage('🧬 再生体变异：无法使用消耗品！', 'combat');
      return;
    }
    if (!removeItem(this.state, itemId)) return;

    let msg = `使用了【${def.name}】`;
    if (def.hpRestore) {
      this.state.party[0].hp = Math.min(this.state.party[0].maxHp, this.state.party[0].hp + def.hpRestore);
      msg += ` ❤️+${def.hpRestore}`;
    }
    if (def.hungerRestore) {
      this.state.stamina = Math.max(0, Math.min(this.state.maxStamina, this.state.stamina + def.hungerRestore));
      if (def.hungerRestore > 0) {
        msg += ` 🍖+${def.hungerRestore}`;
      } else {
        msg += ` 🍖${def.hungerRestore}`;
      }
    }
    appendMessage(msg, 'loot');
    updateStatusBar(this.state);
  }

  // ==================== FLOOR TRANSITION ====================

  private goDeeper() {
    this.state.floor++;
    this.state.savedEnemies = []; // Clear saved enemies on new floor
    if (this.runStats && this.state.floor > this.runStats.maxFloor) {
      this.runStats.maxFloor = this.state.floor;
    }

    // Process delayed effects
    const triggered = this.state.delayedEffects.filter(d => d.triggerFloor <= this.state.floor);
    this.state.delayedEffects = this.state.delayedEffects.filter(d => d.triggerFloor > this.state.floor);

    clearMessages();

    for (const effect of triggered) {
      appendMessage('', 'divider');
      appendMessage(effect.text, 'event');
      if (effect.hp) {
        this.state.party[0].hp = Math.max(0, Math.min(this.state.party[0].maxHp, this.state.party[0].hp + effect.hp));
        appendMessage(effect.hp > 0 ? `❤️ +${effect.hp}` : `💔 ${effect.hp} HP`, effect.hp > 0 ? 'loot' : 'combat');
      }
      if (effect.hunger) {
        this.state.stamina = Math.max(0, Math.min(this.state.maxStamina, this.state.stamina + effect.hunger));
        appendMessage(effect.hunger > 0 ? `🍖 +${effect.hunger}` : `😫 ${effect.hunger} 体力`, effect.hunger > 0 ? 'loot' : 'combat');
      }
      if (effect.gold) {
        this.state.gold = Math.max(0, this.state.gold + effect.gold);
        appendMessage(effect.gold > 0 ? `💰 +${effect.gold}` : `💸 ${effect.gold}`, effect.gold > 0 ? 'loot' : 'combat');
      }
      if (effect.mutation) {
        if (!this.state.activeMutation) {
          applyMutation(this.state, effect.mutation);
          const m = MUTATIONS[effect.mutation];
          appendMessage(`🧬 延迟效果触发变异：${m.name}！`, 'event');
          appendMessage(`  效果：${m.benefit} | 代价：${m.cost}`, 'system');
        }
      }
    }

    if (this.state.party[0].hp <= 0) {
      this.onDeath();
      return;
    }

    // Track max floor + skill point reward
    if (this.state.floor > this.state.maxFloorReached) {
      this.state.maxFloorReached = this.state.floor;
      this.state.skillPoints++;
      appendMessage(`⚡ 到达新的最深层！获得 1 技能点`, 'loot');
    }

    // Auto-discover journal entries for this floor
    for (const entry of JOURNAL_ENTRIES) {
      if (this.state.floor >= entry.minFloor && !this.state.journalEntries.includes(entry.id)) {
        if (Math.random() < 0.25) {
          this.state.journalEntries.push(entry.id);
          appendMessage(`📜 你发现了一份记录：【${entry.title}】`, 'event');
        }
      }
    }

    // Track endless high floor
    if (this.state.endlessUnlocked && this.state.floor > this.state.endlessHighFloor) {
      this.state.endlessHighFloor = this.state.floor;
    }

    // Check for story events (floor 10/15/20, skip in endless mode)
    if (this.state.floor <= 20) {
      const storyEvent = STORY_EVENTS.find(se => se.floor === this.state.floor);
      if (storyEvent) {
        this.triggerStoryEvent(storyEvent);
        return;
      }
    }

    appendMessage(`你沿着通道向下走去……`, 'narrator');
    appendMessage(`—— 废墟 第${this.state.floor}层 ——`, 'system');

    const map = generateFloorMap(this.state.floor);
    this.state.map = map;

    // Darksight mutation: reveal all rooms
    if (this.state.activeMutation === 'darksight') {
      for (const room of map.rooms) {
        room.explored = true;
      }
      appendMessage('👁️ 暗视觉让你看穿了整层的布局。', 'event');
    }

    // Signal tower: reveal extra rooms
    const towerLv2 = this.state.baseLevel.signalTower;
    if (towerLv2 > 0 && this.state.activeMutation !== 'darksight') {
      const unrevealed2 = map.rooms
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.explored);
      const toReveal2 = Math.min(towerLv2, unrevealed2.length);
      for (let i = 0; i < toReveal2; i++) {
        const p = unrevealed2.splice(Math.floor(Math.random() * unrevealed2.length), 1)[0];
        map.rooms[p.i].explored = true;
      }
      if (toReveal2 > 0) {
        appendMessage(`📡 信号塔探测到了 ${toReveal2} 个房间。`, 'system');
      }
    }

    updateStatusBar(this.state);
    // Mid-dungeon auto-save
    saveState(this.state);
    this.showMapView();
  }

  // === Story Events (deep floors) ===

  private triggerStoryEvent(event: typeof STORY_EVENTS[0]) {
    appendMessage('', 'divider');
    appendMessage(`—— ${event.title} ——`, 'system');
    appendMessage(event.text, 'event');

    // Auto-grant journal
    if (event.journal && !this.state.journalEntries.includes(event.journal)) {
      this.state.journalEntries.push(event.journal);
      const entry = JOURNAL_ENTRIES.find(j => j.id === event.journal);
      if (entry) {
        appendMessage(`📜 获得日志：【${entry.title}】`, 'loot');
      }
    }

    hideMap();
    const actions: ActionButton[] = event.choices.map(choice => ({
      text: choice.text,
      callback: () => {
        appendMessage(choice.result, 'narrator');
        if (choice.hp) {
          this.state.party[0].hp = Math.max(0, Math.min(this.state.party[0].maxHp, this.state.party[0].hp + choice.hp));
          appendMessage(choice.hp > 0 ? `❤️ +${choice.hp}` : `💔 ${choice.hp} HP`, choice.hp > 0 ? 'loot' : 'combat');
        }
        if (choice.gold) {
          this.state.gold += choice.gold;
          appendMessage(`💰 +${choice.gold}`, 'loot');
        }
        if (choice.item) {
          const def = ITEMS[choice.item];
          if (def && addItem(this.state, choice.item)) {
            appendMessage(`🎁 获得【${def.name}】`, 'loot');
          }
        }
        if (choice.journal && !this.state.journalEntries.includes(choice.journal)) {
          this.state.journalEntries.push(choice.journal);
        }

        updateStatusBar(this.state);

        // Floor 20 is the final floor — unlock endless mode and show ending
        if (event.floor === 20) {
          if (!this.state.endlessUnlocked) {
            this.state.endlessUnlocked = true;
            appendMessage('🔓 无尽模式已解锁！返回营地后可进入。', 'loot');
          }
          setActions([{
            text: '🔙 返回营地',
            primary: true,
            callback: () => { this.returnToBase(); },
          }]);
          return;
        }

        // Continue to generate the floor map
        const map = generateFloorMap(this.state.floor);
        this.state.map = map;
        if (this.state.activeMutation === 'darksight') {
          for (const room of map.rooms) room.explored = true;
        }
        setActions([{
          text: '➡️ 继续探索',
          primary: true,
          callback: () => { this.showMapView(); },
        }]);
      },
    }));

    setActions(actions);
  }

  private returnToBase() {
    hideHomeButton();
    clearMessages();
    appendMessage('你沿原路返回了营地。', 'narrator');

    // Mark current node as cleared if it was a dungeon
    const nodeId = this.state.currentNodeId;
    if (nodeId && nodeId !== 'camp' && !this.state.clearedNodeIds.includes(nodeId)) {
      const node = WORLD_NODES[nodeId];
      // Only mark as cleared if it's not a boss_lair or if boss is already dead
      if (node && node.type !== 'boss_lair') {
        this.state.clearedNodeIds.push(nodeId);
        this.refreshNodeUnlocks();
      }
    }
    this.state.currentNodeId = 'camp';

    // Show exploration summary
    if (this.runStats) {
      const s = this.runStats;
      appendMessage('', 'divider');
      appendMessage('—— 探索报告 ——', 'system');
      appendMessage(`📍 到达: ${s.startFloor}F → ${s.maxFloor}F`, 'system');
      appendMessage(`⚔️ 击杀: ${s.kills} | 🚪 房间: ${s.roomsExplored} | 💰 金币: +${s.goldEarned}`, 'system');
      appendMessage('', 'divider');
      this.runStats = null;
    }

    this.showBaseActions();
  }

  // ==================== DEATH ====================

  private onDeath() {
    this.state.lifetimeDeaths++;
    hideHomeButton();
    hideMap();
    hideCombatScreen();
    appendMessage('', 'divider');
    appendMessage('💀 你倒下了……', 'combat');
    appendMessage('意识逐渐模糊，黑暗吞没了一切。', 'narrator');
    appendMessage('', 'divider');

    const actions: ActionButton[] = [];

    // Revival by item
    const hasSyringe = hasItem(this.state, 'revival_syringe');
    if (hasSyringe) {
      actions.push({
        text: '💉 使用肾上腺素针',
        primary: true,
        callback: () => {
          removeItem(this.state, 'revival_syringe');
          this.revive();
        },
      });
    }

    // Revival by ad (once per exploration run)
    if (!this.state.adReviveUsed) {
      actions.push({
        text: '📺 看广告复活',
        callback: () => {
          appendMessage('📺 广告加载中……', 'system');
          setTimeout(() => {
            this.state.adReviveUsed = true;
            this.revive();
          }, 1000);
        },
      });
    }

    // Go back to base — keep 50% gold, lose materials only
    const lostGold = Math.floor(this.state.gold * 0.5);
    const keptGold = this.state.gold - lostGold;
    appendMessage(`回到营地将失去材料和 ${lostGold} 💰，保留消耗品、装备和 ${keptGold} 💰。`, 'system');

    actions.push({
      text: '🔄 回到营地',
      callback: () => {
        this.state.party[0].maxHp = this.state.maxHpBase + this.state.baseLevel.shelter * 5;
        this.state.party[0].hp = this.state.party[0].maxHp;
        this.state.party[0].isAlive = true;
        // Revive all party members
        for (const m of this.state.party) {
          if (!m.isAlive) {
            m.isAlive = true;
            m.hp = Math.max(1, Math.floor(m.maxHp * 0.5));
          }
          m.mp = m.maxMp;
        }
        this.state.maxStamina = 100 + this.state.baseLevel.kitchen * 15;
        this.state.stamina = this.state.maxStamina;
        this.state.gold = keptGold;
        this.state.floor = 1;
        this.state.map = null;
        this.state.activeMutation = null;
        this.state.delayedEffects = [];
        this.state.savedEnemies = [];
        this.state.adReviveUsed = false;
        // Keep weapons, armor, keys, and consumables; lose materials only
        this.state.inventory = this.state.inventory.filter(inv => {
          const def = ITEMS[inv.id];
          return def && def.type !== 'material';
        });
        clearMessages();
        appendMessage('—— 废 土 归 来 ——', 'system');
        appendMessage('你从昏迷中醒来，浑身酸痛，但还活着。', 'narrator');
        saveState(this.state);
        this.showBaseActions();
      },
    });

    setActions(actions);
  }

  private revive() {
    // Revive protagonist with 30% HP
    const p = this.state.party[0];
    p.isAlive = true;
    p.hp = Math.max(1, Math.floor(p.maxHp * 0.3));
    appendMessage('💉 一阵剧痛让你重新睁开了眼！', 'event');
    appendMessage(`❤️ HP恢复到 ${p.hp}/${p.maxHp}`, 'loot');
    // Revive other party members at 1 HP
    for (const m of this.state.party) {
      if (!m.isAlive) {
        m.isAlive = true;
        m.hp = 1;
        appendMessage(`${m.name} 也恢复了意识 (1 HP)`, 'loot');
      }
    }
    updateStatusBar(this.state);

    if (this.state.map) {
      showHomeButton(() => this.returnToBase());
      this.showMapView();
    } else {
      this.showBaseActions();
    }
  }
}
