import { NarrativeEventTemplate, EventChoiceTemplate, EventOutcomeTemplate, EventEffectTemplate } from './types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

function loadEffect(raw: unknown, path: string): EventEffectTemplate {
  const row = expectObject(raw, path);
  const type = expectString(row.type, `${path}.type`);

  const effect: EventEffectTemplate = {
    type: type as EventEffectTemplate['type'],
  };

  if (row.value !== undefined) effect.value = expectNumber(row.value, `${path}.value`);
  if (row.target !== undefined) effect.target = expectString(row.target, `${path}.target`) as 'party' | 'single';
  if (row.itemId !== undefined) effect.itemId = expectString(row.itemId, `${path}.itemId`);
  if (row.quantity !== undefined) effect.quantity = expectNumber(row.quantity, `${path}.quantity`);
  if (row.statusType !== undefined) effect.statusType = expectString(row.statusType, `${path}.statusType`);
  if (row.duration !== undefined) effect.duration = expectNumber(row.duration, `${path}.duration`);

  return effect;
}

function loadOutcome(raw: unknown, path: string): EventOutcomeTemplate {
  const row = expectObject(raw, path);

  const effectsRaw = expectArray(row.effects, `${path}.effects`);
  const effects = effectsRaw.map((e, i) => loadEffect(e, `${path}.effects[${i}]`));

  return {
    chance: expectNumber(row.chance, `${path}.chance`),
    effects,
    message: expectString(row.message, `${path}.message`),
  };
}

function loadChoice(raw: unknown, path: string): EventChoiceTemplate {
  const row = expectObject(raw, path);

  const outcomesRaw = expectArray(row.outcomes, `${path}.outcomes`);
  const outcomes = outcomesRaw.map((o, i) => loadOutcome(o, `${path}.outcomes[${i}]`));

  const choice: EventChoiceTemplate = {
    id: expectString(row.id, `${path}.id`),
    label: expectString(row.label, `${path}.label`),
    description: expectString(row.description, `${path}.description`),
    outcomes,
  };

  if (row.goldCost !== undefined) {
    choice.goldCost = expectNumber(row.goldCost, `${path}.goldCost`);
  }

  return choice;
}

export function loadEvents(rawContent: unknown): Map<string, NarrativeEventTemplate> {
  const root = expectObject(rawContent, 'events.json');
  const events = expectArray(root.events, 'events.json.events');
  const eventMap = new Map<string, NarrativeEventTemplate>();

  events.forEach((entry, index) => {
    const path = `events.json.events[${index}]`;
    const row = expectObject(entry, path);

    const choicesRaw = expectArray(row.choices, `${path}.choices`);
    const choices = choicesRaw.map((c, i) => loadChoice(c, `${path}.choices[${i}]`));

    const event: NarrativeEventTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      flavorText: expectString(row.flavorText, `${path}.flavorText`),
      choices,
    };

    expectUniqueId(eventMap, event, path);
    eventMap.set(event.id, event);
  });

  return eventMap;
}
