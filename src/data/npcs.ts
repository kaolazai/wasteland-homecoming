/** Camp NPC definitions — split from journal.ts */

export interface NpcDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlockCondition: {
    type: 'day' | 'clear_node' | 'quest' | 'none';
    value?: string | number;
  };
  dialogues: string[][];
}

// Skeleton — will be populated from journal.ts data in Phase 1
export const CAMP_NPCS: Record<string, NpcDef> = {};
