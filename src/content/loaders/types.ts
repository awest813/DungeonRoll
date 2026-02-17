import { Character, Enemy } from '../../rules/types';

export interface EnemyTemplate {
  id: string;
  name: string;
  hp: number;
  attack: number;
  armor: number;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
}

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  effect: {
    type: 'heal';
    value: number;
  };
}

export interface PartyTemplate {
  id: string;
  name: string;
  hp: number;
  attack: number;
  armor: number;
}

export interface RoomEncounterTemplate {
  id: string;
  enemyId: string;
}

export interface RoomTemplate {
  id: string;
  name: string;
  party: PartyTemplate[];
  encounters: RoomEncounterTemplate[];
}

export interface GameContent {
  enemies: Map<string, EnemyTemplate>;
  skills: Map<string, SkillTemplate>;
  items: Map<string, ItemTemplate>;
  rooms: Map<string, RoomTemplate>;
}

export interface EncounterSetup {
  party: Character[];
  enemy: Enemy;
  roomId: string;
  encounterId: string;
}
