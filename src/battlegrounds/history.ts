// Finished Battlegrounds games and the current session.
//
// A session is a run of games without a long break; the user can also start a new one
// by hand. Games are kept in Flint's storage, newest last.

import type { Entities } from './model';

/** A break longer than this starts a new session. */
export const SESSION_GAP_MS = 4 * 60 * 60 * 1000;
/** Games kept in storage. */
export const HISTORY_LIMIT = 500;

export interface GameRecord {
  /** The game's GAME_SEED, to store each game only once. */
  seed: string;
  endedAt: number;
  heroCardId: string | null;
  place: number;
  tier: number;
  duos: boolean;
  tribes: string[];
}

export interface History {
  games: GameRecord[];
  /** Set when the user starts a new session by hand. */
  sessionStart: number | null;
}

export interface Summary {
  games: number;
  /** Mean placement, or null without games. */
  average: number | null;
  /** Finishes that count as a win: top 4, or top 2 of the four teams in Duos. */
  wins: number;
  firsts: number;
  places: number[];
}

/** The record of a game that just ended, from its entities; null if it is incomplete. */
export function recordGame(
  entities: Entities,
  playerEntityId: number | null | undefined,
  gameEntityId: number | null | undefined,
  extra: { endedAt: number; duos: boolean; tribes: string[] },
): GameRecord | null {
  const player = playerEntityId == null ? undefined : entities.get(playerEntityId);
  const game = gameEntityId == null ? undefined : entities.get(gameEntityId);
  const hero = entities.get(Number(player?.tags.HERO_ENTITY));
  const place = Number(hero?.tags.PLAYER_LEADERBOARD_PLACE ?? 0);
  const seed = game?.tags.GAME_SEED;
  if (!player || !hero || !seed || !(place >= 1)) return null;
  return {
    seed,
    endedAt: extra.endedAt,
    heroCardId: hero.card_id,
    place,
    tier: Number(player.tags.PLAYER_TECH_LEVEL ?? 0),
    duos: extra.duos,
    tribes: extra.tribes,
  };
}

/** The history with `game` added (once per seed), trimmed to the limit. */
export function addGame(history: History, game: GameRecord): History {
  if (history.games.some((g) => g.seed === game.seed)) return history;
  const games = [...history.games, game].slice(-HISTORY_LIMIT);
  return { ...history, games };
}

/** Games of the current session: after the manual start and without a long break. */
export function sessionGames(history: History, now: number): GameRecord[] {
  const session: GameRecord[] = [];
  let later = now;
  for (let i = history.games.length - 1; i >= 0; i--) {
    const game = history.games[i]!;
    if (history.sessionStart !== null && game.endedAt < history.sessionStart) break;
    if (later - game.endedAt > SESSION_GAP_MS) break;
    session.unshift(game);
    later = game.endedAt;
  }
  return session;
}

export function summarize(games: GameRecord[]): Summary {
  const places = games.map((g) => g.place);
  const total = places.reduce((sum, p) => sum + p, 0);
  return {
    games: games.length,
    average: games.length > 0 ? total / games.length : null,
    wins: games.filter((g) => g.place <= (g.duos ? 2 : 4)).length,
    firsts: places.filter((p) => p === 1).length,
    places,
  };
}
