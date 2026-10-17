// The user's deck during a game, from the entity mirror and the chosen deck list.
//
// Cards that started in the deck are the user's cards without a CREATOR tag (checked
// against real games: cards made by effects, and the Coin, carry one). Whatever of
// them has left the deck is known by its card id; the rest of the list is still in
// the deck. Without a deck list (loaner decks) only the cards seen so far are known.

import type { Hearthstone } from '@overlay/sdk';
import type { CollectibleDb } from '../lib/card-data';
import type { Entities } from '../battlegrounds/model';
import { decodeDeck } from './deckstring';

type Entity = Readonly<Hearthstone.Entity>;

/** Entities that are never cards of the deck. */
const NOT_CARDS = new Set(['GAME', 'PLAYER', 'HERO_POWER', 'ENCHANTMENT']);

export interface TrackedCard {
  cardId: string;
  name: string;
  cost: number;
  rarity: string;
  /** Copies in the deck list (or seen so far without a list). */
  total: number;
  /** Copies still in the deck; null while the deck list is unknown. */
  left: number | null;
}

export interface DeckState {
  /** Deck name, or null for a loaner deck. */
  name: string | null;
  /** Whether the full deck list is known. */
  listed: boolean;
  /** Cards in the deck right now (also cards shuffled in by effects). */
  inDeck: number;
  /** Cards of the list in mana cost order, or the cards seen so far. */
  cards: TrackedCard[];
}

function startedInDeck(entity: Entity, controller: string, hero: string | undefined): boolean {
  return (
    entity.tags.CONTROLLER === controller &&
    !NOT_CARDS.has(entity.tags.CARDTYPE ?? '') &&
    entity.tags.CREATOR === undefined &&
    String(entity.entity_id) !== hero
  );
}

/** Decodes a deck code into card ids and counts; null if it cannot be read. */
export function deckList(
  code: string,
  db: CollectibleDb,
): { cardId: string; count: number }[] | null {
  try {
    return decodeDeck(code).cards.flatMap(({ dbfId, count }) => {
      const card = db.byDbf.get(dbfId);
      return card ? [{ cardId: card.id, count }] : [];
    });
  } catch {
    return null;
  }
}

export function trackDeck(
  entities: Entities,
  playerEntityId: number | null | undefined,
  deck: { name: string; code: string } | null,
  db: CollectibleDb,
): DeckState | null {
  const player = playerEntityId == null ? undefined : entities.get(playerEntityId);
  const controller = player?.tags.PLAYER_ID;
  if (!player || !controller) return null;
  const hero = player.tags.HERO_ENTITY;

  let inDeck = 0;
  const gone = new Map<string, number>();
  for (const entity of entities.values()) {
    if (entity.tags.CONTROLLER !== controller) continue;
    if (entity.tags.ZONE === 'DECK') inDeck += 1;
    else if (entity.card_id && startedInDeck(entity, controller, hero)) {
      gone.set(entity.card_id, (gone.get(entity.card_id) ?? 0) + 1);
    }
  }

  const describe = (cardId: string) => {
    const card = db.byId.get(cardId);
    return { name: card?.name ?? cardId, cost: card?.cost ?? 0, rarity: card?.rarity ?? '' };
  };
  const list = deck ? deckList(deck.code, db) : null;
  const cards: TrackedCard[] = list
    ? list.map(({ cardId, count }) => ({
        cardId,
        ...describe(cardId),
        total: count,
        left: Math.max(0, count - (gone.get(cardId) ?? 0)),
      }))
    : [...gone.entries()].map(([cardId, count]) => ({
        cardId,
        ...describe(cardId),
        total: count,
        left: null,
      }));
  cards.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  return { name: deck?.name ?? null, listed: list !== null, inDeck, cards };
}
