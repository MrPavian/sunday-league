// Hauptmenü und seine Fenster: Einstellungen, Spielstände (Export/Import), neue Karriere, Startablauf.
// Den gemeinsamen Zustand (career, match, mode …) liefert das Kontextobjekt aus main.js.
import { langChosen, setLang, tr } from '../core/i18n.js';
import { saveFile } from '../core/files.js';
import { button, haptic, hapticsOn, setHaptics, Sheet } from '../ui/ds.js';
import { checkWhatsNew, whatsNewLatestHtml } from '../ui/whatsnew.js';
import { activeSlot, createCareer, deleteCareer, exportCareer, humanClub, importCareer, loadCareer, saveCareer, setActiveSlot, slotSummaries } from '../career/career.js';
import { HALF_MAX, HALF_MIN, MATCH, MATCH_LENGTHS, matchDuration } from '../sim/match.js';
import { PITCHES } from '../sim/pitch.js';
import { coachLevel, homeView, setCoachLevel, setHomeView } from '../ui/prefs.js';

export function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // egal
  }
}

export function createMenus(ctx) {
  const { pixel, sound, settings, saveSlots, creator, endScreen, title, params, showMatch, loadVenue, startMatch, setMode } = ctx;

  // Sprache wechseln: Die Seite lädt neu, damit alle Texte in der neuen Sprache entstehen.
  function switchLanguage(lang) {
    setLang(lang);
    if (ctx.career) saveCareer(ctx.career);
    location.reload();
  }

  const saveInfo = () => (ctx.career ? `${humanClub(ctx.career).name}, ${tr('Spieltag', 'matchday')} ${Math.min(ctx.career.round + 1, ctx.career.fixtures.length)}` : null);

  function openMenu() {
    setMode('menu');
    endScreen.hide();
    ctx.clubhouse.hide();
    setTimeout(() => (ctx.menu.paused = false), 0);
    ctx.menu.setCareer(saveInfo());
    // Kulisse: KI-Spiel auf dem zuletzt geladenen Platz (sonst Parkplatz).
    loadVenue(ctx.venue?.id ?? params.get('venue') ?? 'parkplatz');
    startMatch(false);
    ctx.menu.show();
  }

  // Handler für das Hauptmenü (siehe Menu in main.js); die Karriere selbst öffnet openClubhouse.
  const handlers = {
    onCareer() {
      ctx.menu.hide();
      ctx.openClubhouse();
    },
    onSettings() {
      ctx.menu.paused = true;
      settings.show({
        state: () => ({ muted: sound.muted, effects: pixel.effects, tempo: ctx.tempo, tempos: ctx.TEMPOS, volume: sound.volume, safeKits: ctx.colorSafe, length: MATCH.halves ? 'custom' : MATCH.length, cupShort: MATCH.cupShare < 1, pokalExtra: MATCH.pokalExtra, subs: MATCH.subs, coachLevel: coachLevel(), homeView: homeView(), haptics: hapticsOn(), leagueSize: ctx.career ? ctx.career.nextLeagueSize ?? ctx.career.leagueSize ?? 6 : ctx.leagueSize, leagueSizeNow: ctx.career?.leagueSize ?? null }),
        onLang: switchLanguage,
        onChange(key, value) {
          if (key === 'sound' && sound.muted !== (value === 'off')) sound.toggleMute();
          if (key === 'effects') {
            pixel.setEffects(value === 'on');
            remember('sunday-league:fx', pixel.effects ? '1' : '0');
          }
          if (key === 'tempo') {
            ctx.tempo = Number(value);
            remember('sunday-league:tempo', ctx.TEMPOS[ctx.tempo].id);
          }
          if (key === 'volume') sound.setVolume(value / 100);
          if (key === 'safekits') {
            ctx.colorSafe = value === 'off'; // „aus" = nicht Vereinsfarben
            remember('sunday-league:safekits', ctx.colorSafe ? '1' : '0');
            if (ctx.match) showMatch(ctx.match); // Kulisse im Menü sofort umfärben
          }
          if (key === 'haptics') {
            setHaptics(value === 'on');
            haptic('select');
          }
          if (key === 'length' && MATCH_LENGTHS[value]) {
            // Voreinstellung wählen: setzt alle Plätze zurück auf die Vorgabe.
            MATCH.length = value;
            MATCH.halves = null;
            remember('sunday-league:length', value);
            remember('sunday-league:halves', 'null');
          }
          if (key === 'half') {
            const [id, step] = value.split(':');
            const pitch = PITCHES[id];
            if (pitch) {
              const now = matchDuration(pitch) / 2;
              MATCH.halves = { ...(MATCH.halves ?? {}), [id]: Math.max(HALF_MIN, Math.min(HALF_MAX, now + Number(step))) };
              remember('sunday-league:halves', JSON.stringify(MATCH.halves));
            }
          }
          if (key === 'leaguesize') {
            ctx.leagueSize = Number(value) === 6 ? 6 : 8;
            remember('sunday-league:leaguesize', String(ctx.leagueSize));
            if (ctx.career) {
              // Laufende Karriere: gilt ab der nächsten Saison.
              ctx.career.nextLeagueSize = ctx.leagueSize === (ctx.career.leagueSize ?? 6) ? null : ctx.leagueSize;
              saveCareer(ctx.career);
            }
          }
          if (key === 'coachlevel') setCoachLevel(value);
          if (key === 'homeview') setHomeView(value);
          if (key === 'subs') {
            MATCH.subs = value;
            remember('sunday-league:subs', value);
          }
          if (key === 'cupshare') {
            MATCH.cupShare = value === 'on' ? 0.75 : 1;
            remember('sunday-league:cupshare', MATCH.cupShare === 1 ? '1' : '0');
          }
          if (key === 'pokalextra') {
            MATCH.pokalExtra = value === 'extra';
            remember('sunday-league:pokalextra', MATCH.pokalExtra ? '1' : '0');
          }
        },
        onBack() {
          settings.hide();
          setTimeout(() => (ctx.menu.paused = false), 0);
          if (ctx.mode === 'club' && ctx.career) ctx.clubhouse.render(); // aus dem Vereinsheim geöffnet
        },
      });
    },
    onSaves() {
      ctx.menu.paused = true;
      saveSlots.show({
        summaries: () => slotSummaries(),
        active: () => activeSlot(),
        onLoad(slot) {
          setActiveSlot(slot);
          ctx.career = loadCareer();
          saveSlots.hide();
          ctx.menu.paused = false;
          ctx.menu.setCareer(saveInfo());
          if (ctx.career) {
            ctx.menu.hide();
            ctx.openClubhouse();
          }
        },
        onNew(slot) {
          setActiveSlot(slot);
          ctx.career = loadCareer();
          saveSlots.hide();
          ctx.menu.paused = false;
          ctx.menu.onCareerNew();
        },
        onDelete(slot) {
          deleteCareer(undefined, slot);
          if (slot === activeSlot()) ctx.career = null;
          ctx.menu.setCareer(saveInfo());
        },
        onExport(slot) {
          const c = loadCareer(undefined, slot);
          if (!c) return;
          const club = humanClub(c).short ?? 'verein';
          const blob = new Blob([exportCareer(c)], { type: 'application/json' });
          const name = `sunday-league-${club}-saison-${c.season}.json`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
          saveFile(blob, name, { title: tr('Sunday League – Spielstand', 'Sunday League – save game') }).catch((err) => console.error('Export fehlgeschlagen', err));
        },
        onImport(slot, text) {
          try {
            const c = importCareer(text);
            saveCareer(c, undefined, slot);
            if (slot === activeSlot()) ctx.career = c;
            ctx.menu.setCareer(saveInfo());
            return true;
          } catch (err) {
            return err.message === 'json'
              ? tr('Die Datei ist kein gültiger Spielstand (kein JSON).', 'The file is not a valid save (not JSON).')
              : tr('Das ist kein Sunday-League-Spielstand dieser Version.', 'This is not a Sunday League save for this version.');
          }
        },
        onBack() {
          saveSlots.hide();
          setTimeout(() => (ctx.menu.paused = false), 0);
        },
      });
    },
    onCareerNew() {
      // Erst dich selbst anlegen, dann geht es ins Vereinsheim.
      ctx.menu.hide();
      setMode('club');
      const careerSeed = ctx.seed++;
      creator.show({
        seed: careerSeed,
        onDone(coach) {
          creator.hide();
          ctx.career = createCareer({ seed: careerSeed, coach, leagueSize: ctx.leagueSize });
          ctx.career.founding = true; // erst Name, Trikot und Wappen (Gründungsversammlung)
          saveCareer(ctx.career);
          ctx.openClubhouse();
        },
        onCancel() {
          creator.hide();
          openMenu();
        },
      });
    },
  };

  // Startablauf des Hauptmenüs.
  function showStartup() {
    openMenu();
    // Allererster Start: erst die Sprache wählen, dann das Startbild.
    const firstRun = !langChosen() && !params.get('lang');
    // „Was ist neu": einmal nach einem Update, nie beim allerersten Start, nie im Spiel (hier ist immer das Menü offen).
    const whatsNew = new Sheet({ id: 'whatsnew-sheet', onClose: () => setTimeout(() => (ctx.menu.paused = settings.root.hidden ? false : true), 0) });
    whatsNew.el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-action="wn-all"]')) return;
      whatsNew.close();
      settings.page = 'neu';
      ctx.menu.onSettings();
    });
    const maybeWhatsNew = () => {
      if (ctx.mode !== 'menu' || !checkWhatsNew({ isNewPlayer: firstRun })) return;
      const { title: t, body } = whatsNewLatestHtml();
      ctx.menu.paused = true;
      whatsNew.open({
        title: `${tr('Was ist neu', 'What’s new')}: ${t}`,
        body,
        footer: `${button(tr('Alle Änderungen', 'All changes'), { kind: 'secondary', action: 'wn-all' })}${button(tr('Weiter', 'Continue'), { kind: 'primary', action: 'sheet-close' })}`,
      });
    };
    const showTitle = () => {
      if (params.has('notitle')) return maybeWhatsNew();
      ctx.menu.paused = true;
      title.show(() => {
        setTimeout(() => (ctx.menu.paused = false), 0);
        maybeWhatsNew();
      });
    };
    if (firstRun) {
      checkWhatsNew({ isNewPlayer: true }); // neuer Spieler: Version nur merken
      ctx.menu.paused = true;
      settings.show({ onLang: switchLanguage }, { firstRun: true }); // lädt neu, danach kommt das Startbild
    } else showTitle();
  }

  return { handlers, openMenu, showStartup };
}
