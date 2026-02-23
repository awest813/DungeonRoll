import { Character, Enemy, CharacterClass, SkillTargeting, SkillDamageType, StatusType, ItemEffectType } from '../../rules/types';

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
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  targeting: SkillTargeting;
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

export interface RoomEncounterTemplate {
  id: string;
  enemyIds: string[];
}

export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  party: PartyTemplate[];
  encounters: RoomEncounterTemplate[];
  recommendedLevel: number;
}

export interface GameContent {
  enemies: Map<string, EnemyTemplate>;
  skills: Map<string, SkillTemplate>;
  items: Map<string, ItemTemplate>;
  rooms: Map<string, RoomTemplate>;
  classes: Map<CharacterClass, ClassTemplate>;
}

export interface EncounterSetup {
  party: Character[];
  enemies: Enemy[];
  roomId: string;
  encounterId: string;
}
