// Zuschauer: Plätze für die gemeinsame Crowd (siehe crowd.js). Die Spielorte setzen
// Platzhalter; buildCrowd macht daraus eine Menge mit zwei Draw Calls.
// y: stehend der Boden, sitzend die Oberkante der Sitzfläche.
export { crowdRow, spectatorSlot as makeSpectator } from './crowd.js';
