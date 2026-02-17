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
      resources: { actionPoints: 2, maxActionPoints: 2, initiative: 7 },
      skills: [
        {
          id: 'shield-bash',
          name: 'Shield Bash',
          description: 'A heavy strike that can stun the enemy.',
          apCost: 2,
          effectType: 'status',
          target: 'enemy',
          statusPayload: {
            statusType: 'stunned',
            duration: 1,
            timingWindow: 'turnStart',
            stackRule: 'replace',
          },
        },
      ],
      items: [{ id: 'potion', name: 'Potion', description: 'Restore 8 HP.', quantity: 1, apCost: 1, flatPower: 8, target: 'self' }],
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
      resources: { actionPoints: 2, maxActionPoints: 2, initiative: 9 },
      skills: [
        {
          id: 'firebolt',
          name: 'Firebolt',
          description: 'Deal spell damage.',
          apCost: 2,
          effectType: 'damage',
          diceExpression: '1d8',
          flatPower: 2,
          target: 'enemy',
        },
      ],
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
      resources: { actionPoints: 2, maxActionPoints: 2, initiative: 8 },
      skills: [
        {
          id: 'poison-arrow',
          name: 'Poison Arrow',
          description: 'Apply poison over time.',
          apCost: 2,
          effectType: 'status',
          target: 'enemy',
          statusPayload: {
            statusType: 'poisoned',
            duration: 3,
            value: 2,
            timingWindow: 'turnEnd',
            stackRule: 'stackIntensity',
          },
        },
      ],
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
    resources: { actionPoints: 2, maxActionPoints: 2, initiative: 6 },
    skills: [],
  };

  return { party, enemy };
}
