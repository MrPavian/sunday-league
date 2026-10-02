// VEREIN (Vereinsmappe): Kasse, Verein (Name, Trikot, Wappen, Ausbau, Chronik), Museum.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { plural, tr } from '../../core/i18n.js';
import { kitPreviewURL } from '../../render/kitPaint.js';
import { museum } from '../../career/museum.js';
import { clubLife, FEE_NAMES, neighborText } from '../../career/clublife.js';
import { reviewHTML } from '../review.js';
import { button, esc } from '../ds.js';
import { CREST_COLORS, CREST_DIVISIONS, CREST_SHAPES, CREST_SYMBOLS, crestOf, crestSVG, defaultCrest, FIGURES } from '../crest.js';
import { humanClub, KIT_COLORS, KIT_PATTERNS, kitEditable, updateCrest, playerOf, table } from '../../career/career.js';
import { FINES, KIT_COST, MEMBER_FEE, SLOTS } from '../../career/finances.js';
import { DESTINATIONS } from '../../career/trip.js';
import { build, canBuild, facilities, FACILITIES } from '../../career/facilities.js';
import { bossOf, goalProgress, goalText, lineOf, negotiate, relLabel, shirtSponsor, sponsorColor, TRAITS as SPONSOR_TRAITS } from '../../career/sponsors.js';
import { chronicleData, yearOf } from '../../career/sagas.js';
import { coachPlaying, legacy } from '../../career/legacy.js';
import { childAge, coachName, familyText, STYLES } from '../../career/personal.js';
import { jobName } from '../../data/names.js';
import { POSITIONS } from '../../sim/generator.js';
import { hex, first, euro } from './shared.js';

export const clubScreens = {
  tab_club() {
    const c = this.career;
    const k = c.coach;
    const me = k?.idx != null ? this.p(k.idx) : null;
    const profile = k
      ? `<div class="me-card"><h4>${tr('Du', 'You')} – ${coachPlaying(c) ? tr('Spielertrainer', 'player-manager') : tr('Trainer', 'manager')}${k.generation > 1 ? tr(` <small>(${k.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${k.generation})</small>`) : ''}</h4>
          <p><b>${coachName(c)}</b>${me ? ` · ${me.age}${tr(' J.', ' yrs')} · ${jobName(me.profession)} · ${POSITIONS[me.position]} · ${tr('Stärke', 'Rating')} ${me.rating}` : ''}</p>
          ${k.style ? `<p>${tr('Spielertyp', 'Player type')}: ${STYLES[k.style]?.name ?? ''}</p>` : ''}
          <p>${k.relation ? familyText(k.relation, k.children ?? []) : k.family}${k.flags.kasse ? tr(' · machst nebenbei die Vereinskasse', ' · also keeping the club accounts') : ''}${k.flags.familyAtGames ? tr(' · die Familie kommt sonntags mit', ' · the family comes along on Sundays') : ''}</p>
          ${(k.children ?? []).length ? `<ul class="plain">${k.children.map((ch) => {
            const age = childAge(c, ch);
            const where = ch.inFrauen ? tr('spielt im Frauenteam', 'plays in the women\'s team') : ch.idx != null ? (c.youth.prospects.includes(ch.idx) ? tr('in der A-Jugend', 'in the U19s') : humanClub(c).squad.includes(ch.idx) ? tr('im Kader', 'in the squad') : tr('spielt woanders', 'plays elsewhere')) : age >= 16 && ch.sex === 'w' ? tr('wartet auf ein Frauenteam', 'waiting for a women\'s team') : tr(`kickt ab 16 mit (noch ${Math.max(0, 16 - age)} Jahre)`, `plays from 16 (${Math.max(0, 16 - age)} years to go)`);
            return `<li>${ch.sex === 'w' ? tr('Tochter', 'Daughter') : tr('Sohn', 'Son')} ${ch.name}, ${age}${tr(' J.', ' yrs')} – ${where}</li>`;
          }).join('')}</ul>` : ''}
          ${this.meBars()}
          <p class="empty">${tr('Training, Scouting und Spieltage kosten Zeit mit der Familie. Unbesetzte Posten (Co-Trainer, Wirt, Platzwart) und Zusatzämter ziehen Energie. Ist einer der beiden Werte leer, fällst du zwei Wochen aus.', 'Training, scouting and matchdays cost family time. Empty posts (assistant, bar manager, groundsman) and extra duties drain energy. If either bar runs empty, you are out for two weeks.')}</p>
        </div>`
      : '';
    return `
      ${profile}
      ${this.facilityBlock()}
      ${this.clubLifeBlock()}
      ${this.chronicleBlock()}
      ${this.kitForm()}
      ${this.crestBlock()}`;
  },

  // Name, Kürzel und Trikot. Bei der Gründung (Karrierestart) ohne Bestellknopf – das macht der Gründungsknopf.
  kitForm(founding = false) {
    const c = this.career;
    const club = humanClub(c);
    const editable = founding || kitEditable(c);
    this.draft ??= { name: club.name, short: club.short, kit: { pattern: 'uni', second: 0xf2efe6, ...club.kit } };
    const d = this.draft;
    const mainSponsor = shirtSponsor(c);
    const sponsorShown = mainSponsor ? { name: mainSponsor.name, color: sponsorColor(mainSponsor) } : null;
    const shirtCss = (k) => `url(${kitPreviewURL(k, sponsorShown)}) center / 100% 100%`;
    const swatches = (part, label) => `
      <div class="swatch-row"><span>${label}</span>${KIT_COLORS.map(
        (col) => `<button class="swatch ${d.kit[part] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="kitColor" data-value="${part}:${col}" ${editable ? '' : 'disabled'}></button>`,
      ).join('')}</div>`;
    return `
      <div class="club-form">
        <div class="kit-preview">
          <div class="shirt" style="background:${shirtCss(d.kit)}"></div>
          <div class="shorts" style="background:${hex(d.kit.shorts)}"></div>
          <div class="socks"><i style="background:${hex(d.kit.socks)}"></i><i style="background:${hex(d.kit.socks)}"></i></div>
          <b>${d.short}</b>
          <small class="sponsor-note">${sponsorShown ? tr(`Auf der Brust: ${sponsorShown.name}`, `On the chest: ${sponsorShown.name}`) : tr('Noch kein Trikotsponsor', 'No shirt sponsor yet')}</small>
        </div>
        <div class="fields">
          <label>${tr('Vereinsname', 'Club name')} <input data-field="name" value="${esc(d.name)}" maxlength="32" ${editable ? '' : 'disabled'}></label>
          <label>${tr('Kürzel', 'Short name')} <input data-field="short" value="${esc(d.short)}" maxlength="4" ${editable ? '' : 'disabled'}></label>
          <div class="swatch-row"><span>${tr('Muster', 'Pattern')}</span>${Object.entries(KIT_PATTERNS)
            .map(([id, label]) => `<button class="${d.kit.pattern === id ? 'active' : ''}" data-action="kitPattern" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          ${swatches('shirt', tr('Trikot', 'Shirt'))}
          ${d.kit.pattern !== 'uni' ? swatches('second', tr('2. Farbe', '2nd colour')) : ''}
          ${swatches('shorts', tr('Hose', 'Shorts'))}
          ${swatches('socks', tr('Stutzen', 'Socks'))}
          ${this.clubNote ? `<p class="warn">${this.clubNote}</p>` : ''}
          ${founding ? '' : editable
            ? `<button class="primary" data-action="saveClub">${tr(`Trikots bestellen <small>(neuer Satz ${KIT_COST} €, Name gratis)</small>`, `Order kits <small>(new set €${KIT_COST}, name change free)</small>`)}</button>`
            : `<p class="warn">${tr('Die Trikots für diese Saison sind bestellt. Änderungen wieder vor dem ersten Spieltag der nächsten Saison.', 'This season\'s kits are ordered. Changes again before the first matchday of next season.')}</p>`}
        </div>
      </div>`;
  },

  // Gründungsversammlung: Zu Karrierebeginn legst du Name, Trikot und Wappen fest – die Erstausstattung ist frei.
  founding() {
    return `<div class="club-panel founding">
        <h2>${tr('Gründungsversammlung', 'Founding meeting')}</h2>
        <p class="lead">${tr('Bevor der Ball rollt: Wie heißt dein Verein, in welchen Farben läuft er auf, und was steht auf dem Wappen? Die ersten Trikots zahlt der Förderverein. Später kostet ein neuer Satz Geld, das Wappen bleibt immer änderbar.', 'Before a ball is kicked: what is your club called, what colours does it play in, and what goes on the crest? The supporters\' club pays for the first kits. Later a new set costs money; the crest can always be changed.')}</p>
        ${this.kitForm(true)}
        ${this.crestBlock(true)}
        <div class="actions founding-actions">
          <button class="primary" data-action="foundClub">${tr('Verein eintragen und loslegen', 'Register the club and get started')}</button>
        </div>
      </div>`;
  },

  crestAction(action, value) {
    const club = humanClub(this.career);
    const d = (this.crestDraft ??= structuredClone(crestOf(club)));
    if (action === 'crestShape') d.shape = value;
    else if (action === 'crestDivision') d.division = value;
    else if (action === 'crestSymbol') d.symbol = value;
    else if (action === 'crestColor') {
      const [slot, col] = value.split(':');
      d.colors[slot] = Number(col);
    } else if (action === 'crestBand') d.band = !d.band;
    else if (action === 'crestSlot') this.crestSlot = value;
    else if (action === 'crestRandom') {
      const seed = { id: `${club.id}-${Math.random()}`, kit: { shirt: d.colors.field, second: d.colors.second } };
      this.crestDraft = { ...defaultCrest(seed), colors: { ...d.colors } };
    } else if (action === 'crestReset') this.crestDraft = null;
    else if (action === 'crestSave') {
      updateCrest(this.career, d);
      this.crestDraft = null;
      this.crestNote = tr('Neues Wappen ist beim Schildermacher bestellt. Und schon auf der Anzeigetafel.', 'New crest ordered from the sign maker. Already on the scoreboard.');
      this.h.onChange();
    }
  },

  // Wappen-Editor: Form, Teilung, Symbol oder Figur, vier Farben, Schriftband.
  crestBlock(founding = false) {
    const club = { ...humanClub(this.career), ...(founding && this.draft ? { name: this.draft.name || humanClub(this.career).name, short: this.draft.short || humanClub(this.career).short } : {}) };
    const d = this.crestDraft ?? crestOf(club);
    const slot = this.crestSlot ?? 'field';
    const mini = (patch) => crestSVG({ ...d, ...patch, colors: d.colors }, { size: 30, short: club.short });
    const choice = (action, entries, current, patch) =>
      entries.map(([id, label]) => `<button class="crest-choice ${current === id ? 'active' : ''}" data-action="${action}" data-value="${id}" title="${label}">${mini(patch(id))}<small>${label}</small></button>`).join('');
    const symbols = Object.entries(CREST_SYMBOLS);
    const slots = tr({ field: 'Feld', second: 'Teilung', symbol: 'Symbol', border: 'Rand & Band' }, { field: 'Field', second: 'Division', symbol: 'Symbol', border: 'Border & band' });
    return `
      <div class="crest-editor">
        <div class="crest-preview">
          ${crestSVG(d, { size: 150, short: club.short, label: club.name })}
          <b>${club.name}</b>
          <div class="crest-actions">
            <button data-action="crestRandom">${tr('Würfeln', 'Shuffle')}</button>
            <button data-action="crestBand" class="${d.band ? 'active' : ''}">${tr('Schriftband', 'Name band')}</button>
            ${this.crestDraft ? `<button data-action="crestReset">${tr('Verwerfen', 'Discard')}</button>` : ''}
            ${founding ? '' : `<button class="primary" data-action="crestSave" ${this.crestDraft ? '' : 'disabled'}>${tr('Wappen übernehmen', 'Use this crest')}</button>`}
          </div>
          ${this.crestNote && !this.crestDraft ? `<p class="empty">${this.crestNote}</p>` : ''}
        </div>
        <div class="crest-options">
          <h4>${tr('Form', 'Shape')}</h4>
          <div class="crest-grid">${choice('crestShape', Object.entries(CREST_SHAPES), d.shape, (id) => ({ shape: id }))}</div>
          <h4>${tr('Teilung', 'Division')}</h4>
          <div class="crest-grid">${choice('crestDivision', Object.entries(CREST_DIVISIONS), d.division, (id) => ({ division: id }))}</div>
          <h4>${tr('Symbole', 'Symbols')}</h4>
          <div class="crest-grid">${choice('crestSymbol', symbols.filter(([id]) => !FIGURES.has(id)), d.symbol, (id) => ({ symbol: id }))}</div>
          <h4>${tr('Figuren', 'Figures')}</h4>
          <div class="crest-grid">${choice('crestSymbol', symbols.filter(([id]) => FIGURES.has(id)), d.symbol, (id) => ({ symbol: id }))}</div>
          <h4>${tr('Farben', 'Colours')}</h4>
          <div class="swatch-row">${Object.entries(slots).map(([id, label]) => `<button class="${slot === id ? 'active' : ''}" data-action="crestSlot" data-value="${id}"><i class="dot" style="background:${hex(d.colors[id])}"></i>${label}</button>`).join('')}</div>
          <div class="swatch-row">${CREST_COLORS.map((col) => `<button class="swatch ${d.colors[slot] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="crestColor" data-value="${slot}:${col}"></button>`).join('')}</div>
        </div>
      </div>`;
  },

  // Vereinschronik – zum Jubiläum als Festschrift.
  chronicleBlock() {
    const d = chronicleData(this.career);
    const title = d.festschrift ? tr(`Festschrift: ${d.festschrift.age} Jahre ${d.name}`, `Anniversary book: ${d.festschrift.age} years of ${d.name}`) : tr(`Chronik des ${d.name}`, `${d.name} chronicle`);
    if (!this.showChronicle) return `<p><button data-action="chronicle">${d.festschrift ? tr('Festschrift lesen', 'Read the anniversary book') : tr('Vereinschronik', 'Club chronicle')}</button> <small>${tr('gegründet', 'founded')} ${d.founded} · ${d.age} ${tr('Jahre', 'years')}</small></p>`;
    const seasons = d.seasons.length
      ? d.seasons.map((h) => `<tr><td>${h.year}</td><td>${h.league}</td><td class="num">${h.pos}.</td><td>${h.pos === 1 ? tr('Meister', 'Champions') : h.relegated ? tr('Abstieg', 'Relegated') : ''}</td><td>${h.topScorer ? `${h.topScorer.name} (${h.topScorer.goals})` : '–'}</td></tr>`).join('')
      : `<tr><td colspan="5"><em>${tr('Die erste Saison läuft noch.', 'The first season is still under way.')}</em></td></tr>`;
    const list = (arr, key, unit) => arr.filter((p) => p[key] > 0).map((p) => `<li>${p.name}${p.active ? '' : tr(' <small>(Ehemaliger)</small>', ' <small>(former)</small>')} – ${p[key]} ${unit}</li>`).join('') || `<li><em>${tr('noch keine', 'none yet')}</em></li>`;
    const events = d.events.length ? d.events.map((e) => `<li><b>${yearOf(this.career, e.season)}</b> ${e.text}</li>`).join('') : `<li><em>${tr('Die großen Geschichten kommen noch.', 'The big stories are still to come.')}</em></li>`;
    const frauen = d.frauen ? `<p>${tr(`Frauenteam seit Saison ${d.frauen.founded}, Kapitänin ${d.frauen.captain}`, `Women's team since season ${d.frauen.founded}, captain ${d.frauen.captain}`)}${d.frauen.seasons.length ? ` · ${tr('Platzierungen', 'Finishes')}: ${d.frauen.seasons.map((s) => `${s.pos}.`).join(', ')}` : ''}</p>` : '';
    const pros = d.pros.length ? `<p>${tr('Aus der eigenen Jugend zu den Profis', 'From our youth to the pros')}: ${d.pros.map((p) => `${p.name} (${p.club})${p.back ? tr(' – zurück im Verein', ' – back at the club') : ''}`).join(', ')}</p>` : '';
    return `<div class="paper chronicle-paper">
        <div class="masthead">${title} <small>${tr('seit', 'since')} ${d.founded}</small></div>
        <p class="lead">${tr(`Gegründet ${d.founded} am Stammtisch einer Kneipe am Kanal – mit einem Ball, elf Leuten und keinem Tor.`, `Founded in ${d.founded} at the regulars' table of a pub by the canal – with one ball, eleven people and no goal.`)}</p>
        <h4>${tr('Saisons', 'Seasons')}</h4>
        <table class="stats season-table"><thead><tr><th>${tr('Jahr', 'Year')}</th><th>${tr('Liga', 'League')}</th><th>${tr('Platz', 'Pos.')}</th><th></th><th>${tr('Torschützenkönig', 'Top scorer')}</th></tr></thead><tbody>${seasons}</tbody></table>
        <div class="records"><div><h4>${tr('Rekordspieler', 'Most appearances')}</h4><ul>${list(d.topApps, 'apps', tr('Spiele', 'games'))}</ul></div><div><h4>${tr('Rekordtorschützen', 'Top scorers')}</h4><ul>${list(d.topGoals, 'goals', tr('Tore', 'goals'))}</ul></div></div>
        ${frauen}${pros}
        ${this.erasBlock()}
        <h4>${tr('Meilensteine', 'Milestones')}</h4><ul class="milestones">${events}</ul>
        <button data-action="chronicle">${tr('Zuklappen', 'Close')}</button>
      </div>`;
  },

  // Trainer-Ären: Wer saß wann an der Seitenlinie?
  erasBlock() {
    const c = this.career;
    const eras = legacy(c).eras;
    const since = c.coach?.since ?? 1;
    const now = c.coach?.idx != null ? `<li><b>${yearOf(c, since)}–${tr('heute', 'today')}</b> ${playerOf(c, c.coach.idx).name}${c.coach.generation > 1 ? tr(` <small>(${c.coach.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${c.coach.generation})</small>`) : ''}</li>` : '';
    if (!eras.length) return '';
    return `<h4>${tr('Trainer', 'Managers')}</h4><ul class="milestones">${eras.map((e) => `<li><b>${yearOf(c, e.from)}–${yearOf(c, e.to)}</b> ${e.name} – ${e.seasons} ${plural(e.seasons, 'Saison', 'Saisons', 'season', 'seasons')}${e.titles ? tr(`, ${e.titles}× Meister`, `, ${e.titles}× champions`) : ''}${tr(', heute Ehrenpräsident', ', now honorary president')}</li>`).join('')}${now}</ul>`;
  },

  // Vereinsheim ausbauen: Handwerker oder Arbeitseinsatz.
  facilityBlock() {
    const c = this.career;
    const f = facilities(c);
    const rows = Object.entries(FACILITIES)
      .map(([id, def]) => {
        const built = f.built[id];
        const building = f.building?.id === id;
        const locked = (def.needs ?? []).some((n) => !f.built[n]);
        const state = built
          ? `<span class="ok">${tr('steht seit Saison', 'built in season')} ${built}</span>`
          : building
            ? `<span class="warn">${tr('im Bau, noch', 'under construction,')} ${f.building.weeks} ${plural(f.building.weeks, 'Woche', 'Wochen', 'week', 'weeks')}${tr('', ' to go')}</span>`
            : locked
              ? `<small>${tr('braucht erst', 'needs first')}: ${def.needs.map((n) => FACILITIES[n].name).join(', ')}</small>`
              : canBuild(c, id)
                ? `<button data-action="build" data-value="${id}:handwerker" ${c.cash < def.cost ? 'disabled' : ''}>${tr('Handwerker', 'Builders')} (${euro(def.cost)})</button>
                   <button data-action="build" data-value="${id}:einsatz" ${c.cash < def.cost / 2 ? 'disabled' : ''}>${tr('Arbeitseinsatz', 'Work party')} (${euro(def.cost / 2)}, ${def.weeks * 2} ${tr('Wo.', 'wks')})</button>`
                : `<small>${tr('erst die laufende Baustelle fertig machen', 'finish the current building work first')}</small>`;
        return `<li class="facility${built ? ' built' : ''}"><div><b>${def.name}</b> <small>${def.weeks} ${plural(def.weeks, 'Woche', 'Wochen', 'week', 'weeks')}${def.upkeep ? ` · ${euro(def.upkeep)}${tr('/Woche Nebenkosten', '/week running costs')}` : ''}</small><br><small>${def.desc}</small></div><div class="state">${state}</div></li>`;
      })
      .join('');
    return `<div class="facilities"><h4>${tr('Vereinsheim ausbauen', 'Upgrade the clubhouse')} <small>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}</small></h4>
      ${f.note ? `<p class="reply ok">${f.note}</p>` : ''}<ul class="plain">${rows}</ul></div>`;
  },

  // Vereinsleben: was die Entscheidungen rund ums Vereinsheim dauerhaft verändert haben.
  clubLifeBlock() {
    const c = this.career;
    const l = clubLife(c);
    const t = l.treasurer && humanClub(c).squad.includes(l.treasurer.idx) ? this.p(l.treasurer.idx).name : c.coach?.flags?.kasse ? tr('du selbst', 'you') : tr('der zweite Vorsitzende', 'the vice-chairman');
    const fee = MEMBER_FEE + l.fee;
    return `<div class="facilities clublife"><h4>${tr('Vereinsleben', 'Club life')}</h4><ul class="plain">
      <li><b>${tr('Beitrag', 'Membership fee')}:</b> ${euro(fee)} ${tr('pro Spieler und Spieltag', 'per player per matchday')} <small>(${FEE_NAMES[l.fee]} · ${tr('beschließt die Jahreshauptversammlung', 'set at the annual general meeting')})</small></li>
      <li><b>${tr('Förderverein', 'Supporters\' club')}:</b> ${l.supporters} ${plural(l.supporters, 'Mitglied', 'Mitglieder', 'member', 'members')} <small>(${euro(l.supporters)}${tr('/Woche', '/week')})</small></li>
      <li><b>${tr('Kassenwart', 'Treasurer')}:</b> ${t}</li>
      <li><b>${tr('Nachbarschaft', 'Neighbourhood')}:</b> ${neighborText(l.neighbors)}</li>
    </ul></div>`;
  },

  // Vereinsmuseum: Vitrine, Rekorde, Legenden, Archiv.
  tab_museum() {
    const c = this.career;
    const club = humanClub(c);
    const mu = museum(c);
    const empty = (t) => `<p class="empty">${t}</p>`;
    const trophies = mu.trophies.length
      ? `<ul class="vitrine">${mu.trophies.map((t) => `<li><span class="cup"></span><b>${t.name}</b><small>${tr('Saison', 'Season')} ${t.season}</small></li>`).join('')}</ul>`
      : empty(tr('Die Vitrine ist noch leer. Der Staublappen liegt bereit.', 'The trophy cabinet is still empty. The duster is ready.'));
    const awards = mu.awards.length ? `<ul class="plain">${mu.awards.map((a) => `<li>★ ${a.name} – ${a.kind === 'season' ? tr('Spieler der Saison', 'Player of the Season') : tr('Spieler des Monats', 'Player of the Month')} (S${a.season})</li>`).join('')}</ul>` : empty(tr('Noch keine Auszeichnung vom Kreisblatt.', 'No Kreisblatt award yet.'));
    const records = mu.records.length ? `<ul class="plain">${mu.records.map((r) => `<li><b>${r.label}:</b> ${r.text}</li>`).join('')}</ul>` : empty(tr('Rekorde entstehen mit der Zeit.', 'Records come with time.'));
    const legends = mu.legends.length ? `<ol class="plain">${mu.legends.map((l) => `<li><span>${l.name}${l.active ? '' : ` <small>(${tr('ehemalig', 'former')})</small>`}</span><b>${l.goals} ${plural(l.goals, 'Tor', 'Tore', 'goal', 'goals')} · ${l.apps} ${plural(l.apps, 'Spiel', 'Spiele', 'app', 'apps')}</b></li>`).join('')}</ol>` : empty(tr('Noch keine Legenden.', 'No legends yet.'));
    const kits = `<div class="archive">${mu.kits.map((k) => `<figure><span class="kit-mini" style="background:url(${kitPreviewURL(k.kit)}) center/100% 100%"></span><figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>`;
    const crests = mu.crests.length ? `<div class="archive">${mu.crests.map((k) => `<figure>${crestSVG(k.crest, { size: 40, short: club.short })}<figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>` : '';
    return `<div class="museum">
      <section><h4>${tr('Vitrine', 'Trophy cabinet')}</h4>${trophies}</section>
      <section><h4>${tr('Ehrentafel', 'Roll of honour')}</h4>${awards}</section>
      <section><h4>${tr('Rekorde', 'Records')}</h4>${records}</section>
      <section><h4>${tr('Vereinslegenden', 'Club legends')}</h4>${legends}</section>
      <section><h4>${tr('Trikot- und Wappenarchiv', 'Kit and crest archive')}</h4>${kits}${crests}</section>
      ${(c.reviews ?? []).length ? `<section><h4>${tr('Sonderhefte', 'Season specials')}</h4>${[...c.reviews].reverse().map((r) => `<details><summary>${r.year}/${String(r.year + 1).slice(2)} · ${r.headline}</summary>${reviewHTML(r)}</details>`).join('')}</section>` : ''}
    </div>`;
  },

  tab_cash() {
    const c = this.career;
    const club = humanClub(c);
    const offers = c.round === 0 && c.offers.length
      ? c.offers
          .map(
            (o, i) => `<article class="rumor" style="--c:${o.renew ? '#5cc46a' : '#c9a227'}"><div class="who"><b>${o.name}</b> <em>${SLOTS[o.slot]}${o.renew ? tr(' · Verlängerung', ' · renewal') : ''}</em>
              <small>${lineOf(o)} · ${bossOf(o)}, ${SPONSOR_TRAITS[o.trait]?.name ?? SPONSOR_TRAITS.treu.name}</small></div>
              <p>${euro(o.weekly)} ${tr('pro Spieltag', 'per matchday')} · ${tr('Bonus', 'bonus')} ${euro(o.bonus)} ${tr('bei', 'for')}: ${goalText(o.goal)}</p>
              <div class="actions"><button class="primary" data-action="sponsor" data-value="${i}">${tr('Unterschreiben', 'Sign')}</button>${o.negotiated ? '' : `<button data-action="negotiate" data-value="${i}">${tr('Nachverhandeln', 'Negotiate')}</button>`}</div></article>`,
          )
          .join('')
      : '';
    const active = c.sponsors.length
      ? c.sponsors
          .map(
            (s) => `<li class="sponsor"><b>${s.name}</b> <small>${SLOTS[s.slot]}${s.seasons ? tr(` · ${s.seasons + 1}. Saison`, ` · season ${s.seasons + 1}`) : ''}</small><br>
              ${euro(s.weekly)}${tr('/Spieltag', '/matchday')}${s.pause > 0 ? tr(` <em>(setzt ${s.pause} Wochen aus)</em>`, ` <em>(pausing for ${s.pause} weeks)</em>`) : s.owed ? tr(` <em>(schuldet ${euro(s.owed)})</em>`, ` <em>(owes ${euro(s.owed)})</em>`) : ''} · ${tr('Bonus', 'bonus')} ${euro(s.bonus)} ${tr('bei', 'for')} ${goalText(s.goal)} <small>(${goalProgress(c, s.goal)})</small>
              <span class="rel"><i style="width:${s.rel ?? 50}%"></i></span><small>${bossOf(s)} ${tr('ist', 'is')} ${relLabel(s.rel ?? 50)}</small></li>`,
          )
          .join('')
      : `<li><em>${tr('noch keine Sponsoren', 'no sponsors yet')}</em></li>`;
    const sinners = Object.entries(c.fines)
      .filter(([idx]) => club.squad.includes(Number(idx)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([idx, amount]) => `<li>${this.p(Number(idx)).name} <b>${euro(amount)}</b></li>`)
      .join('');
    const ledger = c.ledger
      .slice(-12)
      .reverse()
      .map((e) => `<li><span>${tr('ST', 'MD')} ${e.round} · ${e.text}</span><b class="${e.amount < 0 ? 'minus' : 'plus'}">${e.amount > 0 ? '+' : ''}${euro(e.amount)}</b></li>`)
      .join('');
    return `
      <div class="cash-head"><span>${tr('Mannschaftskasse', 'Team kitty')}</span><b class="${c.cash < 0 ? 'minus' : ''}">${euro(c.cash)}</b>
        <small>${tr('Ziel: Saisonabschlussfahrt (ab', 'Goal: end-of-season trip (from')} ${euro(DESTINATIONS.kegeltour.cost)})${c.spirit ? tr(' · Stimmung nach der letzten Fahrt: bestens (weniger Absagen)', ' · spirits after the last trip: excellent (fewer drop-outs)') : ''}</small></div>
      <div class="cash-grid">
        <section><h4>${tr('Sponsoren', 'Sponsors')}</h4><ul class="plain">${active}</ul>
          ${c.sponsorNote && c.round === 0 ? `<p class="reply ok">${c.sponsorNote}</p>` : ''}${offers ? `<h4>${tr('Angebote für diese Saison', 'Offers for this season')}</h4><div class="rumors">${offers}</div>` : c.round === 0 ? '' : `<p class="empty">${tr('Neue Angebote gibt es vor der nächsten Saison.', 'New offers come before next season.')}</p>`}</section>
        <section><h4>${tr('Strafenkatalog', 'Fines list')}</h4><ul class="plain fines">${FINES.map((f) => `<li>${f.label} <b>${euro(f.amount)}</b></li>`).join('')}</ul>
          <h4>${tr('Sünderkartei', 'Hall of shame')}</h4><ol class="plain">${sinners || `<li><em>${tr('alle brav', 'all well behaved')}</em></li>`}</ol></section>
        <section><h4>${tr('Kassenbuch', 'Ledger')}</h4><ul class="plain ledger">${ledger || `<li><em>${tr('noch keine Buchungen', 'no entries yet')}</em></li>`}</ul></section>
      </div>`;
  },
};
