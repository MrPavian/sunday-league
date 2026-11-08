import { tr } from '../core/i18n.js';
// Kleine Vorlieben der Oberfläche, die mehrere Bildschirme brauchen.
const KEY = 'sunday-league:coachlevel';

// Trainer-Ansicht: 'einsteiger' (wenige große Entscheidungen) oder 'profi' (alle Befehle).
export function coachLevel() {
  try {
    return localStorage.getItem(KEY) === 'profi' ? 'profi' : 'einsteiger';
  } catch {
    return 'einsteiger';
  }
}

export function setCoachLevel(level) {
  try {
    localStorage.setItem(KEY, level === 'profi' ? 'profi' : 'einsteiger');
  } catch {
    // egal
  }
}

// Vereinsheim „Heute": 'raum' (Wand und Tisch, Wand siehe wallView) oder 'klassisch' (schlichte Kacheln).
const HOME_KEY = 'sunday-league:homeview';
export function homeView() {
  try {
    return localStorage.getItem(HOME_KEY) === 'klassisch' ? 'klassisch' : 'raum';
  } catch {
    return 'raum';
  }
}

export function setHomeView(view) {
  try {
    localStorage.setItem(HOME_KEY, view === 'klassisch' ? 'klassisch' : 'raum');
  } catch {
    // egal
  }
}

// Wand im Vereinsheim (Raum): eine von drei Varianten statt des früheren Fensters (Nutzerwunsch 2026-11-08: wechselbar).
// 'vitrine' = Pokalvitrine, 'foto' = Mannschaftsfoto, 'gross' = größere Taktiktafel, Pinnwand und Kalender.
export const WALL_VIEWS = ['vitrine', 'foto', 'gross'];
export const WALL_LABEL = () => ({ vitrine: tr('Vitrine', 'Trophy cabinet'), foto: tr('Mannschaftsfoto', 'Team photo'), gross: tr('Große Tafeln', 'Big boards') });
const WALL_KEY = 'sunday-league:wallview';
export function wallView() {
  try {
    const v = localStorage.getItem(WALL_KEY);
    return WALL_VIEWS.includes(v) ? v : 'vitrine';
  } catch {
    return 'vitrine';
  }
}
export function setWallView(view) {
  try {
    localStorage.setItem(WALL_KEY, WALL_VIEWS.includes(view) ? view : 'vitrine');
  } catch {
    // egal
  }
}
