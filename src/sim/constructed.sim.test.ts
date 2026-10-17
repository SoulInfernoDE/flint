// Runs a recorded game with decks through Flint's deck, opponent and secret logic, event
// by event, the way the SDK feeds it, and reports what Flint would have shown. For
// checking Flint against real games, which stay local because their logs name players:
//
//   REPLAY_ALL_EVENTS=1 cargo run --manifest-path overlay/Cargo.toml -p overlay-hearthstone \
//     --example replay -- game.log - events.json
//   FLINT_GAME_EVENTS=events.json FLINT_COLLECTIBLE=cards.collectible.json \
//     FLINT_DECK_CODE=<code from Decks.log> FLINT_FORMAT=FT_STANDARD npx vitest run src/sim
//
// Skipped unless FLINT_GAME_EVENTS and FLINT_COLLECTIBLE are set.

import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import { compactCollectible, toCollectibleMap, type RawCard } from '../lib/card-data';
import { counters } from '../deck/counters';
import { trackDeck } from '../deck/model';
import { OpponentLog, deriveOpponent } from '../opponent/model';
import { SecretsLog, baseId, candidates } from '../secrets/model';

const eventsFile = process.env.FLINT_GAME_EVENTS;
const cardsFile = process.env.FLINT_COLLECTIBLE;
const deckCode = process.env.FLINT_DECK_CODE ?? null;
const format = process.env.FLINT_FORMAT ?? 'FT_STANDARD';

type Entity = Hearthstone.Entity;

describe.skipIf(!eventsFile || !cardsFile)('a recorded game with decks, step by step', () => {
  it('keeps the deck, the opponent and the secrets consistent', () => {
    const events = JSON.parse(readFileSync(eventsFile!, 'utf8')) as Hearthstone.ProviderMessage[];
    const db = toCollectibleMap(
      compactCollectible(JSON.parse(readFileSync(cardsFile!, 'utf8')) as RawCard[]),
    );
    const mirror = new Map<number, Entity>();
    const opponentLog = new OpponentLog();
    const secrets = new SecretsLog();
    const problems: string[] = [];
    let turn = 0;
    let deckStart: number | null = null;
    const secretChecks: string[] = [];
    let ruledOutCount = 0;

    // The user is the player whose cards the game showed being drawn (as overLay does);
    // until then the sides are unknown.
    let userPlayer: string | undefined;
    const sides = () => {
      const list = [...mirror.values()].filter((e) => e.tags.CARDTYPE === 'PLAYER');
      const mine = list.find((p) => p.tags.PLAYER_ID === userPlayer);
      const other = list.find((p) => p.tags.PLAYER_ID !== userPlayer);
      return { mine, other };
    };

    const check = () => {
      const { mine, other } = sides();
      if (!mine || !other) return;
      const deck = trackDeck(
        mirror,
        mine.entity_id,
        deckCode ? { name: 'deck', code: deckCode } : null,
        db,
      );
      if (deck) {
        const left = deck.cards.reduce((sum, c) => sum + (c.left ?? 0), 0);
        deckStart ??= left;
        if (deck.listed && left > deck.inDeck) {
          problems.push(`turn ${turn}: ${left} cards left by the list, ${deck.inDeck} in the deck`);
        }
      }
      const opponent = deriveOpponent(mirror, other.entity_id, opponentLog);
      if (opponent && opponent.played.some((p) => p.cardId === null) && turn > 0) {
        // Played cards are revealed as they are played.
        problems.push(`turn ${turn}: a played card of the opponent has no card id`);
      }
      counters(mirror, mine.entity_id);
      counters(mirror, other.entity_id);
    };

    for (const event of events) {
      if (event.name === 'entity-update') {
        const { entity_id, card_id, tags } = event.data;
        const entity = mirror.get(entity_id) ?? { entity_id, card_id: null, tags: {} };
        if (card_id) entity.card_id = card_id;
        Object.assign(entity.tags, tags);
        mirror.set(entity_id, entity);
        continue;
      }
      if (event.name === 'game-created') mirror.clear();
      if (event.name === 'card-revealed' && event.data.side === 'friendly' && !userPlayer) {
        userPlayer = mirror.get(event.data.entity_id)?.tags.CONTROLLER;
      }
      if (
        event.name === 'zone-change' &&
        event.data.from === 'deck' &&
        event.data.card_id &&
        !userPlayer
      ) {
        userPlayer = mirror.get(event.data.entity_id)?.tags.CONTROLLER;
      }
      const { other } = sides();
      const opponent = other?.tags.PLAYER_ID;
      // A secret of the opponent that leaves play is revealed: was it ruled out before?
      if (event.name === 'zone-change' && event.data.from === 'secret' && opponent) {
        const entity = mirror.get(event.data.entity_id);
        const cardId = entity?.card_id ?? event.data.card_id;
        if (entity?.tags.CONTROLLER === opponent && cardId && entity.tags.SECRET === '1') {
          const out = secrets.isRuledOut(event.data.entity_id, cardId);
          secretChecks.push(
            `${cardId} (${baseId(cardId)}): ${out ? 'WRONGLY ruled out' : 'possible'}`,
          );
          if (out) problems.push(`turn ${turn}: the real secret ${cardId} had been ruled out`);
        }
      }
      opponentLog.apply(event);
      secrets.apply(event, mirror, userPlayer, opponent);
      if (event.name === 'turn-start') {
        turn = event.data.turn;
        check();
        const hidden = [...mirror.values()].filter(
          (e) =>
            e.tags.CONTROLLER === opponent &&
            e.tags.ZONE === 'SECRET' &&
            e.tags.SECRET === '1' &&
            !e.card_id,
        );
        const opponentClass = other
          ? mirror.get(Number(other.tags.HERO_ENTITY))?.tags.CLASS
          : undefined;
        if (hidden.length > 0 && opponentClass) {
          const slots = secrets.slots(mirror, opponent, candidates(db, opponentClass, format));
          ruledOutCount = Math.max(
            ruledOutCount,
            ...slots.map((s) => s.candidates.filter((c) => c.ruledOut).length),
          );
        }
      }
    }
    check();

    const { mine, other } = sides();
    const deck = mine
      ? trackDeck(mirror, mine.entity_id, deckCode ? { name: 'deck', code: deckCode } : null, db)
      : null;
    const opponent = other ? deriveOpponent(mirror, other.entity_id, opponentLog) : null;
    console.log(
      JSON.stringify(
        {
          turns: turn,
          userPlayer,
          opponentClass: other ? mirror.get(Number(other.tags.HERO_ENTITY))?.tags.CLASS : null,
          deck: deck && {
            listed: deck.listed,
            cardsAtStart: deckStart,
            inDeckAtEnd: deck.inDeck,
            leftByListAtEnd: deck.cards.reduce((sum, c) => sum + (c.left ?? 0), 0),
            drawnOut: deck.cards.filter((c) => c.left === 0).length,
          },
          opponent: opponent && {
            handAtEnd: opponent.hand.length,
            played: opponent.played.length,
            handOrigins: opponent.hand.map((c) => c.source ?? 'unknown'),
          },
          counters: mine && counters(mirror, mine.entity_id),
          secrets: { revealed: secretChecks, mostRuledOutAtOnce: ruledOutCount },
          problems: problems.slice(0, 20),
          problemCount: problems.length,
        },
        null,
        1,
      ),
    );
    expect(problems).toEqual([]);
  });
});
