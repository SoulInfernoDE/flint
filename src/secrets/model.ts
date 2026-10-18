// Which secrets the opponent may have.
//
// A hidden secret can be any secret of the opponent's class in the game's format. Some
// are ruled out by what happens: a secret that would have triggered on an action (an
// attack on the hero, a spell, a minion played …) but did not, is not that secret.
// Flint only rules out when the trigger clearly happened and no secret reacted to the
// action at all, as one secret can stop another (a returned attacker is no longer
// attacking). The user can also rule out secrets by hand.

import type { Hearthstone } from '@overlay/sdk';
import type { CollectibleDb, CollectibleInfo } from '../lib/card-data';
import type { Entities } from '../battlegrounds/model';

/**
 * Card sets of the Standard format (HearthstoneJSON set codes). Update with every
 * rotation. Year of the Scarab (2026), as listed on hearthstone.wiki.gg/wiki/Standard_format
 * (checked 2026-10-17): Core, Event, Into the Emerald Dream, The Lost City of Un'Goro,
 * Across the Timeways, CATACLYSM, Escape from Violet Hold, Reign of the Black Empire.
 */
export const STANDARD_SETS = new Set([
  'CORE',
  'EVENT',
  'EMERALD_DREAM',
  'THE_LOST_CITY',
  'TIME_TRAVEL',
  'CATACLYSM',
  'ESCAPEFROM_VIOLET_HOLD',
  'BE',
]);

/** What makes a secret trigger, seen from the secret's owner ("enemy" is the user). */
export type Trigger =
  | 'hero-attacked'
  | 'minion-attacks'
  | 'minion-attacked'
  | 'spell-cast'
  | 'minion-played'
  | 'turn-end'
  | 'three-cards';

interface Rule {
  on: Trigger;
  /** The secret only triggers with an enemy minion on the board, or room on the owner's. */
  needs?: 'enemy-minion' | 'board-space';
}

/**
 * Triggers of the Standard secrets, by card id without reprint prefix. Secrets missing
 * here are only ruled out by hand.
 */
const RULES: Record<string, Rule> = {
  EX1_289: { on: 'hero-attacked' }, // Ice Barrier
  EX1_610: { on: 'hero-attacked' }, // Explosive Trap
  EX1_611: { on: 'minion-attacks' }, // Freezing Trap
  JAIL_315: { on: 'minion-attacks' }, // Mystic Misdirection
  BAR_812: { on: 'minion-attacked', needs: 'board-space' }, // Oasis Ally
  EX1_287: { on: 'spell-cast' }, // Counterspell
  ULD_152: { on: 'spell-cast', needs: 'enemy-minion' }, // Pressure Plate
  LOOT_101: { on: 'minion-played' }, // Explosive Runes
  END_024: { on: 'turn-end', needs: 'enemy-minion' }, // Flames of Infinity
  GIL_577: { on: 'three-cards', needs: 'board-space' }, // Rat Trap
};

/** The id of the original printing (reprints add a set prefix). */
export function baseId(cardId: string): string {
  return cardId.replace(/^(CORE|VAN|LEG)_/, '');
}

export function ruleOf(cardId: string): Rule | undefined {
  return RULES[baseId(cardId)];
}

/** Whether cards of a set can be in a game of a format (Wild and others: all). */
export function inFormat(set: string, format: string | null): boolean {
  return format === 'FT_STANDARD'
    ? STANDARD_SETS.has(set)
    : format === 'FT_CLASSIC'
      ? set === 'VANILLA'
      : true;
}

/** Possible secrets of a class in a format, one per name, by cost and name. */
export function candidates(
  db: CollectibleDb,
  cardClass: string,
  format: string | null,
): CollectibleInfo[] {
  const allowed = (set: string) => inFormat(set, format);
  const byName = new Map<string, CollectibleInfo>();
  for (const card of db.byId.values()) {
    if (!card.secret || card.secret.cardClass !== cardClass || !allowed(card.secret.set)) continue;
    const known = byName.get(card.name);
    // Prefer the printing of the current Standard sets, then the newest.
    const better =
      !known ||
      (STANDARD_SETS.has(card.secret.set) && !STANDARD_SETS.has(known.secret!.set)) ||
      (STANDARD_SETS.has(card.secret.set) === STANDARD_SETS.has(known.secret!.set) &&
        card.dbfId > known.dbfId);
    if (better) byName.set(card.name, card);
  }
  return [...byName.values()].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}

export interface SecretSlot {
  entityId: number;
  /** The opponent's own turn it was played in, if seen. */
  turn: number | null;
  candidates: { card: CollectibleInfo; ruledOut: boolean; byHand: boolean }[];
}

interface Pending {
  triggers: Trigger[];
  /** Secrets hidden when the action began. */
  secrets: number[];
  /** Secret reactions counted when the action began. */
  mark: number;
}

/** Follows the game to rule out secrets; one per game. */
export class SecretsLog {
  /**
   * Triggers that happened without a reaction, by secret entity: `spell-cast`, plus
   * `spell-cast+enemy-minion` when the user had a minion then, and so on.
   */
  private passed = new Map<number, Set<string>>();
  /** Ruled out (or back in) by hand, by secret entity. */
  private manual = new Map<number, Map<string, boolean>>();
  private playedTurn = new Map<number, number>();
  private pending: Pending | null = null;
  /** Counts the times one of the opponent's secrets left play (triggered or removed). */
  private reactions = 0;
  private reactionsAtUserTurn = 0;
  private gameTurn = 0;
  private userTurn = false;
  private cardsThisTurn = 0;

  clear(): void {
    this.passed.clear();
    this.manual.clear();
    this.playedTurn.clear();
    this.pending = null;
    this.reactions = 0;
    this.reactionsAtUserTurn = 0;
    this.gameTurn = 0;
    this.userTurn = false;
    this.cardsThisTurn = 0;
  }

  /** Rules a candidate of a secret out by hand, or back in. */
  toggle(secret: number, cardId: string, ruledOut: boolean): void {
    const map = this.manual.get(secret) ?? new Map<string, boolean>();
    map.set(cardId, ruledOut);
    this.manual.set(secret, map);
  }

  /**
   * Takes one game event. `entities` is the mirror as of this event, `user` and
   * `opponent` the players' ids (PLAYER_ID).
   */
  apply(
    event: Hearthstone.GameEvent,
    entities: Entities,
    user: string | undefined,
    opponent: string | undefined,
  ): void {
    if (event.name === 'game-created') {
      this.clear();
      return;
    }
    if (!user || !opponent) return;
    const controller = (id: number | null) =>
      id === null ? undefined : entities.get(id)?.tags.CONTROLLER;
    const cardType = (id: number | null) =>
      id === null ? undefined : entities.get(id)?.tags.CARDTYPE;

    switch (event.name) {
      case 'turn-start': {
        // The user's turn just ended without a secret reacting during it: turn-end
        // secrets would have triggered.
        if (this.userTurn && this.reactions === this.reactionsAtUserTurn) {
          this.commit(entities, user, opponent);
          this.start(['turn-end'], entities, opponent);
        }
        this.commit(entities, user, opponent);
        this.gameTurn = event.data.turn;
        this.userTurn = event.data.side === 'friendly';
        this.reactionsAtUserTurn = this.reactions;
        this.cardsThisTurn = 0;
        return;
      }
      case 'zone-change': {
        const { entity_id: id, from, to } = event.data;
        if (controller(id) === opponent && to === 'secret' && from !== 'secret') {
          this.playedTurn.set(id, Math.ceil(this.gameTurn / 2));
        }
        if (controller(id) === opponent && from === 'secret') {
          // A secret reacted (or was destroyed): the pending action proves nothing.
          this.reactions += 1;
          this.pending = null;
          return;
        }
        if (controller(id) === user && from === 'hand' && (to === 'play' || to === 'secret')) {
          this.commit(entities, user, opponent);
          this.cardsThisTurn += 1;
          const triggers: Trigger[] = [];
          const type = cardType(id);
          if (type === 'SPELL') triggers.push('spell-cast');
          if (type === 'MINION') triggers.push('minion-played');
          if (this.cardsThisTurn === 3) triggers.push('three-cards');
          this.start(triggers, entities, opponent);
        }
        return;
      }
      case 'attack': {
        const { attacker, defender } = event.data;
        if (controller(attacker) !== user) return;
        this.commit(entities, user, opponent);
        const triggers: Trigger[] = [];
        if (cardType(attacker) === 'MINION') triggers.push('minion-attacks');
        if (controller(defender) === opponent) {
          if (cardType(defender) === 'HERO') triggers.push('hero-attacked');
          if (cardType(defender) === 'MINION') triggers.push('minion-attacked');
        }
        this.start(triggers, entities, opponent);
        return;
      }
      default:
        return;
    }
  }

  /** Whether a card is ruled out automatically for one secret (by a missed trigger). */
  isRuledOut(secret: number, cardId: string): boolean {
    const rule = ruleOf(cardId);
    const passed = this.passed.get(secret);
    return Boolean(rule && passed?.has(rule.needs ? `${rule.on}+${rule.needs}` : rule.on));
  }

  /** The opponent's hidden secrets with their candidates. */
  slots(entities: Entities, opponent: string | undefined, all: CollectibleInfo[]): SecretSlot[] {
    if (!opponent) return [];
    const secrets = this.hiddenSecrets(entities, opponent);
    // The same secret cannot be active twice.
    const active = new Set(
      [...entities.values()]
        .filter((e) => e.tags.CONTROLLER === opponent && e.tags.ZONE === 'SECRET' && e.card_id)
        .map((e) => baseId(e.card_id!)),
    );
    return secrets.map((id) => {
      const passed = this.passed.get(id) ?? new Set<string>();
      const manual = this.manual.get(id) ?? new Map<string, boolean>();
      return {
        entityId: id,
        turn: this.playedTurn.get(id) ?? null,
        candidates: all.map((card) => {
          const byHand = manual.get(card.id);
          const rule = ruleOf(card.id);
          const missed = rule && passed.has(rule.needs ? `${rule.on}+${rule.needs}` : rule.on);
          const automatic = Boolean(missed) || active.has(baseId(card.id));
          return { card, ruledOut: byHand ?? automatic, byHand: byHand !== undefined };
        }),
      };
    });
  }

  private hiddenSecrets(entities: Entities, opponent: string): number[] {
    return [...entities.values()]
      .filter(
        (e) =>
          e.tags.CONTROLLER === opponent &&
          e.tags.ZONE === 'SECRET' &&
          e.tags.SECRET === '1' &&
          !e.card_id,
      )
      .map((e) => e.entity_id)
      .sort((a, b) => a - b);
  }

  private start(triggers: Trigger[], entities: Entities, opponent: string): void {
    const secrets = this.hiddenSecrets(entities, opponent);
    this.pending =
      triggers.length > 0 && secrets.length > 0
        ? { triggers, secrets, mark: this.reactions }
        : null;
  }

  /** The previous action is over: its triggers passed without a reaction. */
  private commit(entities: Entities, user: string, opponent: string): void {
    const pending = this.pending;
    this.pending = null;
    if (!pending || pending.mark !== this.reactions) return;
    const minions = (owner: string) =>
      [...entities.values()].filter(
        (e) =>
          e.tags.CONTROLLER === owner && e.tags.ZONE === 'PLAY' && e.tags.CARDTYPE === 'MINION',
      ).length;
    const conditions = [
      ...(minions(user) > 0 ? ['enemy-minion'] : []),
      ...(minions(opponent) < 7 ? ['board-space'] : []),
    ];
    for (const secret of pending.secrets) {
      const set = this.passed.get(secret) ?? new Set<string>();
      for (const trigger of pending.triggers) {
        set.add(trigger);
        for (const condition of conditions) set.add(`${trigger}+${condition}`);
      }
      this.passed.set(secret, set);
    }
  }
}
