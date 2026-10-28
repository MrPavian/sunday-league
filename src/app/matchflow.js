// Spielablauf: Karrierespiele, Pokale, Turniere, Relegation (an der Seitenlinie oder im Liveticker),
// Abpfiff werten, Halbzeit. Den gemeinsamen Zustand (career, match, careerMatch …) liefert das Kontextobjekt aus main.js.
import { tr } from '../core/i18n.js';
import {
  clubById,
  currentFixtures,
  finishRound,
  humanClub,
  humanFixture,
  nextSeason,
  prepareMatch,
  recordResult,
  saveCareer,
  simulate,
} from '../career/career.js';
import { venueExtras } from '../career/sponsors.js';
import { advanceCup, CUPS, cupOf, currentCupMatches, humanCupMatch, prepareCupMatch, recordCupResult, skipTournament, startSummerCup, startTournament } from '../career/tournament.js';
import { succeed } from '../career/legacy.js';
import { appointCoach } from '../career/president.js';
import { coachAway, isPresident } from '../career/personal.js';
import { finishFirstLeg, prepareRelegationMatch, recordRelegationLeg, startRelegation } from '../career/relegation.js';
import { finishMidweek, humanTie, POKALE, pokalOf, pokalWhen, preparePokalMatch, recordPokalResult, roundName } from '../career/pokal.js';
import { pendingGame, playDue, prepareOldBoysMatch, recordOldBoysResult } from '../career/oldboys.js';
import { coachLevel } from '../ui/prefs.js';

export function createMatchflow(ctx) {
  const { hud, ticker, endScreen, planPanel, subPanel, halfPanel, creator, hireScreen, testDuration, loadVenue, showMatch, startMatch, setMode } = ctx;

  // Halbzeit im Trainermodus: Spiel steht, Lage ansehen, umstellen, wechseln.
  function openHalftime() {
    const team = ctx.match.coachTeam;
    halfPanel.open(ctx.match, team, {
      onPlan: () => {
        halfPanel.hideForNow();
        planPanel.open(ctx.match, team, { advanced: coachLevel() === 'profi' }, () => halfPanel.reopen());
      },
      onSub: () => {
        halfPanel.hideForNow();
        subPanel.open(ctx.match, team, () => halfPanel.reopen());
      },
      onClose: () => {
        ctx.drainInput = true;
        if (ctx.match.phase === 'halftime') ctx.match.phaseTimer = Math.min(ctx.match.phaseTimer, 0.5); // die Pause war schon lang genug
      },
    });
  }

  function openClubhouse(results = null) {
    setMode('club');
    endScreen.hide();
    // Im Hintergrund kickt irgendwer auf dem eigenen Platz.
    loadVenue(humanClub(ctx.career).venue, venueExtras(ctx.career));
    startMatch(false);
    ctx.clubhouse.show(ctx.career, { results });
    if (!results) resumeRound();
  }

  // Eigenes Spiel schon gewertet, der Rest des Spieltags bzw. der Turnierrunde aber noch
  // nicht (Weiter gedrückt, oder die App wurde nach dem Abpfiff geschlossen): jetzt nachrechnen.
  let resuming = false;
  function resumeRound() {
    if (resuming || ctx.careerMatch) return;
    const fixture = humanFixture(ctx.career);
    if (fixture?.result) return void runRound(fixture);
    for (const kind of Object.keys(CUPS)) {
      const t = cupOf(ctx.career, kind);
      const me = humanClub(ctx.career).id;
      const playedNow = t && t.stage !== 'done' && t.matches.some((m) => m.round === t.round && m.result && (m.home === me || m.away === me));
      if (playedNow && currentCupMatches(ctx.career, kind).length) return void runCupRound(null, kind);
    }
  }

  // Präsidium: man schaut von der Tribüne zu, der eingestellte Trainer coacht (keine Zurufe, keine Wechsel).
  const handsOn = () => !isPresident(ctx.career);
  function spectatorToast() {
    if (!handsOn() && ctx.career.hired) hud.toast(tr(`Von der Tribüne: ${ctx.career.hired.name} coacht`, `From the stand: ${ctx.career.hired.name} is in charge`), 2.5, 2);
  }

  function playCareerMatch() {
    const fixture = humanFixture(ctx.career);
    const prepared = prepareMatch(ctx.career, fixture, { human: handsOn(), duration: testDuration });
    ctx.careerMatch = { prepared, fixture };
    loadVenue(clubById(ctx.career, fixture.home).venue, clubById(ctx.career, fixture.home).human ? venueExtras(ctx.career) : null);
    ctx.clubhouse.hide();
    setMode('play');
    showMatch(prepared.match);
    spectatorToast();
    for (const h of prepared.helpers) {
      const p = prepared.match.players.find((q) => q.poolIndex === h) ?? prepared.match.bench.flat().find((q) => q.poolIndex === h);
      if (p?.helperFor) hud.toast(tr(`${p.name} (Schwager von ${p.helperFor}) hilft aus`, `${p.name} (${p.helperFor}'s brother-in-law) is helping out`), 2.5, 2);
    }
  }

  // Stadtmeisterschaft: eigenes Spiel an der Seitenlinie, der Rest läuft im Hintergrund.
  function playCupMatch(kind) {
    const m = humanCupMatch(ctx.career, kind);
    if (!m) return runCupRound(null, kind);
    const prepared = prepareCupMatch(ctx.career, m, { human: handsOn(), duration: testDuration });
    ctx.careerMatch = { prepared, cup: m };
    loadVenue(prepared.pitch.id);
    ctx.clubhouse.hide();
    setMode('play');
    showMatch(prepared.match);
    spectatorToast();
    hud.toast(kind === 'sommer' ? `${CUPS.sommer.name} – ${cupOf(ctx.career, 'sommer').place ?? ''}` : kind === 'halle' ? tr('Hallen-Stadtmeisterschaft – Sporthalle Kanalschule', 'Indoor City Cup – Kanalschule Sports Hall') : tr('Stadtmeisterschaft – Sportplatz Am Kanal', 'City Cup – Am Kanal Ground'), 2.5, 2);
  }

  async function runCupRound(played, kind = played?.kind ?? 'stadt') {
    if (resuming) return;
    resuming = true;
    ctx.clubhouse.setBusy(kind === 'halle' ? tr('Turnier läuft … auf dem anderen Hallendrittel wird auch gespielt.', 'Tournament under way … the other end of the hall is playing too.') : tr('Turnier läuft … auf dem Nebenplatz wird auch gekickt.', 'Tournament under way … they are playing on the next pitch too.'));
    for (const m of currentCupMatches(ctx.career, kind)) {
      if (m === played) continue;
      const prepared = prepareCupMatch(ctx.career, m, { duration: testDuration });
      await simulate(prepared);
      recordCupResult(ctx.career, m, prepared);
    }
    advanceCup(ctx.career, kind);
    saveCareer(ctx.career);
    resuming = false;
    ctx.clubhouse.tab = 'cup';
    openClubhouse();
  }


  // Simulieren mit Liveticker: Das eigene Spiel läuft als kommentierter Text im
  // Zeitraffer, danach werden die übrigen Partien wie gewohnt gerechnet.
  // Welche Mannschaft im Ticker die eigene ist (nur wenn der Trainer da ist).
  function coachTeamOf(prepared) {
    if (coachAway(ctx.career) || isPresident(ctx.career)) return null; // Präsidium: der eingestellte Trainer coacht
    const i = prepared.match.teams.findIndex((t) => t.name === humanClub(ctx.career).name);
    return i < 0 ? null : i;
  }
  const tickerTitle = (prepared) => tr(`Liveticker · ${prepared.pitch.name}`, `Live ticker · ${prepared.pitch.name}`);

  function tickerRound() {
    const fixture = humanFixture(ctx.career);
    if (!fixture) return runRound(null);
    const prepared = prepareMatch(ctx.career, fixture, { duration: testDuration });
    ctx.clubhouse.hide();
    ticker.show(prepared, {
      title: tickerTitle(prepared),
      coachTeam: coachTeamOf(prepared),
      onDone() {
        recordResult(ctx.career, fixture, prepared);
        saveCareer(ctx.career);
        openClubhouse(); // rechnet den Rest des Spieltags (resumeRound)
      },
    });
  }

  function tickerCup(kind) {
    const m = humanCupMatch(ctx.career, kind);
    if (!m) return runCupRound(null, kind);
    const prepared = prepareCupMatch(ctx.career, m, { duration: testDuration });
    ctx.clubhouse.hide();
    ticker.show(prepared, {
      title: tickerTitle(prepared),
      coachTeam: coachTeamOf(prepared),
      onDone() {
        recordCupResult(ctx.career, m, prepared);
        saveCareer(ctx.career);
        openClubhouse(); // rechnet den Rest der Turnierrunde (resumeRound)
      },
    });
  }

  // Restliche Partien des Spieltags simulieren (und ggf. das eigene Spiel).
  async function runRound(playedFixture) {
    if (resuming) return;
    resuming = true;
    ctx.clubhouse.setBusy(tr('Spieltag läuft … die anderen Plätze melden sich gleich.', 'Matchday under way … the other grounds will report in shortly.'));
    for (const f of currentFixtures(ctx.career)) {
      if (f === playedFixture || f.result) continue;
      const prepared = prepareMatch(ctx.career, f, { duration: testDuration });
      await simulate(prepared);
      recordResult(ctx.career, f, prepared);
    }
    await playDue(ctx.career, (prepared) => simulate(prepared), true); // Alte Herren: das Freitagsspiel, falls niemand zugeschaut hat
    saveCareer(ctx.career);
    resuming = false;
    openClubhouse(currentFixtures(ctx.career));
  }

  // Alte Herren: das Freitagsspiel im Liveticker ansehen (Ergebnis und Kasse wie bei unbeobachteten Spielen).
  function tickerOldBoys() {
    const game = pendingGame(ctx.career);
    if (!game) return openClubhouse();
    const prepared = prepareOldBoysMatch(ctx.career, game);
    ctx.clubhouse.hide();
    ticker.show(prepared, {
      title: tr(`Liveticker · Alte Herren · ${prepared.pitch.name}`, `Live ticker · Old boys · ${prepared.pitch.name}`),
      coachTeam: null,
      onDone() {
        recordOldBoysResult(ctx.career, prepared);
        saveCareer(ctx.career);
        ctx.clubhouse.tab = 'oldboys';
        openClubhouse();
      },
    });
  }

  // Kreis-/Bezirkspokal: das Spiel unter der Woche, vor dem Ligaspieltag.
  function playPokalMatch(kind) {
    const tie = humanTie(ctx.career, kind);
    if (!tie) return openClubhouse();
    const prepared = preparePokalMatch(ctx.career, kind, tie, { human: handsOn(), duration: testDuration });
    ctx.careerMatch = { prepared, pokal: true };
    const ownGround = prepared.home.human && (kind !== 'bund' || prepared.bund?.venue === 'own'); // Heimspiel auf dem eigenen Platz: Vereinsbande wie in der Liga (nicht im fremden Stadion)
    loadVenue(prepared.pitch.id, ownGround ? venueExtras(ctx.career) : null);
    ctx.clubhouse.hide();
    setMode('play');
    showMatch(prepared.match);
    spectatorToast();
    const cup = pokalOf(ctx.career, kind);
    hud.toast(`${POKALE[kind].name} · ${roundName(cup, tie.round)} · ${pokalWhen(kind)}`, 3, 2);
  }

  function tickerPokal(kind) {
    const tie = humanTie(ctx.career, kind);
    if (!tie) return openClubhouse();
    const prepared = preparePokalMatch(ctx.career, kind, tie, { duration: testDuration });
    ctx.clubhouse.hide();
    ticker.show(prepared, {
      title: `${POKALE[kind].name} · ${prepared.pitch.name}`,
      coachTeam: coachTeamOf(prepared),
      onDone() {
        recordPokalResult(ctx.career, prepared);
        saveCareer(ctx.career);
        openClubhouse();
      },
    });
  }

  // Relegation: Hin- oder Rückspiel an der Seitenlinie.
  function playRelegationMatch() {
    startRelegation(ctx.career);
    const prepared = prepareRelegationMatch(ctx.career, { human: handsOn(), duration: testDuration });
    ctx.careerMatch = { prepared, relegation: true };
    loadVenue(prepared.pitch.id);
    ctx.clubhouse.hide();
    setMode('play');
    showMatch(prepared.match);
    spectatorToast();
    const r = ctx.career.relegation;
    hud.toast(r.leg === 0 ? tr(`Relegation, Hinspiel gegen ${r.opponent.name}`, `Play-off, first leg against ${r.opponent.name}`) : tr(`Relegation, Rückspiel – Hinspiel ${r.legs[0].result.ours}:${r.legs[0].result.theirs}`, `Play-off, second leg – first leg ${r.legs[0].result.ours}-${r.legs[0].result.theirs}`), 3, 2);
  }

  function tickerRelegation() {
    startRelegation(ctx.career);
    const prepared = prepareRelegationMatch(ctx.career, { duration: testDuration });
    ctx.clubhouse.hide();
    ticker.show(prepared, {
      title: tr(`Relegation · ${prepared.pitch.name}`, `Play-off · ${prepared.pitch.name}`),
      coachTeam: coachTeamOf(prepared),
      onDone() {
        recordRelegationLeg(ctx.career, prepared);
        saveCareer(ctx.career);
        openClubhouse();
      },
    });
  }

  // Abpfiff: Ergebnis sofort werten und speichern – nicht erst, wenn der Spieler das
  // Kreisblatt weglegt. Wer die App auf dem Ergebnis-Bildschirm schließt, verliert nichts.
  function commitCareerMatch() {
    if (!ctx.careerMatch || ctx.careerMatch.committed) return;
    const { prepared, fixture, cup, relegation, pokal } = ctx.careerMatch;
    ctx.careerMatch.committed = true;
    if (pokal) recordPokalResult(ctx.career, prepared);
    else if (relegation) recordRelegationLeg(ctx.career, prepared);
    else if (cup) recordCupResult(ctx.career, cup, prepared);
    else recordResult(ctx.career, fixture, prepared);
    saveCareer(ctx.career);
  }

  // „Weiter“ auf dem Kreisblatt: zurück ins Vereinsheim, dort läuft der Rest des Spieltags.
  function finishCareerMatch() {
    commitCareerMatch();
    ctx.careerMatch = null;
    openClubhouse();
  }

  // Handler fürs Vereinsheim (Clubhouse in main.js).
  const clubhouseHandlers = {
    onMenu: () => ctx.openMenu(), // erst beim Klick nachschlagen: openMenu kommt nach createMatchflow in ctx (main.js)
    onSettings: () => ctx.menu.onSettings(),
    onChange: () => saveCareer(ctx.career),
    onCoach: () => playCareerMatch(),
    onSimulate: () => tickerRound(),
    onQuickSim: () => runRound(null), // Präsidium: nur das Ergebnis, ohne Zuschauen
    onHireCoach(first = true) {
      // Trainer selbst engagieren (Präsidium): Bewerberliste und Gespräch, dann Unterschrift.
      ctx.clubhouse.hide();
      hireScreen.show(ctx.career, {
        first,
        onDone(cand) {
          const r = appointCoach(ctx.career, cand);
          saveCareer(ctx.career);
          openClubhouse();
          if (!r.ok) hud.toast(tr('Das hat nicht geklappt – die Kasse reicht nicht.', 'That did not work – not enough in the kitty.'), 2.5, 2);
        },
        onCancel() {
          openClubhouse();
        },
      });
    },
    onRelegationNext() {
      finishFirstLeg(ctx.career); // Relegation: vom Hinspiel zum Rückspiel
      saveCareer(ctx.career);
      openClubhouse();
    },
    onMidweekDone() {
      finishMidweek(ctx.career); // Englische Woche: vom Pokalspiel zum nächsten Spiel der Woche
      saveCareer(ctx.career);
      openClubhouse();
    },
    onNextWeek() {
      finishRound(ctx.career);
      saveCareer(ctx.career);
      openClubhouse();
    },
    onCupStart(kind = 'stadt') {
      startTournament(ctx.career, kind);
      saveCareer(ctx.career);
      ctx.clubhouse.tab = 'cup';
      openClubhouse();
    },
    onSummerStart(value = 'invite') {
      const [choice, size] = String(value).split(':');
      if (!startSummerCup(ctx.career, choice, size ? Number(size) : null)) return;
      saveCareer(ctx.career);
      ctx.clubhouse.tab = 'cup';
      openClubhouse();
    },
    onCupSkip(kind = 'stadt') {
      skipTournament(ctx.career, kind);
      saveCareer(ctx.career);
      openClubhouse();
    },
    onCupCoach: (kind = 'stadt') => playCupMatch(kind),
    onPokalCoach: (kind) => playPokalMatch(kind),
    onPokalSimulate: (kind) => tickerPokal(kind),
    onRelCoach: () => playRelegationMatch(),
    onRelSimulate: () => tickerRelegation(),
    onOldBoysTicker: () => tickerOldBoys(),
    onCupSimulate: (kind = 'stadt') => tickerCup(kind),
    onNewCoach() {
      creator.show({
        seed: ctx.career.seed + ctx.career.season,
        successor: humanClub(ctx.career).name,
        onDone(input) {
          creator.hide();
          succeed(ctx.career, { type: 'neu', name: `${input.first} ${input.last}` }, input);
          saveCareer(ctx.career);
          openClubhouse();
        },
        onCancel() {
          creator.hide();
          openClubhouse();
        },
      });
    },
    onNewSeason() {
      nextSeason(ctx.career);
      saveCareer(ctx.career);
      openClubhouse();
    },
  };

  return { openHalftime, openClubhouse, commitCareerMatch, finishCareerMatch, clubhouseHandlers };
}
