export type RoomType =
  | 'empty'
  | 'start'
  | 'loot'
  | 'enemy'
  | 'event'
  | 'trader'
  | 'rest'
  | 'stairs'
  | 'locked'
  | 'boss'
  | 'gambler'
  | 'cursed_chest'
  | 'demon'
  | 'fake_rest'
  | 'fake_loot';

export interface Room {
  type: RoomType;
  explored: boolean;
  cleared: boolean;
  /** For display */
  label: string;
  /** Optional enemy id */
  enemyId?: string;
  /** Connected rooms (indices) */
  connections: number[];
}

export interface FloorMap {
  rooms: Room[];
  cols: number;
  rows: number;
  playerPos: number;
}

const ROOM_ICONS: Record<RoomType, string> = {
  empty: '·',
  start: '★',
  loot: '◆',
  enemy: '☠',
  event: '?',
  trader: '$',
  rest: '♥',
  stairs: '▼',
  locked: '🔒',
  boss: '👹',
  gambler: '🎲',
  cursed_chest: '📦',
  demon: '👁',
  fake_rest: '♥',   // looks identical to rest
  fake_loot: '◆',   // looks identical to loot
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateFloorMap(floor: number): FloorMap {
  const cols = 5;
  const rows = 5;
  const total = cols * rows;

  // Create rooms
  const rooms: Room[] = Array.from({ length: total }, () => ({
    type: 'empty' as RoomType,
    explored: false,
    cleared: false,
    label: '·',
    connections: [],
  }));

  // Build connections — grid-based with some random removals for maze feel
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      // Connect right
      if (c < cols - 1) {
        const right = idx + 1;
        if (Math.random() < 0.75) {
          rooms[idx].connections.push(right);
          rooms[right].connections.push(idx);
        }
      }
      // Connect down
      if (r < rows - 1) {
        const down = idx + cols;
        if (Math.random() < 0.75) {
          rooms[idx].connections.push(down);
          rooms[down].connections.push(idx);
        }
      }
    }
  }

  // Ensure connectivity via BFS — add missing connections
  ensureConnectivity(rooms, cols, rows);

  // Place start (top-left area) and stairs (bottom-right area)
  const startIdx = 0;
  const stairsIdx = total - 1;

  rooms[startIdx].type = 'start';
  rooms[startIdx].label = ROOM_ICONS.start;
  rooms[startIdx].explored = true;
  rooms[startIdx].cleared = true;

  rooms[stairsIdx].type = 'stairs';
  rooms[stairsIdx].label = ROOM_ICONS.stairs;

  // Distribute room types to remaining rooms
  const freeIndices = shuffle(
    Array.from({ length: total }, (_, i) => i).filter(i => i !== startIdx && i !== stairsIdx)
  );

  // Room type distribution based on floor
  const distribution: RoomType[] = [];
  const enemyCount = Math.min(3 + floor, 8);
  const lootCount = Math.min(2 + Math.floor(floor / 2), 5);
  const eventCount = rand(3, 5);

  for (let i = 0; i < enemyCount; i++) distribution.push('enemy');
  for (let i = 0; i < lootCount; i++) distribution.push('loot');
  for (let i = 0; i < eventCount; i++) distribution.push('event');
  distribution.push('trader');
  distribution.push('rest');
  if (floor >= 3) distribution.push('locked');
  if (floor % 5 === 0 && floor > 0) distribution.push('boss');

  // New room types (every 2-3 floors)
  if (floor >= 2) distribution.push('gambler');
  if (floor >= 2) distribution.push('cursed_chest');
  if (floor >= 3 && Math.random() < 0.5) distribution.push('demon');

  // Disguised rooms (fake_rest / fake_loot appear as normal)
  if (floor >= 3 && Math.random() < 0.4) distribution.push('fake_rest');
  if (floor >= 3 && Math.random() < 0.4) distribution.push('fake_loot');

  for (let i = 0; i < freeIndices.length; i++) {
    const idx = freeIndices[i];
    const type = distribution[i] ?? 'empty';
    rooms[idx].type = type;
    rooms[idx].label = ROOM_ICONS[type];

    if (type === 'enemy') {
      rooms[idx].enemyId = pickEnemyForFloor(floor);
    }
    if (type === 'boss') {
      rooms[idx].enemyId = pickBossForFloor(floor);
    }
    if (type === 'fake_rest') {
      rooms[idx].enemyId = 'ambush_hunter';
    }
    if (type === 'fake_loot') {
      rooms[idx].enemyId = 'trap_mimic';
    }
  }

  // Reveal rooms connected to start
  for (const conn of rooms[startIdx].connections) {
    rooms[conn].explored = true;
  }

  return { rooms, cols, rows, playerPos: startIdx };
}

function ensureConnectivity(rooms: Room[], cols: number, rows: number): void {
  const total = cols * rows;
  const visited = new Set<number>();
  const queue = [0];
  visited.add(0);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const next of rooms[curr].connections) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Connect unvisited nodes to nearest visited neighbor
  for (let i = 0; i < total; i++) {
    if (visited.has(i)) continue;

    const r = Math.floor(i / cols);
    const c = i % cols;
    const neighbors: number[] = [];
    if (c > 0) neighbors.push(i - 1);
    if (c < cols - 1) neighbors.push(i + 1);
    if (r > 0) neighbors.push(i - cols);
    if (r < rows - 1) neighbors.push(i + cols);

    // Find a visited neighbor
    let connected = false;
    for (const n of shuffle(neighbors)) {
      if (visited.has(n)) {
        if (!rooms[i].connections.includes(n)) {
          rooms[i].connections.push(n);
          rooms[n].connections.push(i);
        }
        visited.add(i);
        queue.push(i);
        connected = true;
        break;
      }
    }

    // If no visited neighbor, force connect to any neighbor
    if (!connected && neighbors.length > 0) {
      const n = neighbors[0];
      if (!rooms[i].connections.includes(n)) {
        rooms[i].connections.push(n);
        rooms[n].connections.push(i);
      }
    }
  }

  // Re-run BFS to make sure
  visited.clear();
  const q2 = [0];
  visited.add(0);
  while (q2.length > 0) {
    const curr = q2.shift()!;
    for (const next of rooms[curr].connections) {
      if (!visited.has(next)) {
        visited.add(next);
        q2.push(next);
      }
    }
  }

  // Last resort — force-connect remaining
  for (let i = 0; i < total; i++) {
    if (!visited.has(i)) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const neighbors: number[] = [];
      if (c > 0) neighbors.push(i - 1);
      if (c < cols - 1) neighbors.push(i + 1);
      if (r > 0) neighbors.push(i - cols);
      if (r < rows - 1) neighbors.push(i + cols);
      if (neighbors.length > 0) {
        const n = neighbors[0];
        rooms[i].connections.push(n);
        rooms[n].connections.push(i);
      }
    }
  }
}

function pickEnemyForFloor(floor: number): string {
  // Weighted pool: [id, weight]
  const pool: Array<[string, number]> = [];
  // 1F: mostly rats, some spiders
  pool.push(['mutant_rat', floor <= 2 ? 5 : (floor <= 4 ? 2 : 1)]);
  pool.push(['mutant_spider', floor <= 2 ? 3 : (floor <= 4 ? 2 : 1)]);
  // 2F+: dogs & bandits
  if (floor >= 2) {
    pool.push(['wasteland_dog', floor <= 3 ? 3 : 2]);
    pool.push(['bandit', floor >= 3 ? 3 : 1]);
  }
  // 3F+: transition enemies (bridge between early and mid)
  if (floor >= 3) {
    pool.push(['rust_crawler', floor <= 5 ? 4 : 1]);
    pool.push(['scavenger', floor <= 5 ? 3 : 1]);
  }
  // 5F+: mid-tier (was 4F, pushed up slightly)
  if (floor >= 5) {
    pool.push(['feral_ghoul', 3]);
    pool.push(['raider_elite', floor >= 6 ? 3 : 1]);
  }
  // 8F+: late-game
  if (floor >= 8) {
    pool.push(['mutant_bear', 3]);
    pool.push(['shadow_stalker', 2]);
  }
  // 10F+: deep zone
  if (floor >= 10) {
    pool.push(['rad_scorpion', 3]);
    pool.push(['hive_mother', 2]);
  }
  // 13F+: military zone
  if (floor >= 13) {
    pool.push(['patrol_mech', 3]);
  }
  // 16F+: lab zone
  if (floor >= 16) {
    pool.push(['whitecoat', 4]);
  }

  // Elite variant: 15% chance on floor 6+ to buff a random enemy
  const totalWeight = pool.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * totalWeight;
  let picked = pool[0][0];
  for (const [id, w] of pool) {
    r -= w;
    if (r <= 0) { picked = id; break; }
  }

  // Mark elite with prefix (handled in startCombat)
  if (floor >= 6 && Math.random() < 0.15) {
    return 'elite_' + picked;
  }
  return picked;
}

function pickBossForFloor(floor: number): string {
  if (floor <= 5) return 'warlord';
  if (floor <= 14) return 'mutant_king';
  // Floor 15+ and endless mode: cycle through bosses with elite prefix for scaling
  if (floor > 20 && floor % 10 === 0) return 'elite_ark_guardian';
  if (floor > 20) return 'elite_mutant_king';
  return 'ark_guardian';
}

export function getRoomDescription(room: Room): string {
  const descs: Record<RoomType, string[]> = {
    empty: [
      '这里空荡荡的，只有灰尘和沉默。',
      '一间被洗劫一空的房间，什么也没剩下。',
      '走廊尽头是一堵坍塌的墙壁，无路可走。',
      '房间里只有几把破椅子和满地的碎玻璃。',
    ],
    start: ['你的起始位置。地上还留着你来时的脚印。'],
    loot: [
      '你发现了一些散落的物资！',
      '柜子里还有一些没被拿走的东西。',
      '角落里有一个没打开的箱子。',
      '地上散落着一些有用的东西。',
    ],
    enemy: [
      '这里弥漫着一股危险的气息……',
      '你听到黑暗中传来低沉的吼声。',
      '地上有新鲜的血迹，有什么东西就在附近。',
    ],
    event: [
      '这个地方似乎有些不寻常……',
      '你注意到了一些奇怪的痕迹。',
      '空气中有股说不清的味道。',
    ],
    trader: [
      '一个用铁皮搭起的小摊位，后面坐着一个带兜帽的人。',
      '"嘿，过来看看，我这儿有好货。"',
    ],
    rest: [
      '这里相对安全，有一张勉强能躺的行军床。',
      '一个隐蔽的角落，可以稍作休整。',
    ],
    stairs: [
      '这里有一条通往更深处的通道，黑漆漆的看不到底。',
    ],
    locked: [
      '一扇上了锁的铁门，看起来需要钥匙或者暴力破解。',
    ],
    boss: [
      '空气沉重得令人窒息。前方是一片巨大的空地，有什么东西正在等待着你……',
    ],
    gambler: [
      '一张折叠桌上摆着骰子和扑克牌，有人在招呼你过去。',
    ],
    cursed_chest: [
      '房间中央有一个散发诡异光芒的宝箱。',
    ],
    demon: [
      '黑暗中有两点红光在注视着你。',
    ],
    fake_rest: [
      '这里看起来很安全，有一张整洁的行军床。',
    ],
    fake_loot: [
      '你发现了一个闪闪发光的箱子！',
    ],
  };
  const arr = descs[room.type];
  return arr[Math.floor(Math.random() * arr.length)];
}

export { ROOM_ICONS };
