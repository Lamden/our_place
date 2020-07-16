import { writable, get } from 'svelte/store';
//import { config } from './config.js'

export const totalPixels = writable(256)
export const currentColor = writable(['A','B'])

export const walletInstalled = writable('checking');
export const walletInfo = writable({});
export const userAccount = writable("");

export const snackbars = writable([]);
export const dTau = writable(0);
export const showModal = writable({data: {}, show: false});