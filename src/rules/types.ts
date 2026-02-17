// Pure types - no Babylon imports

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export type StatusType = 'guarding' | 'stunned' | 'poisoned' | 'buffed';

export interface StatusEffect {
  type: StatusType;
  duration: number;
  value?: number;
}

export interface Character {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  armor: number;
  isGuarding: boolean;
  statuses: StatusEffect[];
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  armor: number;
  isGuarding: boolean;
  statuses: StatusEffect[];
}

export type ActionType = 'attack' | 'guard';

export interface CombatAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
}

export interface CombatState {
  party: Character[];
  enemy: Enemy | null;
  turnNumber: number;
  isActive: boolean;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  blocked: number;
}
