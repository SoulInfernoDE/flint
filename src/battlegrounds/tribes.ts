// Tribes of the lobby and the minions they allow.
//
// Hearthstone does not log which tribes a lobby has. They follow from what can be seen:
// every minion of the pool that turns up in a tavern or on a board belongs to the lobby,
// so a pool minion with a single tribe confirms that tribe. Once as many tribes are
// confirmed as a lobby has, all others are banned.

import type { CardDb } from '../lib/card-data';
import type { Entities } from './model';

/** Tribes in a lobby. */
export const LOBBY_TRIBES = 5;

/** Minions of every tribe; they are in the pool whatever the lobby. */
const ALL = 'ALL';

export interface Tribes {
  /** Confirmed tribes, sorted. */
  active: string[];
  /** Known to be out of this lobby, sorted; empty until every tribe is confirmed. */
  banned: string[];
  /** Tribes not confirmed yet while the lobby is still incomplete. */
  unknown: number;
}

/** Every tribe of the Battlegrounds pool, sorted. */
export function poolTribes(db: CardDb): string[] {
  const tribes = new Set<string>();
  for (const card of db.values()) {
    if (!card.pool) continue;
    for (const race of card.races) if (race !== ALL) tribes.add(race);
  }
  return [...tribes].sort();
}

/** Card ids of every minion the game has shown so far. */
export function seenMinions(entities: Entities): string[] {
  const ids: string[] = [];
  for (const entity of entities.values()) {
    if (entity.card_id && entity.tags.CARDTYPE === 'MINION') ids.push(entity.card_id);
  }
  return ids;
}

export function inferTribes(seen: Iterable<string>, db: CardDb, all: string[]): Tribes {
  const confirmed = new Set<string>();
  for (const id of seen) {
    const card = db.get(id);
    if (!card?.pool || card.races.length !== 1) continue;
    const [race] = card.races;
    if (race && race !== ALL && all.includes(race)) confirmed.add(race);
  }
  const active = [...confirmed].sort();
  if (active.length < LOBBY_TRIBES) {
    return { active, banned: [], unknown: LOBBY_TRIBES - active.length };
  }
  return { active, banned: all.filter((t) => !confirmed.has(t)), unknown: 0 };
}

export interface PoolMinion {
  cardId: string;
  name: string;
  tier: number;
  races: string[];
  attack: number;
  health: number;
  mechanics: string[];
}

export interface TribeGroup {
  /** A tribe, `ALL`, or null for minions without a tribe. */
  tribe: string | null;
  minions: PoolMinion[];
}

/**
 * The pool minions of `tier` that this lobby can offer, grouped by tribe. Minions of a
 * banned tribe are left out (one of several tribes in the lobby is enough); Duos-only
 * minions only appear in Duos. With `mechanic`, only minions with that keyword.
 */
export function lobbyMinions(
  db: CardDb,
  tribes: Tribes,
  tier: number,
  duos: boolean,
  mechanic: string | null = null,
): TribeGroup[] {
  const banned = new Set(tribes.banned);
  const groups = new Map<string | null, PoolMinion[]>();
  const listed = new Set<string>();
  for (const card of db.values()) {
    if (!card.pool || card.tier !== tier || (card.duosOnly && !duos)) continue;
    // Golden versions share their normal card's info: list each card once.
    if (listed.has(card.id)) continue;
    listed.add(card.id);
    const races = card.races;
    if (races.length > 0 && !races.includes(ALL) && races.every((r) => banned.has(r))) continue;
    if (mechanic !== null && !card.mechanics.includes(mechanic)) continue;
    const key = races.includes(ALL) ? ALL : (races.find((r) => !banned.has(r)) ?? null);
    const list = groups.get(key) ?? [];
    list.push({
      cardId: card.id,
      name: card.name,
      tier,
      races,
      attack: card.attack ?? 0,
      health: card.health ?? 0,
      mechanics: card.mechanics,
    });
    groups.set(key, list);
  }
  const order = (tribe: string | null) => (tribe === null ? 2 : tribe === ALL ? 1 : 0);
  return [...groups.entries()]
    .map(([tribe, minions]) => ({
      tribe,
      minions: minions.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort(
      (a, b) => order(a.tribe) - order(b.tribe) || (a.tribe ?? '').localeCompare(b.tribe ?? ''),
    );
}
