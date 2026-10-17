import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import type { Entities } from '../battlegrounds/model';
import { compactCollectible, toCollectibleMap, type RawCard } from '../lib/card-data';
import { trackDeck } from './model';

// Deck code with one copy of dbf 1 and two copies of dbf 2 (format 2, hero 7).
const CODE = btoa(String.fromCharCode(0, 1, 2, 1, 7, 1, 1, 1, 2, 0));

const db = toCollectibleMap([
  [1, 'ONE', 'One', 1, 'COMMON', 'MINION'],
  [2, 'TWO', 'Two', 2, 'RARE', 'SPELL'],
]);

function entities(list: [number, string | null, Record<string, string>][]): Entities {
  return new Map(list.map(([id, cardId, tags]) => [id, { entity_id: id, card_id: cardId, tags }]));
}

const card = (zone: string, extra: Record<string, string> = {}) => ({
  CONTROLLER: '1',
  CARDTYPE: 'MINION',
  ZONE: zone,
  ...extra,
});

const game = entities([
  [2, null, { CARDTYPE: 'PLAYER', PLAYER_ID: '1', HERO_ENTITY: '9' }],
  [9, 'HERO_04', card('PLAY', { CARDTYPE: 'HERO' })],
  [4, null, card('DECK')],
  [5, null, card('DECK')],
  [6, 'TWO', card('HAND')],
  // Created by an effect: in hand, and one shuffled into the deck.
  [7, 'GAME_005', card('HAND', { CREATOR: '1' })],
  [8, null, card('DECK', { CREATOR: '6' })],
]);

describe('deck tracker', () => {
  it('subtracts the cards that left the deck from the list', () => {
    const state = trackDeck(game, 2, { name: 'Test', code: CODE }, db)!;
    expect(state.listed).toBe(true);
    expect(state.inDeck).toBe(3);
    expect(state.cards).toEqual([
      { cardId: 'ONE', name: 'One', cost: 1, rarity: 'COMMON', total: 1, left: 1 },
      { cardId: 'TWO', name: 'Two', cost: 2, rarity: 'RARE', total: 2, left: 1 },
    ]);
  });

  it('shows the cards seen so far without a deck list', () => {
    const state = trackDeck(game, 2, null, db)!;
    expect(state.listed).toBe(false);
    expect(state.cards.map((c) => [c.cardId, c.total, c.left])).toEqual([['TWO', 1, null]]);
  });
});

// A recorded game: FLINT_ENTITIES (replay output), FLINT_COLLECTIBLE (HearthstoneJSON's
// cards.collectible.json) and FLINT_DECK_CODE (the deck played).
const file = process.env.FLINT_ENTITIES;
const cards = process.env.FLINT_COLLECTIBLE;
const code = process.env.FLINT_DECK_CODE;

describe.skipIf(!file || !cards || !code)('a recorded game', () => {
  it('leaves exactly the cards that are still in the deck', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const all = new Map(list.map((e) => [e.entity_id, e]));
    const real = toCollectibleMap(
      compactCollectible(JSON.parse(readFileSync(cards!, 'utf8')) as RawCard[]),
    );
    const player = list.find((e) => e.tags.CARDTYPE === 'PLAYER' && e.tags.PLAYER_ID === '1');
    const state = trackDeck(all, player?.entity_id, { name: 'recorded', code: code! }, real)!;
    console.log(
      state.inDeck,
      state.cards.map((c) => `${c.name} ${c.left}/${c.total}`),
    );
    expect(state.cards.reduce((sum, c) => sum + c.total, 0)).toBe(30);
    expect(state.cards.reduce((sum, c) => sum + (c.left ?? 0), 0)).toBe(state.inDeck);
  });
});
