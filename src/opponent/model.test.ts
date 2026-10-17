import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import type { Entities } from '../battlegrounds/model';
import { OpponentLog, deriveOpponent, ownTurn } from './model';

type Event = Hearthstone.GameEvent;

const move = (id: number, from: string | null, to: string): Event => ({
  name: 'zone-change',
  data: { entity_id: id, card_id: null, side: 'unknown', from, to },
});
const turn = (n: number): Event => ({
  name: 'turn-start',
  data: { turn: n, side: n % 2 === 1 ? 'friendly' : 'opposing' },
});

function entities(list: [number, string | null, Record<string, string>][]): Entities {
  return new Map(list.map(([id, cardId, tags]) => [id, { entity_id: id, card_id: cardId, tags }]));
}

const game = entities([
  [3, null, { CARDTYPE: 'PLAYER', PLAYER_ID: '2' }],
  [10, null, { CONTROLLER: '2', ZONE: 'HAND', ZONE_POSITION: '2' }],
  [11, null, { CONTROLLER: '2', ZONE: 'HAND', ZONE_POSITION: '1' }],
  [12, 'CS2_029', { CONTROLLER: '2', ZONE: 'GRAVEYARD' }],
  [13, 'GAME_005', { CONTROLLER: '2', ZONE: 'HAND', ZONE_POSITION: '3', CREATOR: '1' }],
  [14, null, { CONTROLLER: '2', ZONE: 'DECK' }],
  [20, 'EX1_066', { CONTROLLER: '1', ZONE: 'PLAY' }],
]);

describe('opponent tracker', () => {
  it('counts each player their own turns', () => {
    expect([1, 2, 3, 4, 5].map(ownTurn)).toEqual([1, 1, 2, 2, 3]);
  });

  it('knows when cards were drawn and played', () => {
    const log = new OpponentLog();
    for (const event of [
      move(11, 'deck', 'hand'),
      move(12, 'deck', 'hand'),
      // The Coin, created face down in the hand of the player going second.
      move(13, null, 'hand'),
      turn(1),
      turn(2),
      move(10, 'deck', 'hand'),
      move(12, 'hand', 'play'),
      move(12, 'play', 'graveyard'),
      turn(3),
      move(20, 'hand', 'play'),
    ]) {
      log.apply(event);
    }
    const state = deriveOpponent(game, 3, log)!;
    expect(state.hand.map((c) => [c.entityId, c.source, c.turn, c.starting])).toEqual([
      [11, 'drawn', 0, true],
      [10, 'drawn', 1, false],
      [13, 'created', 0, true],
    ]);
    // The user's card played on turn 3 is not the opponent's.
    expect(state.played).toEqual([{ entityId: 12, cardId: 'CS2_029', turn: 1 }]);
    expect(state.deckCount).toBe(1);
  });

  it('counts a play once when it arrives twice', () => {
    const log = new OpponentLog();
    for (const event of [turn(1), move(12, 'hand', 'play'), turn(1), move(12, 'hand', 'play')]) {
      log.apply(event);
    }
    expect(deriveOpponent(game, 3, log)!.played).toHaveLength(1);
  });

  it('marks cards enchanted in hand, by the card that did it', () => {
    const enchanted: Entities = new Map([
      ...game,
      [30, { entity_id: 30, card_id: 'BOT_X', tags: { CARDTYPE: 'MINION', ZONE: 'PLAY' } }],
      // A buff on hand card 11 from the visible card 30, one from a hidden card, and
      // card 10's own enchantment.
      [
        40,
        {
          entity_id: 40,
          card_id: 'E1',
          tags: { CARDTYPE: 'ENCHANTMENT', ZONE: 'PLAY', ATTACHED: '11', CREATOR: '30' },
        },
      ],
      [
        41,
        {
          entity_id: 41,
          card_id: 'E2',
          tags: { CARDTYPE: 'ENCHANTMENT', ZONE: 'PLAY', ATTACHED: '11', CREATOR: '14' },
        },
      ],
      [
        42,
        {
          entity_id: 42,
          card_id: 'E3',
          tags: { CARDTYPE: 'ENCHANTMENT', ZONE: 'PLAY', ATTACHED: '10', CREATOR: '10' },
        },
      ],
      // Gone: no longer counts.
      [
        43,
        {
          entity_id: 43,
          card_id: 'E4',
          tags: { CARDTYPE: 'ENCHANTMENT', ZONE: 'GRAVEYARD', ATTACHED: '10', CREATOR: '30' },
        },
      ],
    ]);
    const hand = deriveOpponent(enchanted, 3, new OpponentLog())!.hand;
    expect(hand.map((c) => [c.entityId, c.enchantedBy])).toEqual([
      [11, ['BOT_X', null]],
      [10, []],
      [13, []],
    ]);
  });

  it('starts over with a new game', () => {
    const log = new OpponentLog();
    log.apply(move(12, 'hand', 'play'));
    log.apply({ name: 'game-created' });
    expect(deriveOpponent(game, 3, log)!.played).toEqual([]);
  });
});

// A recorded game: FLINT_ENTITIES and FLINT_EVENTS from overLay's replay tool.
const file = process.env.FLINT_ENTITIES;
const events = process.env.FLINT_EVENTS;

describe.skipIf(!file || !events)('a recorded game', () => {
  it('follows the opponent through the game', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const all = new Map(list.map((e) => [e.entity_id, e]));
    const log = new OpponentLog();
    for (const event of JSON.parse(readFileSync(events!, 'utf8')) as Event[]) log.apply(event);
    const start = (JSON.parse(readFileSync(events!, 'utf8')) as Event[]).find(
      (e) => e.name === 'game-start',
    );
    const theirs =
      start?.name === 'game-start' ? start.data.players.find((p) => p.side === 'opposing') : null;
    const player = list.find(
      (e) => e.tags.CARDTYPE === 'PLAYER' && e.tags.PLAYER_ID === String(theirs?.player_id),
    );
    const state = deriveOpponent(all, player?.entity_id, log)!;
    console.log(JSON.stringify(state));
    expect(state.played.every((p) => p.cardId !== null)).toBe(true);
    expect(state.hand.every((c) => c.source !== null || c.cardId !== null)).toBe(true);
  });
});
