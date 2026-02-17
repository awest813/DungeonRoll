import { createInitialRun } from './bootstrap/createInitialRun';
import {
  GOLD_REWARDS,
  ITEM_DEFINITIONS,
  ITEM_REWARDS,
  RewardEntry,
  SKILL_REWARDS,
  STAT_BOOST_REWARDS,
} from '../content/gameContent';
import { Character } from '../rules/types';

export interface RunState {
  party: Character[];
  inventory: string[];
  unlockedSkills: string[];
  gold: number;
  room: number;
  roomsCleared: number;
  currentRewards: RewardEntry[];
}

export interface RunSnapshot {
  version: 1;
  runState: RunState;
}

const STORAGE_KEY = 'dungeonroll.run.v1';

export function createRunState(): RunState {
  return {
    party: createInitialRun().party,
    inventory: [],
    unlockedSkills: [],
    gold: 0,
    room: 1,
    roomsCleared: 0,
    currentRewards: [],
  };
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateRewardChoices(): RewardEntry[] {
  return [
    pickRandom(GOLD_REWARDS),
    pickRandom(ITEM_REWARDS),
    pickRandom(STAT_BOOST_REWARDS),
    pickRandom(SKILL_REWARDS),
  ];
}

export function applyRewardChoice(runState: RunState, reward: RewardEntry): void {
  switch (reward.type) {
    case 'gold':
      runState.gold += reward.value ?? 0;
      break;
    case 'item':
      if (reward.itemId && ITEM_DEFINITIONS[reward.itemId]) {
        runState.inventory.push(reward.itemId);
      }
      break;
    case 'stat_boost':
      if (!reward.stat || !reward.value) {
        return;
      }
      runState.party.forEach(hero => {
        hero[reward.stat!] += reward.value!;
        if (reward.stat === 'maxHp') {
          hero.hp += reward.value!;
        }
      });
      break;
    case 'skill_unlock':
      if (reward.skillId && !runState.unlockedSkills.includes(reward.skillId)) {
        runState.unlockedSkills.push(reward.skillId);
      }
      break;
  }

  runState.roomsCleared += 1;
  runState.room += 1;
  runState.currentRewards = [];
}

export function saveRunSnapshot(runState: RunState): void {
  const snapshot: RunSnapshot = {
    version: 1,
    runState,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadRunSnapshot(): RunState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RunSnapshot;
    if (parsed.version !== 1 || !parsed.runState) {
      return null;
    }
    return parsed.runState;
  } catch {
    return null;
  }
}

export function clearRunSnapshot(): void {
  localStorage.removeItem(STORAGE_KEY);
}
