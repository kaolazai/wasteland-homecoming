import type { GameState, InventoryItem, PartyMember } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class InventorySystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Count occupied inventory slots (by stacks, not total items) */
  getUsedSlots(): number {
    return this.state.inventory.length;
  }

  isFull(): boolean {
    return this.getUsedSlots() >= this.state.inventorySlots;
  }

  addItem(itemId: string, count = 1, affix?: string): boolean {
    const existing = this.state.inventory.find(i => i.id === itemId && i.affix === affix);
    if (existing) {
      existing.count += count;
    } else {
      if (this.isFull()) return false;
      this.state.inventory.push({ id: itemId, count, affix });
    }
    this.bus.emit('inventory-changed');
    return true;
  }

  removeItem(itemId: string, count = 1): boolean {
    const existing = this.state.inventory.find(i => i.id === itemId);
    if (!existing || existing.count < count) return false;
    existing.count -= count;
    if (existing.count <= 0) {
      this.state.inventory = this.state.inventory.filter(i => i !== existing);
    }
    this.bus.emit('inventory-changed');
    return true;
  }

  hasItem(itemId: string): boolean {
    return this.state.inventory.some(i => i.id === itemId && i.count > 0);
  }

  /** Equip an item to a party member; unequip existing first */
  equip(memberId: string, itemId: string, slot: 'weapon' | 'armor' | 'accessory'): boolean {
    const member = this.state.party.find(m => m.id === memberId);
    if (!member) return false;
    const item = this.state.inventory.find(i => i.id === itemId);
    if (!item) return false;

    // Unequip current
    const current = member.equipment[slot];
    if (current) {
      this.addItem(current.id, 1, current.affix);
    }

    // Equip new
    member.equipment[slot] = { id: item.id, count: 1, affix: item.affix };
    this.removeItem(itemId, 1);
    this.bus.emit('equipment-changed', { memberId, slot });
    return true;
  }

  /** Unequip a slot, returning item to inventory */
  unequip(memberId: string, slot: 'weapon' | 'armor' | 'accessory'): boolean {
    const member = this.state.party.find(m => m.id === memberId);
    if (!member) return false;
    const current = member.equipment[slot];
    if (!current) return false;
    this.addItem(current.id, 1, current.affix);
    member.equipment[slot] = null;
    this.bus.emit('equipment-changed', { memberId, slot });
    return true;
  }

  /** Discard an item — unequip first if equipped (fixes M4) */
  discard(itemId: string): void {
    // Check if any party member has this equipped
    for (const m of this.state.party) {
      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        if (m.equipment[slot]?.id === itemId) {
          m.equipment[slot] = null;
        }
      }
    }
    this.state.inventory = this.state.inventory.filter(i => i.id !== itemId);
    this.bus.emit('inventory-changed');
  }
}
