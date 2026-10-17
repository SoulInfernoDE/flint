<script lang="ts">
  import { overlay } from '@overlay/sdk';
  import { tileUrl } from '../lib/cards';
  import type { BgMinion } from './model';
  import { sessionGames, summarize } from './history';
  import { cardName, flint, lastBoards, t } from './store.svelte';

  let panel: HTMLElement | undefined = $state();
  let header: HTMLElement | undefined = $state();
  let hovered: number | null = $state(null);

  const bg = $derived(flint.bg);
  // Recomputed when a game is stored; the session cannot end during a game.
  const sessionList = $derived(sessionGames(flint.history, Date.now()));
  const session = $derived(summarize(sessionList));
  const hoveredBoard = $derived(hovered === null ? undefined : lastBoards.get(hovered));

  // Outside Battlegrounds the panel is empty and lets every click through to the game.
  $effect(() => {
    if (!bg || !panel) {
      void overlay.windows.setClickThrough(true);
      return;
    }
    void overlay.windows.setClickThrough(false);
    const report = () => {
      if (panel) void overlay.windows.setInteractiveRegions([panel.getBoundingClientRect()]);
    };
    const observer = new ResizeObserver(report);
    observer.observe(panel);
    report();
    return () => observer.disconnect();
  });

  $effect(() => {
    if (header) overlay.windows.makeDraggable(header);
  });

  function minionLabel(minion: BgMinion): string {
    return `${cardName(minion.cardId)}${minion.golden ? ' ★' : ''}`;
  }
</script>

{#if bg}
  <section class="panel" bind:this={panel}>
    <header bind:this={header}>
      <img class="logo" src="./icon.svg" alt="" />
      <span class="title">{t('bg-title')}</span>
      <span class="tavern">{t('bg-tavern', { tier: bg.tier })}</span>
      <span class="gold">{t('bg-gold', { gold: bg.gold, max: bg.maxGold })}</span>
    </header>

    {#if flint.tribes}
      <div class="tribes" title={t('bg-tribes')}>
        {#each flint.tribes.active as tribe (tribe)}
          <span class="tribe">{t('bg-tribe', { tribe })}</span>
        {/each}
        {#if flint.tribes.unknown > 0}
          <span class="tribe unknown"
            >{t('bg-tribes-unknown', { count: flint.tribes.unknown })}</span
          >
        {/if}
        {#each flint.tribes.banned as tribe (tribe)}
          <span class="tribe banned" title={t('bg-tribe-banned')}>{t('bg-tribe', { tribe })}</span>
        {/each}
      </div>
    {/if}

    {#if flint.cardsLoading}
      <p class="note">{t('bg-loading-cards')}</p>
    {:else if flint.cardsError}
      <p class="note">{t('bg-cards-failed', { error: flint.cardsError })}</p>
    {/if}

    <h2>{t('bg-lobby')}</h2>
    {#if !bg.heroPicked}
      <p class="note">{t('bg-choosing-hero')}</p>
    {/if}
    <ol class="lobby" hidden={!bg.heroPicked}>
      {#each bg.heroes as hero (hero.playerId)}
        <li
          class="hero"
          class:me={hero.friendly}
          class:next={hero.nextOpponent}
          class:combat={hero.inCombat}
          class:dead={hero.dead}
          onmouseenter={() => (hovered = hero.friendly ? null : hero.playerId)}
          onmouseleave={() => (hovered = null)}
        >
          <span class="place">{hero.place}</span>
          {#if hero.cardId}
            <img
              class="tile"
              src={tileUrl(hero.cardId)}
              alt=""
              loading="lazy"
              onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
            />
          {/if}
          <span class="name">{cardName(hero.cardId)}</span>
          <span class="tier" title={t('bg-tavern', { tier: hero.tier })}>{hero.tier}</span>
          <span class="health">
            {hero.dead ? t('bg-dead') : hero.health}{#if hero.armor > 0 && !hero.dead}<small
                >+{hero.armor}</small
              >{/if}
          </span>
          {#if hero.friendly}
            <span class="tag you">{t('bg-you')}</span>
          {:else if hero.inCombat}
            <span class="tag fight">{t('bg-fighting')}</span>
          {:else if hero.nextOpponent}
            <span class="tag nextup">{t('bg-next')}</span>
          {/if}
        </li>
        {#if hovered === hero.playerId}
          <li class="last-board">
            <h3>{t('bg-last-board')}</h3>
            {#if hoveredBoard && hoveredBoard.length > 0}
              <ul>
                {#each hoveredBoard as minion (minion.entityId)}
                  <li>
                    <span class="stats">{minion.attack}/{minion.health}</span>
                    {minionLabel(minion)}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="note">{t('bg-last-board-none')}</p>
            {/if}
          </li>
        {/if}
      {/each}
    </ol>

    {#if flint.settings['show-board'] !== false}
      <h2>{t('bg-board')}</h2>
      {#if bg.board.length === 0}
        <p class="note">{t('bg-board-empty')}</p>
      {:else}
        <ul class="board">
          {#each bg.board as minion (minion.entityId)}
            <li class:golden={minion.golden}>
              <span class="stats">{minion.attack}/{minion.health}</span>
              <span class="name">{minionLabel(minion)}</span>
              <span class="tier">{minion.tier}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    <h2>{t('bg-session')}</h2>
    {#if session.games === 0}
      <p class="note">{t('bg-session-empty')}</p>
    {:else}
      <div class="session">
        <span>
          {t('bg-session-summary', {
            games: session.games,
            average: session.average ?? 0,
            wins: session.wins,
          })}
        </span>
        <span class="places">
          {#each sessionList.slice(-10) as game (game.seed)}
            <span
              class="place-chip"
              class:win={game.place <= (game.duos ? 2 : 4)}
              class:first={game.place === 1}>{game.place}</span
            >
          {/each}
        </span>
      </div>
    {/if}
  </section>
{/if}
