import { mount } from 'svelte';
import { start } from '../battlegrounds/store.svelte';
import History from './History.svelte';
import './history.css';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app mount point');

mount(History, { target });
void start();
