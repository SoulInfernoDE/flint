// Checks the model against entities exported from a real game, which stay local because
// they come from the user's own logs:
//
//   cargo run -p overlay-hearthstone --example replay -- Power.log entities.json
//   FLINT_ENTITIES=entities.json npx vitest run
//
// Skipped when FLINT_ENTITIES is not set (e.g. in CI).

import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import { deriveState } from './model';

const file = process.env.FLINT_ENTITIES;

describe.skipIf(!file)('a real Battlegrounds game', () => {
  it('yields a complete lobby', () => {
    const list = JSON.parse(readFileSync(file!, 'utf8')) as Hearthstone.Entity[];
    const entities = new Map(list.map((e) => [e.entity_id, e]));
    const players = list.filter((e) => e.tags.CARDTYPE === 'PLAYER');
    // The user's player is the one whose hero is in PLAY.
    const mine = players.find(
      (p) => entities.get(Number(p.tags.HERO_ENTITY))?.tags.ZONE === 'PLAY',
    );
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
});
