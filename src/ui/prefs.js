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

// Vereinsheim „Heute": 'raum' (Wand, Fenster, Tisch) oder 'klassisch' (schlichte Kacheln).
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
