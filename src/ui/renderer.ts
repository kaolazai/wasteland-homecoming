import type { GameState, InventoryItem } from '../core/state';
import type { FloorMap } from '../data/maps';
import { ITEMS } from '../data/items';
import { ENEMIES } from '../data/events';
import { getAttack, getDefense, getInventoryUsed } from '../core/state';
import { ROOM_ICONS } from '../data/maps';

// === DOM refs ===
const sceneLog = document.getElementById('scene-log')!;
const actionsEl = document.getElementById('actions')!;
const hpBar = document.getElementById('hp-bar')!;
const hpText = document.getElementById('hp-text')!;
const staminaBar = document.getElementById('stamina-bar')!;
const staminaText = document.getElementById('stamina-text')!;
const floorText = document.getElementById('floor-text')!;
const goldText = document.getElementById('gold-text')!;
const atkText = document.getElementById('atk-text')!;
const defText = document.getElementById('def-text')!;
const dayText = document.getElementById('day-text')!;
const karmaText = document.getElementById('karma-text')!;
const karmaTag = document.getElementById('karma-tag')!;
const mapContainer = document.getElementById('map-container')!;

let btnHome = document.getElementById('btn-home')!;
let btnBag = document.getElementById('btn-bag')!;

export function showHomeButton(onConfirm: () => void): void {
  btnHome.classList.remove('hidden');
  const newBtn = btnHome.cloneNode(true) as HTMLElement;
  btnHome.parentNode!.replaceChild(newBtn, btnHome);
  btnHome = newBtn;
  newBtn.addEventListener('click', () => {
    showConfirm('确定要返回营地吗？\n当前探索进度将丢失。', () => {
      newBtn.classList.add('hidden');
      onConfirm();
    });
  });
}

export function hideHomeButton(): void {
  btnHome.classList.add('hidden');
}

export function setBagButtonCallback(onClick: () => void): void {
  const newBtn = btnBag.cloneNode(true) as HTMLElement;
  btnBag.parentNode!.replaceChild(newBtn, btnBag);
  btnBag = newBtn;
  newBtn.addEventListener('click', onClick);
}

export function showConfirm(message: string, onYes: () => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>${message.replace(/\n/g, '<br>')}</p>
      <div class="confirm-btns">
        <button class="btn danger" id="confirm-yes">确定</button>
        <button class="btn" id="confirm-no">取消</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-yes')!.addEventListener('click', () => {
    overlay.remove();
    onYes();
  });
  overlay.querySelector('#confirm-no')!.addEventListener('click', () => {
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

export function updateStatusBar(state: GameState): void {
  const p = state.party[0];
  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
  hpBar.style.width = hpPct + '%';
  hpBar.style.background = hpPct > 50 ? 'var(--hp)' : hpPct > 25 ? '#aaaa33' : 'var(--danger)';
  hpText.textContent = `${p.hp}/${p.maxHp}`;

  const staminaPct = Math.max(0, (state.stamina / state.maxStamina) * 100);
  staminaBar.style.width = staminaPct + '%';
  staminaBar.style.background = staminaPct > 30 ? 'var(--hunger)' : 'var(--danger)';
  staminaText.textContent = `${state.stamina}`;

  floorText.textContent = `${state.floor}F`;
  goldText.textContent = `${state.gold}`;
  dayText.textContent = `${state.day}`;

  const atk = getAttack(state, ITEMS);
  const def = getDefense(state, ITEMS);
  atkText.textContent = `${atk}`;
  defText.textContent = `${def}`;

  // Karma display
  const k = state.karma;
  karmaText.textContent = `${k}`;
  karmaTag.className = k > 20 ? 'tag karma-good' : k < -20 ? 'tag karma-evil' : 'tag karma-neutral';
}

export type MsgType = 'narrator' | 'event' | 'combat' | 'loot' | 'system' | 'divider';

export function appendMessage(text: string, type: MsgType = 'narrator'): void {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  if (type !== 'divider') {
    div.textContent = text;
  }
  sceneLog.appendChild(div);
  scrollToBottom();
}

export function scrollToBottom(): void {
  requestAnimationFrame(() => {
    const scene = document.getElementById('scene')!;
    scene.scrollTop = scene.scrollHeight;
  });
}

export function clearMessages(): void {
  sceneLog.innerHTML = '';
}

export interface ActionButton {
  text: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  callback: () => void;
}

export function setActions(buttons: ActionButton[]): void {
  actionsEl.innerHTML = '';
  const rows: ActionButton[][] = [];
  let row: ActionButton[] = [];
  for (const btn of buttons) {
    row.push(btn);
    if (row.length >= 3) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) rows.push(row);

  for (const r of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'action-row';
    for (const btn of r) {
      const el = document.createElement('button');
      el.className = 'btn';
      if (btn.primary) el.classList.add('primary');
      if (btn.danger) el.classList.add('danger');
      if (btn.disabled) el.disabled = true;
      el.textContent = btn.text;
      el.addEventListener('click', btn.callback);
      rowEl.appendChild(el);
    }
    actionsEl.appendChild(rowEl);
  }
  scrollToBottom();
}

// === Map Rendering ===
export function renderMap(map: FloorMap, onMoveToRoom: (roomIdx: number) => void, signalTowerLevel = 0): void {
  mapContainer.innerHTML = '';
  mapContainer.style.display = 'grid';
  mapContainer.style.gridTemplateColumns = `repeat(${map.cols}, 1fr)`;

  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const idx = r * map.cols + c;
      const room = map.rooms[idx];
      const cell = document.createElement('div');
      cell.className = 'map-cell';

      const isPlayer = idx === map.playerPos;
      const isConnected = map.rooms[map.playerPos].connections.includes(idx);

      if (isPlayer) {
        cell.classList.add('current');
        cell.textContent = '🧑';
      } else if (room.explored) {
        cell.textContent = room.cleared ? (room.type === 'stairs' ? ROOM_ICONS.stairs : '·') : ROOM_ICONS[room.type] || '·';
        if (room.type === 'enemy' && !room.cleared) {
          cell.classList.add('danger');
          // Show danger level when signal tower >= 2
          const baseEnemyId = room.enemyId?.startsWith('elite_') ? room.enemyId.slice(6) : room.enemyId;
          if (signalTowerLevel >= 2 && baseEnemyId && ENEMIES[baseEnemyId]) {
            const e = ENEMIES[baseEnemyId];
            const atkBonus = room.enemyId?.startsWith('elite_') ? 2 : 0;
            const totalAtk = e.attack + atkBonus;
            if (totalAtk <= 4) cell.classList.add('danger-low');
            else if (totalAtk <= 8) cell.classList.add('danger-mid');
            else cell.classList.add('danger-high');
          }
        }
        if (room.type === 'loot' && !room.cleared) cell.classList.add('loot');
        if (room.type === 'fake_loot' && !room.cleared) cell.classList.add('loot'); // disguised
        if (room.type === 'trader') cell.classList.add('trader');
        if (room.type === 'rest') cell.classList.add('rest');
        if (room.type === 'fake_rest' && !room.cleared) cell.classList.add('rest'); // disguised
        if (room.type === 'stairs') cell.classList.add('stairs');
        if (room.type === 'event' && !room.cleared) cell.classList.add('event');
        if (room.type === 'boss' && !room.cleared) cell.classList.add('boss');
        if (room.type === 'locked' && !room.cleared) cell.classList.add('locked');
        if (room.type === 'gambler') cell.classList.add('gambler');
        if (room.type === 'cursed_chest' && !room.cleared) cell.classList.add('cursed');
        if (room.type === 'demon') cell.classList.add('demon');
      } else {
        cell.textContent = ' ';
        cell.classList.add('fog');
      }

      // Draw connection lines
      if (room.explored || isPlayer) {
        if (room.connections.includes(idx + 1) && c < map.cols - 1) cell.classList.add('conn-right');
        if (room.connections.includes(idx + map.cols) && r < map.rows - 1) cell.classList.add('conn-down');
      }

      // Clickable if adjacent connected
      if (isConnected && !isPlayer) {
        cell.classList.add('reachable');
        cell.addEventListener('click', () => onMoveToRoom(idx));
      }

      mapContainer.appendChild(cell);
    }
  }
}

export function hideMap(): void {
  mapContainer.style.display = 'none';
  mapContainer.innerHTML = '';
}

// === Combat Screen ===
const combatScreen = document.getElementById('combat-screen')!;
const sceneEl = document.getElementById('scene')!;
const enemyNameEl = document.getElementById('enemy-name')!;
const enemyDescEl = document.getElementById('enemy-desc')!;
const enemyBarsEl = document.getElementById('enemy-bars')!;
const combatPartyBarsEl = document.getElementById('combat-party-bars')!;
const combatTurnOrderEl = document.getElementById('combat-turn-order')!;
const combatLog = document.getElementById('combat-log')!;
const combatActionsEl = document.getElementById('combat-actions')!;

export interface CombatEnemy {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
}

export function showCombatScreen(enemyName: string, enemyDesc: string): void {
  hideMap();
  sceneEl.classList.add('hidden');
  actionsEl.classList.add('hidden');
  combatScreen.classList.remove('hidden');
  combatLog.innerHTML = '';
  enemyNameEl.textContent = enemyName;
  enemyDescEl.textContent = enemyDesc;
}

export function hideCombatScreen(): void {
  combatScreen.classList.add('hidden');
  sceneEl.classList.remove('hidden');
  actionsEl.classList.remove('hidden');
}

/** Render enemy HP bars (supports multiple enemies) */
export function updateEnemyBars(enemies: CombatEnemy[]): void {
  enemyBarsEl.innerHTML = '';
  for (const e of enemies) {
    const pct = Math.max(0, (e.currentHp / e.maxHp) * 100);
    const row = document.createElement('div');
    row.className = 'combat-bar-row';
    row.innerHTML = `
      <span class="combat-label">${enemies.length > 1 ? e.name : 'HP'}</span>
      <div class="combat-bar"><div class="combat-bar-fill enemy" style="width:${pct}%"></div></div>
      <span class="combat-val">${Math.max(0, e.currentHp)} / ${e.maxHp}</span>`;
    enemyBarsEl.appendChild(row);
  }
}

/** Render party HP/MP bars */
export function updatePartyBars(
  party: Array<{ name: string; hp: number; maxHp: number; mp: number; maxMp: number; isAlive: boolean }>,
  activeIdx?: number,
): void {
  combatPartyBarsEl.innerHTML = '';
  for (let i = 0; i < party.length; i++) {
    const m = party[i];
    const hpPct = Math.max(0, (m.hp / m.maxHp) * 100);
    const row = document.createElement('div');
    row.className = 'party-bar-row';
    const nameClass = !m.isAlive ? 'member-name dead' : i === activeIdx ? 'member-name active' : 'member-name';
    const barBg = hpPct > 50
      ? 'linear-gradient(90deg, #338833, #44aa44)'
      : hpPct > 25
        ? 'linear-gradient(90deg, #888833, #aaaa44)'
        : 'linear-gradient(90deg, #883333, #aa4444)';
    row.innerHTML = `
      <span class="${nameClass}">${m.name}</span>
      <div class="combat-bar"><div class="combat-bar-fill player" style="width:${hpPct}%;background:${barBg}"></div></div>
      <span class="combat-val">${Math.max(0, m.hp)}/${m.maxHp}</span>
      <span class="member-mp">MP${m.mp}</span>`;
    combatPartyBarsEl.appendChild(row);
  }
}

/** Show turn order indicator */
export function updateTurnOrder(names: string[], currentIdx: number): void {
  combatTurnOrderEl.textContent = '行动序: ' + names.map((n, i) => i === currentIdx ? `[${n}]` : n).join(' → ');
}

/** Legacy compat: update single enemy + single player bars */
export function updateCombatBars(
  enemyHp: number, enemyMaxHp: number,
  playerHp: number, playerMaxHp: number,
): void {
  updateEnemyBars([{ id: '_', name: 'HP', currentHp: enemyHp, maxHp: enemyMaxHp }]);
  updatePartyBars([{ name: '幸存者', hp: playerHp, maxHp: playerMaxHp, mp: 0, maxMp: 0, isAlive: playerHp > 0 }]);
}

export type CombatMsgType = 'atk-player' | 'atk-enemy' | 'info' | 'result';

export function appendCombatMsg(text: string, type: CombatMsgType = 'info'): void {
  const div = document.createElement('div');
  div.className = `combat-msg ${type}`;
  div.textContent = text;
  combatLog.appendChild(div);
  requestAnimationFrame(() => {
    combatLog.scrollTop = combatLog.scrollHeight;
  });
}

export function setCombatActions(buttons: ActionButton[]): void {
  combatActionsEl.innerHTML = '';
  const rows: ActionButton[][] = [];
  let row: ActionButton[] = [];
  for (const btn of buttons) {
    row.push(btn);
    if (row.length >= 3) { rows.push(row); row = []; }
  }
  if (row.length > 0) rows.push(row);

  for (const r of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'action-row';
    for (const btn of r) {
      const el = document.createElement('button');
      el.className = 'btn';
      if (btn.primary) el.classList.add('primary');
      if (btn.danger) el.classList.add('danger');
      if (btn.disabled) el.disabled = true;
      el.textContent = btn.text;
      el.addEventListener('click', btn.callback);
      rowEl.appendChild(el);
    }
    combatActionsEl.appendChild(rowEl);
  }
}

// === Inventory Screen ===
const inventoryScreen = document.getElementById('inventory-screen')!;
const invSlotsEl = document.getElementById('inv-slots')!;
const invWeaponEl = document.getElementById('inv-weapon')!;
const invArmorEl = document.getElementById('inv-armor')!;
const invGridEl = document.getElementById('inv-grid')!;
const invDetailEl = document.getElementById('inv-detail')!;
const invActionsEl = document.getElementById('inv-actions')!;

export function showInventoryScreen(state: GameState): void {
  hideMap();
  sceneEl.classList.add('hidden');
  actionsEl.classList.add('hidden');
  combatScreen.classList.add('hidden');
  inventoryScreen.classList.remove('hidden');

  // Update slot count
  invSlotsEl.textContent = `${getInventoryUsed(state)}/${state.inventorySlots}`;

  // Update equip slots
  const wep = state.equippedWeapon ? ITEMS[state.equippedWeapon] : null;
  const arm = state.equippedArmor ? ITEMS[state.equippedArmor] : null;

  const wepNameEl = invWeaponEl.querySelector('.inv-equip-name')!;
  wepNameEl.textContent = wep ? `${wep.icon} ${wep.name} +${wep.attack}` : '空手';
  invWeaponEl.classList.toggle('equipped', !!wep);

  const armNameEl = invArmorEl.querySelector('.inv-equip-name')!;
  armNameEl.textContent = arm ? `${arm.icon} ${arm.name} +${arm.defense}` : '无';
  invArmorEl.classList.toggle('equipped', !!arm);
}

export function hideInventoryScreen(): void {
  inventoryScreen.classList.add('hidden');
  sceneEl.classList.remove('hidden');
  actionsEl.classList.remove('hidden');
}

export function renderInventoryGrid(
  state: GameState,
  onSlotClick: (itemId: string) => void,
  selectedItemId?: string,
): void {
  invGridEl.innerHTML = '';

  // Group inventory by type
  const typeOrder: Record<string, number> = { weapon: 0, armor: 1, consumable: 2, material: 3, key: 4 };
  const typeLabels: Record<string, string> = { weapon: '⚔️ 武器', armor: '🛡️ 防具', consumable: '🧪 消耗品', material: '🔩 材料', key: '🔑 特殊' };

  const sorted = [...state.inventory].filter(inv => inv.count > 0 && ITEMS[inv.id]).sort((a, b) => {
    const da = ITEMS[a.id], db = ITEMS[b.id];
    const oa = typeOrder[da?.type ?? 'key'] ?? 9;
    const ob = typeOrder[db?.type ?? 'key'] ?? 9;
    return oa - ob;
  });

  // Render items grouped by category
  let lastType = '';
  for (const inv of sorted) {
    const def = ITEMS[inv.id];
    if (!def) continue;

    // Add category header when type changes
    if (def.type !== lastType) {
      lastType = def.type;
      const header = document.createElement('div');
      header.className = 'inv-category-header';
      header.textContent = typeLabels[def.type] ?? def.type;
      invGridEl.appendChild(header);
    }

    const slot = document.createElement('div');
    slot.className = 'inv-slot filled';

    const isEquipped = state.equippedWeapon === inv.id || state.equippedArmor === inv.id;
    if (isEquipped) slot.classList.add('equipped-mark');
    if (selectedItemId === inv.id) slot.classList.add('selected');

    const icon = document.createElement('span');
    icon.className = 'inv-slot-icon';
    icon.textContent = def.icon;
    slot.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'inv-slot-name';
    name.textContent = def.name;
    slot.appendChild(name);

    if (inv.count > 1) {
      const count = document.createElement('span');
      count.className = 'inv-slot-count';
      count.textContent = `x${inv.count}`;
      slot.appendChild(count);
    }

    if (isEquipped) {
      const badge = document.createElement('span');
      badge.className = 'inv-slot-equip-badge';
      badge.textContent = 'E';
      slot.appendChild(badge);
    }

    slot.addEventListener('click', () => onSlotClick(inv.id));
    invGridEl.appendChild(slot);
  }

  // Render empty slots
  const used = getInventoryUsed(state);
  const empty = Math.max(0, state.inventorySlots - used);
  for (let i = 0; i < empty; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    invGridEl.appendChild(slot);
  }
}

export function setInventoryDetail(html: string): void {
  invDetailEl.innerHTML = html;
}

export function setInventoryActions(buttons: ActionButton[]): void {
  invActionsEl.innerHTML = '';
  const rows: ActionButton[][] = [];
  let row: ActionButton[] = [];
  for (const btn of buttons) {
    row.push(btn);
    if (row.length >= 3) { rows.push(row); row = []; }
  }
  if (row.length > 0) rows.push(row);

  for (const r of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'action-row';
    for (const btn of r) {
      const el = document.createElement('button');
      el.className = 'btn';
      if (btn.primary) el.classList.add('primary');
      if (btn.danger) el.classList.add('danger');
      if (btn.disabled) el.disabled = true;
      el.textContent = btn.text;
      el.addEventListener('click', btn.callback);
      rowEl.appendChild(el);
    }
    invActionsEl.appendChild(rowEl);
  }
}
