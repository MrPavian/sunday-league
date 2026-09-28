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
