// What is known about the opponent's hand and the cards they played.
//
// The entity mirror only has the present; when a card was drawn or played comes from
// the game events, collected by OpponentLog while the game runs. Events of the starting
// hand arrive before the sides are known, so cards are matched to the opponent by the
// CONTROLLER of their entity, not by the event's side.

import type { Hearthstone } from '@overlay/sdk';
import type { Entities } from '../battlegrounds/model';
import type { CollectibleDb, CollectibleInfo } from '../lib/card-data';
import { inFormat } from '../secrets/model';

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
  /**
   * Enchantments on the card (buffs and other changes made in hand), by the card that
   * made each one, or null where that card is hidden. The new stats of a hidden card
   * stay hidden; that it was changed, and by what, is visible.
   */
  enchantedBy: (string | null)[];
  /** Whether and when the card was prepared (keyword Prepare). */
  prepared: PreparedCard | null;
}

/**
 * A card prepared in hand: in its owner's next turn it costs `mana` + 1 less. The
 * discount cannot go below a cost of 0, so a player who spends less than they have
 * left shows that the card costs exactly `mana` + 1.
 */
export interface PreparedCard {
  /** The owner's own turn in which the card is cheaper. */
  turn: number;
  /** The cost the card loses. */
  discount: number;
  /** That turn has not passed yet. */
  active: boolean;
  /** The card's cost, when the spent mana shows it; else null. */
  exactCost: number | null;
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
  private prepares = new Map<number, { gameTurn: number; mana: number; capped: boolean }>();

  clear(): void {
    this.gameTurn = 0;
    this.entered.clear();
    this.played = [];
    this.prepares.clear();
  }

  /**
   * Takes one game event. `entities` is the mirror as of this event, when known (not
   * for events from the history), to tell from the mana left whether a prepare was
   * limited by the card's cost.
   */
  apply(event: Hearthstone.GameEvent, entities?: Entities): void {
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
      case 'prepare': {
        const { entity_id: id, mana } = event.data;
        // The same event can come twice: from the history and live.
        if (this.prepares.get(id)?.gameTurn === this.gameTurn) break;
        this.prepares.set(id, {
          gameTurn: this.gameTurn,
          mana,
          capped: entities ? manaLeft(entities, id, mana) : false,
        });
        break;
      }
    }
  }

  /** Whether and when a card was prepared, as of now. */
  prepared(id: number): PreparedCard | null {
    const prepare = this.prepares.get(id);
    if (!prepare) return null;
    // The owner's next turn is two game turns later.
    const discountTurn = prepare.gameTurn + 2;
    return {
      turn: ownTurn(discountTurn),
      discount: prepare.mana + 1,
      active: this.gameTurn <= discountTurn,
      exactCost: prepare.capped ? prepare.mana + 1 : null,
    };
  }

  enteredHand(id: number): { source: HandSource; turn: number; starting: boolean } | undefined {
    return this.entered.get(id);
  }

  playedCards(): readonly { entityId: number; turn: number }[] {
    return this.played;
  }
}

/**
 * Whether the owner of a card had mana left after preparing it. While the game shows
 * the spent mana, the 1 mana of the prepare action itself is already counted as used
 * and the rest is not yet.
 */
function manaLeft(entities: Entities, cardId: number, mana: number): boolean {
  const controller = entities.get(cardId)?.tags.CONTROLLER;
  const player = [...entities.values()].find(
    (e) => e.tags.CARDTYPE === 'PLAYER' && e.tags.PLAYER_ID === controller,
  );
  if (!player) return false;
  const tag = (name: string) => Number(player.tags[name] ?? 0);
  const usedBefore = tag('RESOURCES_USED') - 1;
  if (usedBefore < 0) return false;
  const available = tag('RESOURCES') + tag('TEMP_RESOURCES') - tag('OVERLOAD_LOCKED') - usedBefore;
  return mana < available;
}

/**
 * The cards a prepared card can be: collectible cards with Prepare of the class (or
 * neutral) in the format, at the cost it shows, by cost and name.
 */
export function preparedCandidates(
  db: CollectibleDb,
  cardClass: string,
  format: string | null,
  prepared: PreparedCard,
): CollectibleInfo[] {
  const byName = new Map<string, CollectibleInfo>();
  for (const card of db.byId.values()) {
    const prepare = card.prepare;
    if (!prepare || (prepare.cardClass !== cardClass && prepare.cardClass !== 'NEUTRAL')) continue;
    if (!inFormat(prepare.set, format)) continue;
    // The discount is at most the card's cost.
    const fits =
      prepared.exactCost !== null
        ? card.cost === prepared.exactCost
        : card.cost >= prepared.discount;
    if (fits && !byName.has(card.name)) byName.set(card.name, card);
  }
  return [...byName.values()].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
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
  // Enchantments by the entity they are attached to (they live in PLAY while active).
  const enchantments = new Map<number, (string | null)[]>();
  for (const e of entities.values()) {
    if (e.tags.CARDTYPE !== 'ENCHANTMENT' || e.tags.ZONE !== 'PLAY') continue;
    const target = Number(e.tags.ATTACHED);
    // A card's own enchantments (set up by itself) are not changes made in hand.
    if (!target || e.tags.CREATOR === e.tags.ATTACHED) continue;
    const source = e.tags.CREATOR ? entities.get(Number(e.tags.CREATOR)) : undefined;
    const list = enchantments.get(target) ?? [];
    list.push(source?.card_id ?? null);
    enchantments.set(target, list);
  }
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
        enchantedBy: enchantments.get(e.entity_id) ?? [],
        prepared: log.prepared(e.entity_id),
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
