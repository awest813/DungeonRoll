export type RewardType = 'gold' | 'item' | 'stat_boost' | 'skill_unlock';

export interface ItemEffect {
  type: 'heal' | 'damage' | 'armor_boost';
  value: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  consumable: boolean;
  effect: ItemEffect;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
}

export interface RewardEntry {
  id: string;
  type: RewardType;
  label: string;
  value?: number;
  stat?: 'maxHp' | 'attack' | 'armor';
  itemId?: string;
  skillId?: string;
}

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  healing_potion: {
    id: 'healing_potion',
    name: 'Healing Potion',
    description: 'Restore 12 HP to one hero.',
    consumable: true,
    effect: { type: 'heal', value: 12 },
  },
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    description: 'Deal 10 damage to the enemy.',
    consumable: true,
    effect: { type: 'damage', value: 10 },
  },
  iron_tonic: {
    id: 'iron_tonic',
    name: 'Iron Tonic',
    description: 'Grant +2 armor for this combat to one hero.',
    consumable: true,
    effect: { type: 'armor_boost', value: 2 },
  },
};

export const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    description: 'Unlocks a heavy bash technique (placeholder unlock).',
  },
  arcane_focus: {
    id: 'arcane_focus',
    name: 'Arcane Focus',
    description: 'Unlocks improved spell focus (placeholder unlock).',
  },
};

export const GOLD_REWARDS: RewardEntry[] = [
  { id: 'gold_small', type: 'gold', label: '+20 Gold', value: 20 },
  { id: 'gold_medium', type: 'gold', label: '+35 Gold', value: 35 },
];

export const ITEM_REWARDS: RewardEntry[] = Object.values(ITEM_DEFINITIONS).map(item => ({
  id: `item_${item.id}`,
  type: 'item',
  label: `Item: ${item.name}`,
  itemId: item.id,
}));

export const STAT_BOOST_REWARDS: RewardEntry[] = [
  { id: 'stat_hp', type: 'stat_boost', label: 'Party Max HP +2', stat: 'maxHp', value: 2 },
  { id: 'stat_attack', type: 'stat_boost', label: 'Party Attack +1', stat: 'attack', value: 1 },
  { id: 'stat_armor', type: 'stat_boost', label: 'Party Armor +1', stat: 'armor', value: 1 },
];

export const SKILL_REWARDS: RewardEntry[] = Object.values(SKILL_DEFINITIONS).map(skill => ({
  id: `skill_${skill.id}`,
  type: 'skill_unlock',
  label: `Unlock Skill: ${skill.name}`,
  skillId: skill.id,
}));
