import { mount } from 'svelte';
import { start } from '../battlegrounds/store.svelte';
import '../battlegrounds/styles.css';
import Deck from './Deck.svelte';
import './deck.css';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app mount point');

mount(Deck, { target });
void start({ deck: true });
