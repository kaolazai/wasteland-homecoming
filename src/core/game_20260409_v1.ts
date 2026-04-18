import {
  PlayerState, createInitialState, saveState, loadState, clearSave,
  getAttack, getDefense, addItem, removeItem, hasItem,
} from './state';
import {
  updateStatusBar, appendMessage, clearMessages, setActions, renderMap, hideMap,
  showCombatScreen, hideCombatScreen, updateCombatBars, appendCombatMsg, setCombatActions,
  type ActionButton,
} from '../ui/renderer';
import { EXPLORE_EVENTS, ENEMIES, TRADER_STOCK, weightedPick, type Outcome, type EnemyData } from '../data/events';
import { ITEMS, rollLoot, LOOT_TABLES } from '../data/items';
import { generateFloorMap, getRoomDescription, type FloorMap } from '../data/maps';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class Game {
  state: PlayerState;

  constructor() {
    this.state = loadState() ?? createInitialState();
  }

  start() {
    updateStatusBar(this.state);
    clearMessages();
    hideMap();

    if (this.state.map) {
      // Resume from save
      appendMessage('—— 废 土 归 来 ——', 'system');
      appendMessage('你从短暂的休息中醒来，继续探索……', 'narrator');
      this.showMapView();
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
    saveState(this.state);
    hideMap();
    appendMessage('', 'divider');
    appendMessage('【营 地】', 'system');
    appendMessage('篝火噼啪作响，这里暂时是安全的。', 'narrator');
    updateStatusBar(this.state);

    const actions: ActionButton[] = [
      { text: '🏚️ 出发探索', primary: true, callback: () => this.enterDungeon() },
      { text: '😴 休息', disabled: this.state.hp >= this.state.maxHp, callback: () => this.rest() },
      { text: '🎒 背包', callback: () => this.showInventory('base') },
    ];

    // Base buildings
    const buildings: { key: 'armory' | 'kitchen' | 'shelter'; icon: string; name: string; desc: string }[] = [
      { key: 'armory', icon: '⚔️', name: '武器库', desc: '攻击+2' },
      { key: 'kitchen', icon: '🍳', name: '厨房', desc: '最大饱食+20' },
      { key: 'shelter', icon: '🛖', name: '避难所', desc: '最大HP+5' },
    ];

    for (const b of buildings) {
      const lv = this.state.baseLevel[b.key];
      if (lv < 3) {
        const cost = (lv + 1) * 30;
        actions.push({
          text: `${b.icon} ${b.name} Lv${lv}→${lv + 1} (${cost}💰)`,
          disabled: this.state.gold < cost,
          callback: () => this.upgradeBuilding(b.key, b.name, cost),
        });
      } else {
        actions.push({ text: `${b.icon} ${b.name} MAX`, disabled: true, callback: () => {} });
      }
    }

    setActions(actions);
  }

  private upgradeBuilding(key: 'armory' | 'kitchen' | 'shelter', name: string, cost: number) {
    this.state.gold -= cost;
    this.state.baseLevel[key]++;
    const lv = this.state.baseLevel[key];
    appendMessage(`🔨 ${name}升级到 Lv.${lv}！`, 'loot');

    if (key === 'armory') {
      appendMessage(`⚔️ 基础攻击力 +2`, 'system');
    } else if (key === 'kitchen') {
      this.state.maxHunger += 20;
      this.state.hunger = Math.min(this.state.hunger + 20, this.state.maxHunger);
      appendMessage(`🍖 最大饱食度 +20`, 'system');
    } else {
      this.state.maxHp += 5;
      this.state.hp = Math.min(this.state.hp + 5, this.state.maxHp);
      appendMessage(`❤️ 最大生命 +5`, 'system');
    }

    updateStatusBar(this.state);
    this.showBaseActions();
  }

  private rest() {
    const heal = 5 + this.state.baseLevel.shelter * 3;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + heal);
    this.state.hunger = Math.max(0, this.state.hunger - 15);
    appendMessage(`你休息了一会儿。❤️ +${heal} HP，🍖 -15 饱食`, 'narrator');
    if (this.state.hunger <= 0) {
      appendMessage('⚠️ 你已经饿得不行了，必须出去找吃的……', 'combat');
    }
    updateStatusBar(this.state);
    this.showBaseActions();
  }

  // ==================== DUNGEON / MAP ====================

  private enterDungeon() {
    clearMessages();
    appendMessage(`—— 废墟 第${this.state.floor}层 ——`, 'system');
    appendMessage('你推开沉重的门，走进废墟深处……', 'narrator');

    const map = generateFloorMap(this.state.floor);
    this.state.map = map;
    this.showMapView();
  }

  private showMapView() {
    const map = this.state.map!;
    updateStatusBar(this.state);
    renderMap(map, (roomIdx) => this.moveToRoom(roomIdx));

    // Show current room info + actions
    const currentRoom = map.rooms[map.playerPos];
    const actions: ActionButton[] = [
      { text: '🎒 背包', callback: () => this.showInventory('dungeon') },
    ];

    if (currentRoom.type === 'stairs' && currentRoom.explored) {
      actions.unshift({ text: '⬇️ 进入下一层', primary: true, callback: () => this.goDeeper() });
    }

    actions.push({ text: '🏠 返回营地', danger: true, callback: () => this.returnToBase() });

    setActions(actions);
  }

  private moveToRoom(roomIdx: number) {
    const map = this.state.map!;

    // Consume resources
    this.state.turns++;
    this.state.hunger -= 3;
    if (this.state.hunger <= 0) {
      this.state.hunger = 0;
      this.state.hp -= 2;
      appendMessage('⚠️ 你饿得头晕眼花…… (HP -2)', 'combat');
    }

    if (this.state.hp <= 0) {
      this.onDeath();
      return;
    }

    // Move player
    map.playerPos = roomIdx;
    const room = map.rooms[roomIdx];
    room.explored = true;

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
        this.handleEnemyRoom(room);
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
        this.handleEnemyRoom(room);
        break;
      default:
        room.cleared = true;
        this.showMapView();
    }
  }

  // ==================== ROOM HANDLERS ====================

  private handleLootRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
    appendMessage(getRoomDescription(room), 'event');
    const lootId = rollLoot(this.state.floor);
    const item = ITEMS[lootId];
    if (item) {
      addItem(this.state, lootId);
      appendMessage(`🎁 获得了【${item.name}】！`, 'loot');
    }
    const gold = rand(2, 8 + this.state.floor * 2);
    this.state.gold += gold;
    appendMessage(`💰 +${gold}`, 'loot');
    room.cleared = true;
    updateStatusBar(this.state);
    this.showMapView();
  }

  private handleEnemyRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
    const enemyId = room.enemyId ?? 'mutant_rat';
    const enemyData = ENEMIES[enemyId];
    if (!enemyData) {
      room.cleared = true;
      this.showMapView();
      return;
    }
    appendMessage(getRoomDescription(room), 'event');
    appendMessage(`⚠️ ${enemyData.name}出现了！`, 'combat');
    appendMessage(`"${enemyData.desc}"`, 'narrator');
    this.startCombat(enemyData, () => {
      room.cleared = true;
      this.showMapView();
    });
  }

  private handleEventRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
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

  private handleTraderRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
    appendMessage(getRoomDescription(room), 'event');
    this.showTraderUI(room);
  }

  private showTraderUI(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
    const actions: ActionButton[] = [];

    // Buy items
    const stock = TRADER_STOCK.buy.filter(() => Math.random() < 0.6).slice(0, 4);
    if (stock.length === 0) stock.push('bandage', 'canned_food');

    for (const itemId of stock) {
      const item = ITEMS[itemId];
      if (!item) continue;
      const price = Math.ceil(item.price * 1.5);
      actions.push({
        text: `买 ${item.name} (${price}💰)`,
        disabled: this.state.gold < price,
        callback: () => {
          this.state.gold -= price;
          addItem(this.state, itemId);
          appendMessage(`🛒 买入【${item.name}】`, 'loot');
          updateStatusBar(this.state);
          this.showTraderUI(room);
        },
      });
    }

    // Sell materials
    const sellable = this.state.inventory.filter(inv => {
      const def = ITEMS[inv.id];
      return def && def.type === 'material' && inv.count > 0;
    });
    for (const inv of sellable) {
      const def = ITEMS[inv.id];
      const price = Math.floor(def.price * TRADER_STOCK.sellMultiplier);
      if (price <= 0) continue;
      actions.push({
        text: `卖 ${def.name}x${inv.count} (${price * inv.count}💰)`,
        callback: () => {
          this.state.gold += price * inv.count;
          removeItem(this.state, inv.id, inv.count);
          appendMessage(`💰 卖出【${def.name}】x${inv.count}，获得 ${price * inv.count} 金币`, 'loot');
          updateStatusBar(this.state);
          this.showTraderUI(room);
        },
      });
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

  private handleRestRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
    appendMessage(getRoomDescription(room), 'event');
    hideMap();

    setActions([
      {
        text: '😴 休息 (❤️ +10, 🍖 -10)',
        primary: true,
        callback: () => {
          this.state.hp = Math.min(this.state.maxHp, this.state.hp + 10);
          this.state.hunger = Math.max(0, this.state.hunger - 10);
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
            addItem(this.state, lootId);
            appendMessage(`你在枕头底下发现了【${ITEMS[lootId].name}】`, 'loot');
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

  private handleLockedRoom(room: ReturnType<typeof generateFloorMap>['rooms'][0]) {
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
          // Rich loot
          const n = rand(2, 3);
          for (let i = 0; i < n; i++) {
            const id = pick(LOOT_TABLES.rare);
            addItem(this.state, id);
            appendMessage(`🎁 获得【${ITEMS[id].name}】`, 'loot');
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
        this.state.hp -= 5;
        appendMessage('你用力撞开了门，肩膀疼得厉害。(HP -5)', 'combat');
        if (this.state.hp <= 0) { this.onDeath(); return; }
        const id = rollLoot(this.state.floor);
        addItem(this.state, id);
        appendMessage(`🎁 获得【${ITEMS[id].name}】`, 'loot');
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

  // ==================== COMBAT ====================

  private startCombat(enemyData: EnemyData, onWin: () => void) {
    const enemy = { ...enemyData, currentHp: enemyData.hp };
    let turn = 1;

    // Switch to combat screen
    showCombatScreen(enemy.name, enemy.desc);
    updateCombatBars(enemy.currentHp, enemy.hp, this.state.hp, this.state.maxHp);
    appendCombatMsg(`—— 战斗开始 ——`, 'info');

    const exitCombat = () => {
      hideCombatScreen();
    };

    const refreshBars = () => {
      updateCombatBars(enemy.currentHp, enemy.hp, this.state.hp, this.state.maxHp);
      updateStatusBar(this.state);
    };

    const showCombatUI = (showTurnHeader = true) => {
      if (showTurnHeader) appendCombatMsg(`—— 第 ${turn} 回合 ——`, 'info');
      const playerAtk = getAttack(this.state, ITEMS);
      const playerDef = getDefense(this.state, ITEMS);

      setCombatActions([
        {
          text: '⚔️ 攻击',
          primary: true,
          callback: () => {
            const dmg = Math.max(1, playerAtk - enemy.defense + rand(-1, 2));
            enemy.currentHp -= dmg;
            appendCombatMsg(`→ 你攻击了${enemy.name}，造成 ${dmg} 点伤害`, 'atk-player');
            refreshBars();

            if (enemy.currentHp <= 0) {
              appendCombatMsg(`${enemy.name}倒下了！`, 'result');
              const gold = rand(enemy.goldDrop[0], enemy.goldDrop[1]);
              this.state.gold += gold;
              appendCombatMsg(`💰 +${gold} 金币`, 'result');
              if (Math.random() < enemy.lootChance) {
                const lootId = rollLoot(this.state.floor);
                addItem(this.state, lootId);
                appendCombatMsg(`🎁 获得【${ITEMS[lootId].name}】`, 'result');
              }
              refreshBars();
              setCombatActions([{
                text: '✅ 继续探索',
                primary: true,
                callback: () => {
                  exitCombat();
                  appendMessage(`🏆 击败了${enemy.name}！`, 'loot');
                  onWin();
                },
              }]);
              return;
            }

            // Enemy turn
            const eDmg = Math.max(1, enemy.attack - playerDef + rand(-1, 1));
            this.state.hp -= eDmg;
            appendCombatMsg(`← ${enemy.name}反击，你受到 ${eDmg} 点伤害`, 'atk-enemy');
            refreshBars();

            if (this.state.hp <= 0) {
              appendCombatMsg(`你失去了意识……`, 'result');
              setCombatActions([{
                text: '💀 …',
                danger: true,
                callback: () => { exitCombat(); this.onDeath(); },
              }]);
              return;
            }
            turn++;
            showCombatUI();
          },
        },
        {
          text: '🛡️ 防御',
          callback: () => {
            const reduced = Math.max(0, enemy.attack - playerDef * 2 + rand(-1, 1));
            this.state.hp -= reduced;
            if (reduced === 0) {
              appendCombatMsg(`→ 你严密防御，完全挡住了攻击！`, 'atk-player');
            } else {
              appendCombatMsg(`→ 你进行防御，仅受到 ${reduced} 点伤害`, 'atk-player');
            }
            refreshBars();

            if (this.state.hp <= 0) {
              appendCombatMsg(`你失去了意识……`, 'result');
              setCombatActions([{
                text: '💀 …',
                danger: true,
                callback: () => { exitCombat(); this.onDeath(); },
              }]);
              return;
            }
            turn++;
            showCombatUI();
          },
        },
        {
          text: '💊 道具',
          callback: () => this.showCombatItems(
            // onUse: item used, enemy gets free attack then next turn
            () => {
              refreshBars();
              const playerDef2 = getDefense(this.state, ITEMS);
              const eDmg = Math.max(1, enemy.attack - playerDef2 + rand(-1, 1));
              this.state.hp -= eDmg;
              appendCombatMsg(`← ${enemy.name}趁机攻击，你受到 ${eDmg} 点伤害`, 'atk-enemy');
              refreshBars();

              if (this.state.hp <= 0) {
                appendCombatMsg(`你失去了意识……`, 'result');
                setCombatActions([{
                  text: '💀 …',
                  danger: true,
                  callback: () => { exitCombat(); this.onDeath(); },
                }]);
                return;
              }
              turn++;
              showCombatUI();
            },
            // onCancel: go back to combat actions without losing a turn
            () => { showCombatUI(false); },
          ),
        },
        {
          text: '🏃 逃跑',
          danger: true,
          callback: () => {
            if (Math.random() < 0.5) {
              appendCombatMsg('你成功脱离了战斗！', 'result');
              this.state.hunger -= 5;
              refreshBars();
              setCombatActions([{
                text: '✅ 离开',
                primary: true,
                callback: () => {
                  exitCombat();
                  appendMessage('你逃离了战斗。', 'narrator');
                  onWin();
                },
              }]);
            } else {
              const dmg = Math.max(1, enemy.attack + rand(0, 2));
              this.state.hp -= dmg;
              appendCombatMsg(`逃跑失败！${enemy.name}趁机攻击，HP -${dmg}`, 'atk-enemy');
              refreshBars();

              if (this.state.hp <= 0) {
                appendCombatMsg(`你失去了意识……`, 'result');
                setCombatActions([{
                  text: '💀 …',
                  danger: true,
                  callback: () => { exitCombat(); this.onDeath(); },
                }]);
                return;
              }
              turn++;
              showCombatUI();
            }
          },
        },
      ]);
    };

    showCombatUI();
  }

  private showCombatItems(onUse: () => void, onCancel: () => void) {
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
      return {
        text: `${desc} (x${inv.count})`,
        callback: () => {
          this.useConsumable(inv.id);
          appendCombatMsg(`使用了【${def.name}】`, 'atk-player');
          onUse();
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
      this.state.hp = Math.max(0, Math.min(this.state.maxHp, this.state.hp + outcome.hp));
      appendMessage(outcome.hp > 0 ? `❤️ +${outcome.hp} HP` : `💔 ${outcome.hp} HP`, outcome.hp > 0 ? 'loot' : 'combat');
    }
    if (outcome.hunger) {
      this.state.hunger = Math.max(0, Math.min(this.state.maxHunger, this.state.hunger + outcome.hunger));
      appendMessage(outcome.hunger > 0 ? `🍖 +${outcome.hunger} 饱食` : `😫 ${outcome.hunger} 饱食`, outcome.hunger > 0 ? 'loot' : 'combat');
    }
    if (outcome.gold) {
      this.state.gold = Math.max(0, this.state.gold + outcome.gold);
      appendMessage(outcome.gold > 0 ? `💰 +${outcome.gold}` : `💸 ${outcome.gold}`, outcome.gold > 0 ? 'loot' : 'combat');
    }
    if (outcome.item) {
      const def = ITEMS[outcome.item];
      if (def) {
        addItem(this.state, outcome.item);
        appendMessage(`🎁 获得【${def.name}】`, 'loot');
      }
    }

    updateStatusBar(this.state);

    if (outcome.combat) {
      const enemy = ENEMIES[outcome.combat];
      if (enemy) {
        this.startCombat(enemy, onDone);
        return;
      }
    }

    if (this.state.hp <= 0) {
      this.onDeath();
      return;
    }

    onDone();
  }

  // ==================== INVENTORY ====================

  private showInventory(context: 'base' | 'dungeon') {
    hideMap();
    clearMessages();
    appendMessage('—— 🎒 背包 ——', 'system');

    // Equipment
    const wep = this.state.equippedWeapon ? ITEMS[this.state.equippedWeapon] : null;
    const arm = this.state.equippedArmor ? ITEMS[this.state.equippedArmor] : null;
    appendMessage(`武器: ${wep ? `【${wep.name}】⚔️+${wep.attack}` : '空手'}`, 'narrator');
    appendMessage(`护甲: ${arm ? `【${arm.name}】🛡️+${arm.defense}` : '无'}`, 'narrator');
    appendMessage('', 'divider');

    if (this.state.inventory.length === 0) {
      appendMessage('背包空空如也。', 'system');
    }

    const actions: ActionButton[] = [];

    for (const inv of this.state.inventory) {
      const def = ITEMS[inv.id];
      if (!def || inv.count <= 0) continue;

      let label = `${def.name} x${inv.count}`;
      if (def.type === 'weapon') label += ` (⚔️+${def.attack})`;
      if (def.type === 'armor') label += ` (🛡️+${def.defense})`;

      actions.push({
        text: label,
        callback: () => this.handleItemAction(inv.id, context),
      });
    }

    actions.push({
      text: '🔙 返回',
      primary: true,
      callback: () => {
        clearMessages();
        if (context === 'base') {
          this.showBaseActions();
        } else {
          this.showMapView();
        }
      },
    });

    setActions(actions);
  }

  private handleItemAction(itemId: string, context: 'base' | 'dungeon') {
    const def = ITEMS[itemId];
    if (!def) return;

    hideMap();
    appendMessage('', 'divider');
    appendMessage(`【${def.name}】${def.desc}`, 'event');

    const actions: ActionButton[] = [];

    if (def.type === 'weapon') {
      const equipped = this.state.equippedWeapon === itemId;
      actions.push({
        text: equipped ? '❌ 卸下' : '⚔️ 装备',
        primary: !equipped,
        callback: () => {
          if (equipped) {
            this.state.equippedWeapon = null;
            appendMessage(`卸下了【${def.name}】`, 'system');
          } else {
            // Unequip old
            this.state.equippedWeapon = itemId;
            appendMessage(`装备了【${def.name}】⚔️+${def.attack}`, 'loot');
          }
          updateStatusBar(this.state);
          this.showInventory(context);
        },
      });
    }

    if (def.type === 'armor') {
      const equipped = this.state.equippedArmor === itemId;
      actions.push({
        text: equipped ? '❌ 卸下' : '🛡️ 装备',
        primary: !equipped,
        callback: () => {
          if (equipped) {
            this.state.equippedArmor = null;
            appendMessage(`卸下了【${def.name}】`, 'system');
          } else {
            this.state.equippedArmor = itemId;
            appendMessage(`装备了【${def.name}】🛡️+${def.defense}`, 'loot');
          }
          updateStatusBar(this.state);
          this.showInventory(context);
        },
      });
    }

    if (def.type === 'consumable') {
      actions.push({
        text: '🫗 使用',
        primary: true,
        callback: () => {
          this.useConsumable(itemId);
          this.showInventory(context);
        },
      });
    }

    actions.push({
      text: '🗑️ 丢弃',
      danger: true,
      callback: () => {
        removeItem(this.state, itemId);
        if (this.state.equippedWeapon === itemId) this.state.equippedWeapon = null;
        if (this.state.equippedArmor === itemId) this.state.equippedArmor = null;
        appendMessage(`丢弃了【${def.name}】`, 'system');
        updateStatusBar(this.state);
        this.showInventory(context);
      },
    });

    actions.push({ text: '🔙 返回', callback: () => this.showInventory(context) });

    setActions(actions);
  }

  private useConsumable(itemId: string) {
    const def = ITEMS[itemId];
    if (!def) return;
    if (!removeItem(this.state, itemId)) return;

    let msg = `使用了【${def.name}】`;
    if (def.hpRestore) {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + def.hpRestore);
      msg += ` ❤️+${def.hpRestore}`;
    }
    if (def.hungerRestore) {
      this.state.hunger = Math.min(this.state.maxHunger, this.state.hunger + def.hungerRestore);
      msg += ` 🍖+${def.hungerRestore}`;
    }
    appendMessage(msg, 'loot');
    updateStatusBar(this.state);
  }

  // ==================== FLOOR TRANSITION ====================

  private goDeeper() {
    this.state.floor++;
    clearMessages();
    appendMessage(`你沿着通道向下走去……`, 'narrator');
    appendMessage(`—— 废墟 第${this.state.floor}层 ——`, 'system');
    const map = generateFloorMap(this.state.floor);
    this.state.map = map;
    this.showMapView();
  }

  private returnToBase() {
    clearMessages();
    appendMessage('你沿原路返回了营地。', 'narrator');
    this.showBaseActions();
  }

  // ==================== DEATH ====================

  private onDeath() {
    hideMap();
    appendMessage('', 'divider');
    appendMessage('💀 你倒下了……', 'combat');
    appendMessage('意识逐渐模糊，黑暗吞没了一切。', 'narrator');
    appendMessage('', 'divider');

    const keptGold = Math.floor(this.state.gold * 0.3);
    appendMessage(`同伴找回了你的部分遗物：${keptGold} 💰`, 'system');
    appendMessage('⚒️ 基地设施保留', 'system');

    setActions([
      {
        text: '🔄 重新振作',
        primary: true,
        callback: () => {
          this.state.hp = this.state.maxHp;
          this.state.hunger = this.state.maxHunger;
          this.state.gold = keptGold;
          this.state.floor = 1;
          this.state.map = null;
          // Keep equipment and base levels, lose consumables & materials
          this.state.inventory = this.state.inventory.filter(inv => {
            const def = ITEMS[inv.id];
            return def && (def.type === 'weapon' || def.type === 'armor');
          });
          clearMessages();
          appendMessage('—— 废 土 归 来 ——', 'system');
          appendMessage('你从昏迷中醒来，浑身酸痛，但还活着。', 'narrator');
          this.showBaseActions();
        },
      },
      {
        text: '🗑️ 彻底重来',
        danger: true,
        callback: () => {
          clearSave();
          this.state = createInitialState();
          clearMessages();
          this.start();
        },
      },
    ]);
  }
}
