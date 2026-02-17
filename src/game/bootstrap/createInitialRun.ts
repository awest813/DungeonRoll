import { createEncounterFromRoom } from '../../content/loaders';
import { EncounterSetup, GameContent } from '../../content/loaders/types';

const INITIAL_ROOM_ID = 'entry-hall';
const INITIAL_ENCOUNTER_ID = 'entry-hall-goblin';

export interface InitialRun extends EncounterSetup {}

export function createInitialRun(content: GameContent): InitialRun {
  return createEncounterFromRoom(content, INITIAL_ROOM_ID, INITIAL_ENCOUNTER_ID);
}
