// What is known about the opponent's hand and the cards they played.
//
// The entity mirror only has the present; when a card was drawn or played comes from
// the game events, collected by OpponentLog while the game runs. Events of the starting
// hand arrive before the sides are known, so cards are matched to the opponent by the
// CONTROLLER of their entity, not by the event's side.

import type { Hearthstone } from '@overlay/sdk';
import type { Entities } from '../battlegrounds/model';

/** How a card came into the hand. */
export type HandSource = 'drawn' | 'created' | 'returned';

export interface HandCard {
  entityId: number;
  /** How it came into the hand; null if that happened before Flint started. */
  source: HandSource | null;
  /** The opponent's own turn it came in; 0 before the first turn. */
  turn: number | null;
  /** Came in before the first turn (starting hand, or the Coin). */
  starting: boolean;
  /** Known card (e.g. the Coin, or a card the user gave them). */
  cardId: string | null;
  /** Card that created it, if known. */
  createdBy: string | null;
}

export interface PlayedCard {
  entityId: number;
  cardId: string | null;
  /** The opponent's own turn. */
  turn: number;
}

export interface OpponentState {
  hand: HandCard[];
  /** Newest first. */
  played: PlayedCard[];
  deckCount: number;
}

/** The game's turn counter counts both players; each player's own turn is half of it. */
export function ownTurn(gameTurn: number): number {
  return Math.ceil(gameTurn / 2);
}

/** Collects when cards were drawn and played, for every entity of the game. */
export class OpponentLog {
  private gameTurn = 0;
  private entered = new Map<number, { source: HandSource; turn: number; starting: boolean }>();
  private played: { entityId: number; turn: number }[] = [];

  clear(): void {
    this.gameTurn = 0;
    this.entered.clear();
    this.played = [];
  }

  apply(event: Hearthstone.GameEvent): void {
    switch (event.name) {
      case 'game-created':
        this.clear();
        break;
      case 'turn-start':
        this.gameTurn = event.data.turn;
        break;
      case 'zone-change': {
        const { entity_id: id, from, to } = event.data;
        if (to === 'hand' && from !== 'hand') {
          const source: HandSource =
            from === 'deck'
              ? 'drawn'
              : from === null || from === 'setaside'
                ? 'created'
                : 'returned';
          this.entered.set(id, {
            source,
            turn: ownTurn(this.gameTurn),
            starting: this.gameTurn === 0,
          });
        } else if (from === 'hand' && (to === 'play' || to === 'secret')) {
          const turn = ownTurn(this.gameTurn);
          // The same event can come twice: from the history and live.
          if (!this.played.some((p) => p.entityId === id && p.turn === turn)) {
            this.played.push({ entityId: id, turn });
          }
        }
        break;
      }
    }
  }

  enteredHand(id: number): { source: HandSource; turn: number; starting: boolean } | undefined {
    return this.entered.get(id);
  }

  playedCards(): readonly { entityId: number; turn: number }[] {
    return this.played;
  }
}

export function deriveOpponent(
  entities: Entities,
  opposingPlayerEntityId: number | null | undefined,
  log: OpponentLog,
): OpponentState | null {
  const player = opposingPlayerEntityId == null ? undefined : entities.get(opposingPlayerEntityId);
  const controller = player?.tags.PLAYER_ID;
  if (!player || !controller) return null;

  const theirs = [...entities.values()].filter((e) => e.tags.CONTROLLER === controller);
  const hand = theirs
    .filter((e) => e.tags.ZONE === 'HAND')
    .sort((a, b) => Number(a.tags.ZONE_POSITION ?? 0) - Number(b.tags.ZONE_POSITION ?? 0))
    .map((e): HandCard => {
      const entered = log.enteredHand(e.entity_id);
      const creator = e.tags.CREATOR ? entities.get(Number(e.tags.CREATOR)) : undefined;
      return {
        entityId: e.entity_id,
        source: entered?.source ?? null,
        turn: entered?.turn ?? null,
        starting: entered?.starting ?? false,
        cardId: e.card_id,
        createdBy: creator?.card_id ?? null,
      };
    });
  const played = log
    .playedCards()
    .filter((p) => entities.get(p.entityId)?.tags.CONTROLLER === controller)
    .map((p) => ({ ...p, cardId: entities.get(p.entityId)?.card_id ?? null }))
    .reverse();
  const deckCount = theirs.filter((e) => e.tags.ZONE === 'DECK').length;
  return { hand, played, deckCount };
}
