import { Character, Enemy } from '../../rules/types';

export interface InitialRun {
  party: Character[];
  enemy: Enemy;
}

export function createInitialRun(): InitialRun {
  const party: Character[] = [
    {
      id: 'hero1',
      name: 'Knight',
      hp: 30,
      maxHp: 30,
      attack: 5,
      armor: 3,
      isGuarding: false,
      statuses: [],
    },
    {
      id: 'hero2',
      name: 'Mage',
      hp: 20,
      maxHp: 20,
      attack: 7,
      armor: 1,
      isGuarding: false,
      statuses: [],
    },
    {
      id: 'hero3',
      name: 'Ranger',
      hp: 25,
      maxHp: 25,
      attack: 6,
      armor: 2,
      isGuarding: false,
      statuses: [],
    },
  ];

  const enemy: Enemy = {
    id: 'goblin1',
    name: 'Goblin Chief',
    hp: 40,
    maxHp: 40,
    attack: 4,
    armor: 2,
    isGuarding: false,
    statuses: [],
  };

  return { party, enemy };
}
