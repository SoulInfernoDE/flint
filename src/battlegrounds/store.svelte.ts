// Reactive Battlegrounds state for the panel, fed by the overLay SDK.

import type { FluentVariable } from '@fluent/bundle';
import { overlay, type Hearthstone, type SettingValue } from '@overlay/sdk';
import { trackDeck, type DeckState } from '../deck/model';
import { loadCards, loadCollectible, type CardDb, type CollectibleDb } from '../lib/cards';
import { LastBoards, deriveState, isBattlegrounds, type BgState } from './model';
import { addGame, recordGame, type History } from './history';
import { inferTribes, poolTribes, seenMinions, type Tribes } from './tribes';

export const flint = $state<{
  ready: boolean;
  /** Bumped when the language changes, so texts re-render. */
  locale: number;
  info: Hearthstone.GameInfo | null;
  bg: BgState | null;
  tribes: Tribes | null;
  duos: boolean;
  history: History;
  /** The user's deck in a game with a deck (not Battlegrounds). */
  deck: DeckState | null;
  /** Collectible cards; loaded the first time a game with a deck is seen. */
  collectible: CollectibleDb | null;
  cards: CardDb;
  cardsError: string | null;
  cardsLoading: boolean;
  settings: Record<string, SettingValue>;
}>({
  ready: false,
  locale: 0,
  info: null,
  bg: null,
  tribes: null,
  duos: false,
  history: { games: [], sessionStart: null },
  deck: null,
  collectible: null,
  cards: new Map(),
  cardsError: null,
  cardsLoading: true,
  settings: {},
});

export const lastBoards = new LastBoards();

/** Text from Flint's catalogs; reading `flint.locale` re-renders after a language switch. */
export function t(id: string, args?: Record<string, FluentVariable>): string {
  void flint.locale;
  return overlay.i18n.t(id, args);
}

const HISTORY_KEY = 'bg-history';
/** Tribes of the running game; kept when the game ends, for its record. */
let lastTribes: string[] = [];

/** Loads the stored history, changes it and stores it; other windows reload theirs. */
async function updateHistory(change: (history: History) => History): Promise<void> {
  const stored = await overlay.storage.get<History>(HISTORY_KEY).catch(() => null);
  const history = change(stored ?? { games: [], sessionStart: null });
  flint.history = history;
  await overlay.storage.set(HISTORY_KEY, history);
  await overlay.bus.post({ kind: 'history' });
}

async function reloadHistory(): Promise<void> {
  const stored = await overlay.storage.get<History>(HISTORY_KEY).catch(() => null);
  if (stored) flint.history = stored;
}

/** Starts a new session now. */
export function newSession(): Promise<void> {
  return updateHistory((history) => ({ ...history, sessionStart: Date.now() }));
}

function recordEndedGame(): void {
  const info = flint.info;
  if (!info || !isBattlegrounds(info.game_type)) return;
  const record = recordGame(
    overlay.events.entities(),
    info.friendly.player_entity_id,
    info.game_entity_id,
    { endedAt: Date.now(), duos: flint.duos, tribes: lastTribes },
  );
  if (record) {
    updateHistory((history) => addGame(history, record)).catch((error: unknown) =>
      console.warn('[flint] game not stored:', error),
    );
  }
}

let allTribes: { cards: CardDb; tribes: string[] } | null = null;

function tribesOf(cards: CardDb): string[] {
  if (allTribes?.cards !== cards) allTribes = { cards, tribes: poolTribes(cards) };
  return allTribes.tribes;
}

let scheduled = false;

/** Recomputes at most once per frame; combat sends many small batches. */
function recompute(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const info = flint.info;
    if (info?.in_game && info.game_type && !isBattlegrounds(info.game_type)) {
      if (tracksDeck) updateDeck(info);
    } else {
      flint.deck = null;
    }
    if (!info?.in_game || !isBattlegrounds(info.game_type)) {
      flint.bg = null;
      flint.tribes = null;
      return;
    }
    const entities = overlay.events.entities();
    const state = deriveState(
      entities,
      info.friendly.player_entity_id,
      info.opposing.player_entity_id,
    );
    if (state) lastBoards.update(state);
    flint.bg = state;
    flint.duos = info.game_type?.includes('DUO') ?? false;
    flint.tribes =
      flint.cards.size > 0
        ? inferTribes(seenMinions(entities), flint.cards, tribesOf(flint.cards))
        : null;
    // A plain copy: reactive arrays cannot be sent to overLay as they are.
    if (flint.tribes) lastTribes = [...flint.tribes.active];
  });
}

/** Whether this window shows the deck (only it loads the collectible cards). */
let tracksDeck = false;
let collectibleLoading = false;

function updateDeck(info: Hearthstone.GameInfo): void {
  if (!flint.collectible) {
    if (!collectibleLoading) {
      collectibleLoading = true;
      loadCollectible(overlay.i18n.locale())
        .then((db) => (flint.collectible = db))
        .catch((error: unknown) => (flint.cardsError = String(error)))
        .finally(() => {
          collectibleLoading = false;
          recompute();
        });
    }
    return;
  }
  flint.deck = trackDeck(
    overlay.events.entities(),
    info.friendly.player_entity_id,
    info.deck,
    flint.collectible,
  );
}

async function refreshCards(): Promise<void> {
  flint.cardsLoading = true;
  try {
    flint.cards = await loadCards(overlay.i18n.locale());
    flint.cardsError = null;
  } catch (error) {
    flint.cardsError = String(error);
  } finally {
    flint.cardsLoading = false;
    recompute();
  }
}

/**
 * Starts the store; `record` makes this window store finished games (only one may),
 * `deck` makes it follow the user's deck.
 */
export async function start(options: { record?: boolean; deck?: boolean } = {}): Promise<void> {
  tracksDeck = options.deck ?? false;
  await overlay.ready();
  // Texts drawn before the catalogs were loaded show their ids; draw them again.
  flint.locale += 1;
  flint.settings = overlay.settings.get();
  flint.info = await overlay.events.getInfo();
  await reloadHistory();
  flint.ready = true;
  recompute();
  overlay.bus.onMessage((message) => {
    if ((message as { kind?: string } | null)?.kind === 'history') void reloadHistory();
  });

  overlay.events.onInfo((info) => {
    flint.info = info;
    recompute();
  });
  overlay.events.onEntitiesChanged(recompute);
  overlay.events.on((event) => {
    if (event.name === 'game-created') {
      lastBoards.clear();
      lastTribes = [];
    }
    if (event.name === 'game-end' && options.record) recordEndedGame();
  });
  overlay.settings.onChange((settings) => (flint.settings = settings));
  overlay.i18n.onChange(() => {
    flint.locale += 1;
    // Card names follow the language; the deck's cards are loaded again when needed.
    flint.collectible = null;
    void refreshCards();
  });
  await refreshCards();
}

/** Card name in the current language, or the id while card data is missing. */
export function cardName(cardId: string | null): string {
  if (!cardId) return '?';
  return flint.cards.get(cardId)?.name ?? cardId;
}
