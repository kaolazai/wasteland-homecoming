import type { GameState, PartyMember } from '../core/state';
import type { EventBus } from '../core/event-bus';

export class PartySystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Add a companion to the active party (max 4) */
  addToParty(member: PartyMember): boolean {
    if (this.state.party.length >= 4) return false;
    this.state.party.push(member);
    this.bus.emit('party-changed', { party: this.state.party });
    return true;
  }

  /** Move a party member to the bench */
  removeFromParty(memberId: string): boolean {
    if (memberId === 'protagonist') return false;
    const idx = this.state.party.findIndex(m => m.id === memberId);
    if (idx < 0) return false;
    const [removed] = this.state.party.splice(idx, 1);
    this.state.companions.push(removed);
    this.bus.emit('party-changed', { party: this.state.party });
    return true;
  }

  /** Swap a benched companion into the party */
  swapIn(companionId: string, replaceId?: string): boolean {
    const benchIdx = this.state.companions.findIndex(c => c.id === companionId);
    if (benchIdx < 0) return false;
    const companion = this.state.companions[benchIdx];

    if (this.state.party.length >= 4 && replaceId) {
      const partyIdx = this.state.party.findIndex(m => m.id === replaceId);
      if (partyIdx < 0 || replaceId === 'protagonist') return false;
      const [removed] = this.state.party.splice(partyIdx, 1, companion);
      this.state.companions.splice(benchIdx, 1);
      this.state.companions.push(removed);
    } else if (this.state.party.length < 4) {
      this.state.party.push(companion);
      this.state.companions.splice(benchIdx, 1);
    } else {
      return false;
    }

    this.bus.emit('party-changed', { party: this.state.party });
    return true;
  }

  /** Calculate effective attack for a party member */
  getAttack(member: PartyMember): number {
    let atk = member.baseAttack;
    if (member.equipment.weapon) {
      // TODO: look up item def attack
    }
    return atk;
  }

  /** Calculate effective defense for a party member */
  getDefense(member: PartyMember): number {
    let def = member.baseDefense;
    if (member.equipment.armor) {
      // TODO: look up item def defense
    }
    return def;
  }

  /** Heal all party members (camp rest) */
  restAll(): void {
    for (const m of this.state.party) {
      m.hp = m.maxHp;
      m.mp = m.maxMp;
      m.statusEffects = [];
      m.isAlive = true;
    }
  }

  /** Get the protagonist */
  getProtagonist(): PartyMember {
    return this.state.party[0];
  }

  /** Check if any party member is alive */
  isPartyAlive(): boolean {
    return this.state.party.some(m => m.isAlive);
  }
}
