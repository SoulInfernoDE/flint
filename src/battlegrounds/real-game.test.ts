// Checks the model against entities exported from a real game, which stay local because
// they come from the user's own logs:
//
//   cargo run -p overlay-hearthstone --example replay -- Power.log entities.json
//   FLINT_ENTITIES=entities.json npx vitest run
//
// With FLINT_CARDS set to HearthstoneJSON's cards.json, it also prints the lobby's
// tribes (and checks them against FLINT_TRIBES, e.g. "BEAST,DEMON,…", if given).
// Skipped when FLINT_ENTITIES is not set (e.g. in CI).

import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import { compact, toMap, type RawCard } from '../lib/card-data';
import { deriveState } from './model';
import { inferTribes, poolTribes, seenMinions } from './tribes';

const file = process.env.FLINT_ENTITIES;
const cardsFile = process.env.FLINT_CARDS;

describe.skipIf(!file)('a real Battlegrounds game', () => {
  it('yields a complete lobby', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const entities = new Map(list.map((e) => [e.entity_id, e]));
    const players = list.filter((e) => e.tags.CARDTYPE === 'PLAYER');
    // The other side (tavern and combat opponents) is a dummy player.
    const mine = players.find((p) => p.tags.BACON_DUMMY_PLAYER !== '1');
    const other = players.find((p) => p !== mine);
    const state = deriveState(entities, mine?.entity_id, other?.entity_id)!;
    console.log(
      JSON.stringify(
        {
          tier: state.tier,
          gold: `${state.gold}/${state.maxGold}`,
          next: state.nextOpponentPlayerId,
          heroes: state.heroes.map(
            (h) =>
              `${h.place}. ${h.cardId} ${h.health}+${h.armor} T${h.tier}${h.friendly ? ' (you)' : ''}`,
          ),
          board: state.board.map((m) => `${m.cardId} ${m.attack}/${m.health}`),
          other: state.otherBoard.length,
        },
        null,
        1,
      ),
    );
    expect(state.heroes).toHaveLength(8);
    expect(new Set(state.heroes.map((h) => h.place)).size).toBe(8);
    expect(state.heroes.filter((h) => h.friendly)).toHaveLength(1);
  });

  it.skipIf(!cardsFile)('reveals the lobby tribes', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const db = toMap(compact(JSON.parse(readFileSync(cardsFile!, 'utf8')) as RawCard[]));
    const entities = new Map(list.map((e) => [e.entity_id, e]));
    const tribes = inferTribes(seenMinions(entities), db, poolTribes(db));
    console.log(JSON.stringify(tribes));
    const expected = process.env.FLINT_TRIBES?.split(',').sort();
    if (expected) expect(tribes.active).toEqual(expected);
  });
});
