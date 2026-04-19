import type { GameState, PartyMember } from '../core/state';
import type { EventBus } from '../core/event-bus';
import { JOBS } from '../data/jobs';

export class JobSystem {
  constructor(private state: GameState, private bus: EventBus) {}

  /** Change a party member's job */
  changeJob(memberId: string, jobId: string): boolean {
    // Stub — Phase 4
    return false;
  }

  /** Get available jobs for a party member */
  getAvailableJobs(member: PartyMember): string[] {
    // Stub
    return [];
  }

  /** Award SP to all party members */
  awardSP(amount: number): void {
    for (const m of this.state.party) {
      m.sp += amount;
    }
    this.bus.emit('sp-gained', { amount });
  }
}
