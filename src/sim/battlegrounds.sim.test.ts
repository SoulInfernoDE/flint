// Runs a recorded Battlegrounds game through Flint's logic, event by event, the way the
// SDK feeds it in the game, and reports what Flint would have shown. For checking Flint
// against real games, which stay local because their logs name other players:
//
//   REPLAY_ALL_EVENTS=1 cargo run --manifest-path overlay/Cargo.toml -p overlay-hearthstone \
//     --example replay -- game.log - events.json
//   FLINT_GAME_EVENTS=events.json FLINT_CARDS=cards.json npx vitest run src/sim
//
// Skipped unless FLINT_GAME_EVENTS is set.

import { readFileSync } from 'node:fs';
import type { Hearthstone } from '@overlay/sdk';
import { describe, expect, it } from 'vitest';
import { compact, toMap, type RawCard } from '../lib/card-data';
import { recordGame } from '../battlegrounds/history';
import { LastBoards, deriveState, type BgState } from '../battlegrounds/model';
import { inferTribes, poolTribes, seenMinions } from '../battlegrounds/tribes';

const eventsFile = process.env.FLINT_GAME_EVENTS;
const cardsFile = process.env.FLINT_CARDS;

type Entity = Hearthstone.Entity;

describe.skipIf(!eventsFile)('a recorded Battlegrounds game, step by step', () => {
  it('keeps the lobby, tribes, boards and result consistent', () => {
    const events = JSON.parse(readFileSync(eventsFile!, 'utf8')) as Hearthstone.ProviderMessage[];
    const db = cardsFile
      ? toMap(compact(JSON.parse(readFileSync(cardsFile, 'utf8')) as RawCard[]))
      : new Map();
    const all = poolTribes(db);
    const mirror = new Map<number, Entity>();
    const boards = new LastBoards();
    const problems: string[] = [];
    let turn = 0;
    let pickedAt: number | null = null;
    let tribesCompleteAt: number | null = null;
    let completeTribes: string[] = [];
    const contradictions = new Set<string>();
    const combats = new Set<number>();
    let lastCombat: number | null = null;
    let lastState: BgState | null = null;
    let record: ReturnType<typeof recordGame> = null;

    // The other side (tavern, combat opponents) is a dummy player; game-start may come
    // before the sides are known, so it cannot tell.
    const players = () => {
      const list = [...mirror.values()].filter((e) => e.tags.CARDTYPE === 'PLAYER');
      const mine = list.find((p) => p.tags.BACON_DUMMY_PLAYER !== '1');
      const other = list.find((p) => p.tags.BACON_DUMMY_PLAYER === '1');
      return { mine: mine?.entity_id, other: other?.entity_id };
    };

    /** `stable`: at a turn start, not between two changes of one update (places are
     * rewritten one by one, so a check in between sees two players on one place). */
    const check = (stable = false) => {
      const { mine, other } = players();
      const state = deriveState(mirror, mine, other);
      if (!state) return;
      lastState = state;
      boards.update(state);
      if (state.combatOpponentPlayerId !== lastCombat) {
        lastCombat = state.combatOpponentPlayerId;
        if (lastCombat !== null) combats.add(turn * 100 + lastCombat);
      }
      if (state.heroPicked) {
        pickedAt ??= turn;
        const places = state.heroes.map((h) => h.place);
        if (state.heroes.length !== 8) problems.push(`turn ${turn}: ${state.heroes.length} heroes`);
        // Before the first combat the game gives everyone place 1.
        if (stable && turn > 2 && new Set(places).size !== places.length) {
          problems.push(`turn ${turn}: duplicate places ${places.join(',')}`);
        }
        if (state.heroes.filter((h) => h.friendly).length !== 1)
          problems.push(`turn ${turn}: friendly heroes`);
        if (
          state.nextOpponentPlayerId !== null &&
          !state.heroes.some((h) => h.playerId === state.nextOpponentPlayerId)
        ) {
          problems.push(`turn ${turn}: next opponent ${state.nextOpponentPlayerId} not in lobby`);
        }
      }
      if (db.size > 0) {
        const tribes = inferTribes(seenMinions(mirror), db, all);
        if (tribes.unknown === 0 && tribesCompleteAt === null) {
          tribesCompleteAt = turn;
          completeTribes = tribes.active;
        }
        if (tribesCompleteAt !== null) {
          for (const e of mirror.values()) {
            if (e.tags.CARDTYPE !== 'MINION' || !e.card_id) continue;
            const card = db.get(e.card_id);
            if (!card?.pool || card.races.length !== 1) continue;
            const race = card.races[0]!;
            if (race !== 'ALL' && !completeTribes.includes(race)) {
              contradictions.add(`${e.card_id} (${race}) zone ${e.tags.ZONE}`);
            }
          }
        }
      }
    };

    let sinceCheck = 0;
    for (const event of events) {
      switch (event.name) {
        case 'entity-update': {
          const { entity_id, card_id, tags } = event.data;
          const entity = mirror.get(entity_id) ?? { entity_id, card_id: null, tags: {} };
          if (card_id) entity.card_id = card_id;
          Object.assign(entity.tags, tags);
          mirror.set(entity_id, entity);
          // Checks about as often as Flint recomputes (a batch per 100 ms of game).
          if ('BACON_CURRENT_COMBAT_PLAYER_ID' in tags || ++sinceCheck >= 150) {
            sinceCheck = 0;
            check();
          }
          break;
        }
        case 'game-created':
          mirror.clear();
          break;
        case 'turn-start':
          turn = event.data.turn;
          check(true);
          break;
        case 'game-end': {
          check();
          const { mine } = players();
          const game = [...mirror.values()].find((e) => e.tags.CARDTYPE === 'GAME');
          record = recordGame(mirror, mine, game?.entity_id, {
            endedAt: 0,
            duos: false,
            tribes: [],
          });
          break;
        }
      }
    }

    const opponents = new Set([...combats].map((c) => c % 100));
    const remembered = [...opponents].filter((id) => (boards.get(id) ?? []).length > 0).length;
    const final = lastState as BgState | null;
    console.log(
      JSON.stringify(
        {
          turns: turn,
          heroPickedAtTurn: pickedAt,
          tribes: completeTribes,
          tribesCompleteAtTurn: tribesCompleteAt,
          contradictions: [...contradictions],
          combats: combats.size,
          opponentsFought: opponents.size,
          boardsRemembered: remembered,
          finalTier: final?.tier,
          finalPlace: final?.heroes.find((h) => h.friendly)?.place,
          record: record && { place: record.place, hero: record.heroCardId, tier: record.tier },
          problems: problems.slice(0, 20),
          problemCount: problems.length,
        },
        null,
        1,
      ),
    );
    const finalPlace = final?.heroes.find((h) => h.friendly)?.place;
    if (record && finalPlace !== record.place) {
      problems.push(`lobby shows place ${finalPlace}, the history records ${record.place}`);
    }
    expect(problems).toEqual([]);
  });
});
