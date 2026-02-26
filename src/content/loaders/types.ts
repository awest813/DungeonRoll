import { Character, Enemy, CharacterClass, SkillTargeting, SkillDamageType, StatusType, ItemEffectType, EquipmentSlot, EquipmentRarity, ElementType } from '../../rules/types';

export type EnemyAIRole = 'basic' | 'tank' | 'bruiser' | 'caster' | 'healer' | 'sniper' | 'boss';

export interface EnemyTemplate {
  id: string;
  name: string;
  hp: number;
  mp: number;
  attack: number;
  armor: number;
  speed: number;
  xpReward: number;
  goldReward: number;
  skillIds: string[];
  aiRole: EnemyAIRole;
  weakness?: ElementType;
  resistance?: ElementType;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  targeting: SkillTargeting;
  element: ElementType;
  effect: {
    damageType: SkillDamageType;
    diceExpression?: string;
    statScaling?: 'attack' | 'mp';
    scalingFactor?: number;
    statusApplied?: StatusType;
    statusDuration?: number;
    statusValue?: number;
    healDice?: string;
  };
}

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  effect: {
    type: ItemEffectType;
    value: number;
    statusCured?: StatusType;
    statusApplied?: StatusType;
    statusDuration?: number;
  };
}

export interface ClassTemplate {
  id: CharacterClass;
  name: string;
  baseHp: number;
  baseMp: number;
  baseAttack: number;
  baseArmor: number;
  baseSpeed: number;
  hpGrowth: number;
  mpGrowth: number;
  attackGrowth: number;
  armorGrowth: number;
  speedGrowth: number;
  startingSkills: string[];
  learnableSkills: { skillId: string; level: number }[];
}

export interface PartyTemplate {
  id: string;
  name: string;
  characterClass: CharacterClass;
  hp: number;
  mp: number;
  attack: number;
  armor: number;
  speed: number;
  level: number;
  skillIds: string[];
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  description: string;
  bonuses: Partial<Record<'hp' | 'mp' | 'attack' | 'armor' | 'speed', number>>;
  classRestriction: CharacterClass[];
}

export interface RoomEncounterTemplate {
  id: string;
  enemyIds: string[];
}

export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  encounters: RoomEncounterTemplate[];
  recommendedLevel: number;
  nextRooms: string[];
  dropTable: string[];
}

export interface GameContent {
  enemies: Map<string, EnemyTemplate>;
  skills: Map<string, SkillTemplate>;
  items: Map<string, ItemTemplate>;
  equipment: Map<string, EquipmentTemplate>;
  rooms: Map<string, RoomTemplate>;
  classes: Map<CharacterClass, ClassTemplate>;
}

export interface EncounterSetup {
  party: Character[];
  enemies: Enemy[];
  roomId: string;
  encounterId: string;
}
