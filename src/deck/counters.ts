// Counters for one player, from the entity mirror. Tags appear only once the game sets
// them (FATIGUE after the first fatigue damage), so absent means zero. The game counts
// corpses for every class, but only Death Knight cards use them.

import type { Entities } from '../battlegrounds/model';

export interface Counters {
  /** Attack of the minions on the board plus the hero's (e.g. from a weapon). */
  boardAttack: number;
  /** Damage of the next fatigue draw, once the deck is empty; null before that. */
  nextFatigue: number | null;
  /** Corpses; null unless the player's hero is a Death Knight. */
  corpses: number | null;
  spellsPlayed: number;
}

const num = (value: string | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function counters(
  entities: Entities,
  playerEntityId: number | null | undefined,
): Counters | null {
  const player = playerEntityId == null ? undefined : entities.get(playerEntityId);
  const controller = player?.tags.PLAYER_ID;
  if (!player || !controller) return null;
  let boardAttack = 0;
  let inDeck = 0;
  for (const e of entities.values()) {
    if (e.tags.CONTROLLER !== controller) continue;
    if (e.tags.ZONE === 'DECK') inDeck += 1;
    if (e.tags.ZONE === 'PLAY' && e.tags.CARDTYPE === 'MINION') boardAttack += num(e.tags.ATK);
  }
  const hero = entities.get(Number(player.tags.HERO_ENTITY));
  boardAttack += num(hero?.tags.ATK);
  return {
    boardAttack,
    nextFatigue: inDeck === 0 ? num(player.tags.FATIGUE) + 1 : null,
    corpses: hero?.tags.CLASS === 'DEATHKNIGHT' ? num(player.tags.CORPSES) : null,
    spellsPlayed: num(player.tags.NUM_SPELLS_PLAYED_THIS_GAME),
  };
}
