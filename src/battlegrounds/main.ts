import { mount } from 'svelte';
import App from './App.svelte';
import { start } from './store.svelte';
import './styles.css';

const target = document.getElementById('app');
if (!target) throw new Error('missing #app mount point');

mount(App, { target });
// This window stores finished games; the others only read them.
void start({ record: true });
