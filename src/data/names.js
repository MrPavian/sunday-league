import { getLang } from '../core/i18n.js';

export const FIRST_NAMES = [
  'Dennis', 'Kevin', 'Marco', 'Sascha', 'Jens', 'Torsten', 'Mehmet', 'Lukas', 'Jonas', 'Tobias',
  'Sven', 'Dirk', 'Ali', 'Niklas', 'Florian', 'Patrick', 'Andreas', 'Björn', 'Emre', 'Stefan',
  'Timo', 'Marcel', 'Oliver', 'Jan', 'Kai', 'René', 'Luca', 'Daniel', 'Piotr', 'Nico',
];

export const LAST_NAMES = [
  'Müller', 'Schmitz', 'Kowalski', 'Yılmaz', 'Becker', 'Hoffmann', 'Wagner', 'Schulte', 'Krüger', 'Lange',
  'Fischer', 'Brandt', 'Demir', 'Wolf', 'Neumann', 'Kaya', 'Richter', 'Hartmann', 'Vogel', 'Peters',
];

export const PROFESSIONS = [
  'Paketbote', 'Zahnarzt', 'Azubi Kfz-Mechatroniker', 'Frührentner', 'Grundschullehrer', 'Student (12. Semester)',
  'Dachdecker', 'Barista', 'Pflegekraft', 'IT-Admin', 'Busfahrer', 'Bäcker', 'Versicherungsmakler',
  'Lagerist', 'Elektriker', 'Hausmeister', 'Streetworker', 'Friseur', 'Schichtarbeiter', 'Steuerberater',
];

export const SKIN_TONES = [0xf1d0b5, 0xe6b894, 0xd29f7a, 0xb57c55, 0x8d5a3b, 0x6b4128];
export const HAIR_COLORS = [0x2a1d14, 0x4a3222, 0x7a5230, 0xb08850, 0x1a1a1a, 0x8a8a8a, 0xa0522d];

// Berufe bleiben intern deutsch (Absagen, Ereignisse und Geschichten hängen daran)
// und werden nur für die Anzeige übersetzt.
const JOB_EN = {
  Paketbote: 'parcel courier', Zahnarzt: 'dentist', 'Azubi Kfz-Mechatroniker': 'apprentice car mechanic', Frührentner: 'early retiree',
  Grundschullehrer: 'primary school teacher', 'Student (12. Semester)': 'student (12th semester)', Dachdecker: 'roofer', Barista: 'barista',
  Pflegekraft: 'care worker', 'IT-Admin': 'IT admin', Busfahrer: 'bus driver', Bäcker: 'baker', Versicherungsmakler: 'insurance broker',
  Lagerist: 'warehouse worker', Elektriker: 'electrician', Hausmeister: 'caretaker', Streetworker: 'youth worker', Friseur: 'hairdresser',
  Schichtarbeiter: 'shift worker', Steuerberater: 'tax adviser', Mechatroniker: 'mechatronics technician', Polizist: 'police officer',
  Koch: 'cook', Landschaftsgärtner: 'landscape gardener', Erzieher: 'nursery teacher', Vertriebler: 'sales rep', Angestellter: 'office worker',
  'Schüler (Abi-Jahrgang)': 'pupil (final year)', 'Azubi Elektriker': 'apprentice electrician', 'FSJ im Altenheim': 'volunteer year at a care home',
  Schüler: 'pupil', Azubi: 'apprentice', 'Student (1. Semester)': 'student (1st semester)', 'Azubi Bürokaufmann': 'apprentice office clerk',
  Privatier: 'man of leisure', 'Hat eine Fußballschule': 'runs a football school', 'Teilhaber im Autohaus': 'partner at a car dealership',
  'Gelegentlich TV-Experte': 'occasional TV pundit', Arbeitssuchend: 'job-seeking', 'Aushilfe im Vereinsheim': 'helping out at the clubhouse',
  Lagerlogistiker: 'logistics worker', 'Fahrer beim Getränkehandel': 'driver for a drinks wholesaler', 'Verkäufer im Baumarkt': 'DIY store salesman',
  Sachbearbeiter: 'clerk', 'Junior-Ingenieur': 'junior engineer', 'Trainee bei der Sparkasse': 'trainee at the savings bank',
  Softwareentwickler: 'software developer', Referendar: 'trainee teacher', Erzieherin: 'nursery teacher', Polizistin: 'police officer',
  Lehrerin: 'teacher', Physiotherapeutin: 'physiotherapist', Ingenieurin: 'engineer',
};

export function jobName(job) {
  if (!job || getLang() !== 'en') return job;
  if (JOB_EN[job]) return JOB_EN[job];
  const temp = job.match(/^Aushilfe bei (?:der )?(.+)$/);
  if (temp) return `temp job at ${temp[1]}`;
  return job;
}

// Englisch eingegebener Beruf (Trainer-Editor) → interner deutscher Name, falls bekannt.
export function jobKey(job) {
  const t = (job ?? '').trim().toLowerCase();
  const hit = Object.entries(JOB_EN).find(([, en]) => en === t);
  return hit ? hit[0] : job;
}
export const jobChoices = (list) => list.map((j) => jobName(j));
