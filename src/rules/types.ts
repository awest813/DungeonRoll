// Pure types - no Babylon imports

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export type StatusType = 'guarding' | 'stunned' | 'poisoned' | 'buffed' | 'weakened' | 'shielded' | 'regenerating';

export interface StatusEffect {
  type: StatusType;
  duration: number;
  value?: number;
}

export type CharacterClass = 'knight' | 'mage' | 'ranger' | 'cleric' | 'rogue';

export interface Character {
  id: string;
  name: string;
  characterClass: CharacterClass;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  armor: number;
  speed: number;
  attackBuff: number;  // cumulative item-granted attack bonus (capped per run)
  level: number;
  xp: number;
  xpToNext: number;
  isGuarding: boolean;
  statuses: StatusEffect[];
  skillIds: string[];
  inventory: InventoryEntry[];
  equipment: EquippedItem[];
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  armor: number;
  speed: number;
  isGuarding: boolean;
  statuses: StatusEffect[];
  skillIds: string[];
  xpReward: number;
  goldReward: number;
}

export type ActionType = 'attack' | 'guard' | 'skill' | 'item';

export interface CombatAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
  skillId?: string;
  itemId?: string;
}

export interface CombatState {
  party: Character[];
  enemies: Enemy[];
  turnNumber: number;
  isActive: boolean;
  turnOrder: string[];
  currentActorIndex: number;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  blocked: number;
  isCritical: boolean;
  isWeak: boolean;
}

export type SkillTargeting = 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self';
export type SkillDamageType = 'physical' | 'magical' | 'heal' | 'none';

export interface SkillEffect {
  damageType: SkillDamageType;
  diceExpression?: string;
  statScaling?: 'attack' | 'mp';
  scalingFactor?: number;
  statusApplied?: StatusType;
  statusDuration?: number;
  statusValue?: number;
  healDice?: string;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare';

export interface EquippedItem {
  equipmentId: string;
  slot: EquipmentSlot;
}

export type ItemEffectType = 'heal' | 'mp_restore' | 'buff' | 'cure_status' | 'damage';

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  statusCured?: StatusType;
  statusApplied?: StatusType;
  statusDuration?: number;
}
