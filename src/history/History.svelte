<script lang="ts">
  import { overlay } from '@overlay/sdk';
  import { tileUrl } from '../lib/cards';
  import { sessionGames, summarize, type GameRecord } from '../battlegrounds/history';
  import { cardName, flint, newSession, t } from '../battlegrounds/store.svelte';

  /** Games shown in the table, newest first. */
  const SHOWN = 100;

  const sessionList = $derived(sessionGames(flint.history, Date.now()));
  const session = $derived(summarize(sessionList));
  const games = $derived([...flint.history.games].reverse().slice(0, SHOWN));
  const dates = $derived.by(() => {
    void flint.locale;
    return new Intl.DateTimeFormat(overlay.i18n.locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  });

  function win(game: GameRecord): boolean {
    return game.place <= (game.duos ? 2 : 4);
  }
</script>

<main>
  <h1>{t('history-title')}</h1>

  <section class="card">
    <div class="card-head">
      <h2>{t('bg-session')}</h2>
      <button onclick={() => void newSession()}>{t('history-new-session')}</button>
    </div>
    {#if session.games === 0}
      <p class="note">{t('bg-session-empty')}</p>
    {:else}
      <p>
        {t('bg-session-summary', {
          games: session.games,
          average: session.average ?? 0,
          wins: session.wins,
        })}
      </p>
      <div class="places">
        {#each sessionList as game (game.seed)}
          <span class="place-chip" class:win={win(game)} class:first={game.place === 1}
            >{game.place}</span
          >
        {/each}
      </div>
    {/if}
  </section>

  <section class="card">
    <h2>{t('history-games')}</h2>
    {#if games.length === 0}
      <p class="note">{t('history-empty')}</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>{t('history-col-date')}</th>
            <th>{t('history-col-hero')}</th>
            <th>{t('history-col-place')}</th>
            <th>{t('history-col-tier')}</th>
            <th>{t('history-col-tribes')}</th>
          </tr>
        </thead>
        <tbody>
          {#each games as game (game.seed)}
            <tr>
              <td class="date">{dates.format(game.endedAt)}</td>
              <td class="hero">
                {#if game.heroCardId}
                  <img
                    src={tileUrl(game.heroCardId)}
                    alt=""
                    loading="lazy"
                    onerror={(e) =>
                      ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                  />
                {/if}
                <span>{cardName(game.heroCardId)}</span>
              </td>
              <td>
                <span class="place-chip" class:win={win(game)} class:first={game.place === 1}
                  >{game.place}</span
                >
              </td>
              <td>{game.tier}</td>
              <td class="tribes">
                {game.tribes.map((tribe) => t('bg-tribe', { tribe })).join(', ')}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</main>
