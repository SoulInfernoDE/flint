<script lang="ts">
  import { t } from '../battlegrounds/store.svelte';
  import type { Counters } from './counters';

  let { counters }: { counters: Counters | null } = $props();
</script>

{#if counters}
  <div class="counters">
    <span title={t('counter-attack-title')}>⚔ {counters.boardAttack}</span>
    {#if counters.nextFatigue !== null}
      <span class="warn" title={t('counter-fatigue-title')}
        >{t('counter-fatigue', { damage: counters.nextFatigue })}</span
      >
    {/if}
    {#if counters.corpses !== null}
      <span title={t('counter-corpses-title')}
        >{t('counter-corpses', { count: counters.corpses })}</span
      >
    {/if}
    {#if counters.spellsPlayed > 0}
      <span>{t('counter-spells', { count: counters.spellsPlayed })}</span>
    {/if}
  </div>
{/if}

<style>
  .counters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    padding: 4px 8px 6px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
  }

  .counters span:first-child {
    color: var(--text);
    font-weight: 700;
  }

  .warn {
    color: var(--danger);
    font-weight: 600;
  }
</style>
