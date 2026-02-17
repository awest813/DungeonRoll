// Pure types - no Babylon imports

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export type StatusType = 'guarding' | 'stunned' | 'poisoned' | 'buffed';
export type StatusTimingWindow = 'turnStart' | 'turnEnd';
export type StatusStackRule = 'replace' | 'stackDuration' | 'stackIntensity';

export interface StatusPayload {
  duration: number;
  value?: number;
  timingWindow: StatusTimingWindow;
  stackRule: StatusStackRule;
}

export interface StatusEffect {
  type: StatusType;
  duration: number;
  value?: number;
  stacks: number;
  timingWindow: StatusTimingWindow;
  stackRule: StatusStackRule;
}

export interface TurnResources {
  actionPoints: number;
  maxActionPoints: number;
  initiative: number;
}

export type SkillEffectType = 'damage' | 'status' | 'utility';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  apCost: number;
  effectType: SkillEffectType;
  diceExpression?: string;
  flatPower?: number;
  target: 'enemy' | 'self';
  statusPayload?: StatusPayload & { statusType: StatusType };
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  quantity: number;
  apCost: number;
  diceExpression?: string;
  flatPower?: number;
  target: 'enemy' | 'self';
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
  resources: TurnResources;
  skills: SkillDefinition[];
  items?: ItemDefinition[];
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
  resources: TurnResources;
  skills: SkillDefinition[];
  items?: ItemDefinition[];
}

export type ActionType = 'attack' | 'guard' | 'skill' | 'item' | 'wait';

export interface CombatAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
  skillId?: string;
  itemId?: string;
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
