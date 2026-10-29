// VEREIN (Vereinsmappe): Kasse, Verein (Name, Trikot, Wappen, Ausbau, Chronik), Museum.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { plural, tr } from '../../core/i18n.js';
import { kitPreviewURL } from '../../render/kitPaint.js';
import { museum } from '../../career/museum.js';
import { clubLife, FEE_NAMES, neighborText } from '../../career/clublife.js';
import { reviewHTML } from '../review.js';
import { button, esc, tabs as uiTabs } from '../ds.js';
import { CREST_BAND_TEXTS, CREST_COLORS, CREST_DIVISION_GROUPS, CREST_DIVISIONS, CREST_OVERLAYS, CREST_SHAPES, CREST_SYMBOL_GROUPS, CREST_SYMBOLS, crestExtras, crestOf, crestSVG, defaultCrest, THIRD_COLOR_DIVISIONS } from '../crest.js';
import { awayKitOf, humanClub, KIT_COLLARS, KIT_COLORS, KIT_PATTERNS, KIT_SLEEVES, kitEditable, updateCrest, setFounded, clampFounded, foundedRange, playerOf, table } from '../../career/career.js';
import { spielberichtStreng } from '../../career/spielbericht.js';
import { leagueTitle, VERBAND_CHOICES, verbandLeagues } from '../../career/verband.js';
import { FINES, KIT_COST, MEMBER_FEE, SLOTS } from '../../career/finances.js';
import { DESTINATIONS } from '../../career/trip.js';
import { buildBlock, buildCost, buildWeeks, capacity, facilities, FACILITIES, FACILITY_GROUPS, QUEUE_MAX } from '../../career/facilities.js';
import { CARE, careBlock, HELPER_EFFECT, HELPER_SLOTS, LANGPACHT_FEE, LANGPACHT_SEASONS, MIN_TERM, PACHT_SEASONS, angebotText, platzInfo, platz } from '../../career/platz.js';
import { arenaOf, BRANCHEN, bossOf, cancelCost, goalStatus, goalText, lineOf, relLabel, shirtSponsor, sponsorColor, sponsorDef, termChance, TERMS, termWeekly, TRAITS as SPONSOR_TRAITS, WISHES, wishCost, wishLabel } from '../../career/sponsors.js';
import { newWish } from '../../career/sponsorwish.js';
import { chronicleData, yearOf } from '../../career/sagas.js';
import { coachPlaying, legacy } from '../../career/legacy.js';
import { childAge, coachName, familyText, isPresident, STYLES } from '../../career/personal.js';
import { hiredAge } from '../../career/president.js';
import { STYLES as PLAY_STYLES } from '../../sim/tactics.js';
import { jobName } from '../../data/names.js';
import { POSITIONS } from '../../sim/generator.js';
import { hex, first, euro } from './shared.js';

export const clubScreens = {
  tab_club() {
    const c = this.career;
    const k = c.coach;
    const me = k?.idx != null ? this.p(k.idx) : null;
    const profile = k
      ? `<div class="me-card"><h4>${tr('Du', 'You')} – ${isPresident(c) ? tr('Präsident', 'president') : coachPlaying(c) ? tr('Spielertrainer', 'player-manager') : tr('Trainer', 'manager')}${k.generation > 1 ? tr(` <small>(${k.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${k.generation})</small>`) : ''}</h4>
          <p><b>${coachName(c)}</b>${me ? ` · ${me.age}${tr(' J.', ' yrs')} · ${jobName(me.profession)}${coachPlaying(c) ? ` · ${POSITIONS[me.position]} · ${tr('Stärke', 'Rating')} ${me.rating}` : ''}` : ''}${k.oldBoys ? tr(' · kickt bei den Alten Herren', ' · plays for the old boys') : ''}</p>
          ${k.style && (coachPlaying(c) || k.mode !== 'coachOnly') ? `<p>${tr('Spielertyp', 'Player type')}: ${STYLES[k.style]?.name ?? ''}</p>` : ''}
          <p>${k.relation ? familyText(k.relation, k.children ?? []) : k.family}${k.flags.kasse ? tr(' · machst nebenbei die Vereinskasse', ' · also keeping the club accounts') : ''}${k.flags.familyAtGames ? tr(' · die Familie kommt sonntags mit', ' · the family comes along on Sundays') : ''}</p>
          ${(k.children ?? []).length ? `<ul class="plain">${k.children.map((ch) => {
            const age = childAge(c, ch);
            const where = ch.inFrauen ? tr('spielt im Frauenteam', 'plays in the women\'s team') : ch.idx != null ? (c.youth.prospects.includes(ch.idx) ? tr('in der A-Jugend', 'in the U19s') : humanClub(c).squad.includes(ch.idx) ? tr('im Kader', 'in the squad') : tr('spielt woanders', 'plays elsewhere')) : age >= 16 && ch.sex === 'w' ? tr('wartet auf ein Frauenteam', 'waiting for a women\'s team') : tr(`kickt ab 16 mit (noch ${Math.max(0, 16 - age)} Jahre)`, `plays from 16 (${Math.max(0, 16 - age)} years to go)`);
            return `<li>${ch.sex === 'w' ? tr('Tochter', 'Daughter') : tr('Sohn', 'Son')} ${ch.name}, ${age}${tr(' J.', ' yrs')} – ${where}</li>`;
          }).join('')}</ul>` : ''}
          ${this.meBars()}
          <p class="empty">${isPresident(c) ? tr('Im Präsidium bleibt mehr Zeit für die Familie: kein Sonntag an der Linie, kein Training. Dafür zählt, wen du als Trainer geholt hast.', 'In the president\'s office there is more time for the family: no Sundays on the touchline, no training. What counts now is who you hired as manager.') : tr('Training, Scouting und Spieltage kosten Zeit mit der Familie. Unbesetzte Posten (Co-Trainer, Wirt, Platzwart) und Zusatzämter ziehen Energie. Ist einer der beiden Werte leer, fällst du zwei Wochen aus.', 'Training, scouting and matchdays cost family time. Empty posts (assistant, bar manager, groundsman) and extra duties drain energy. If either bar runs empty, you are out for two weeks.')}</p>
        </div>`
      : '';
    return `
      ${profile}
      ${this.platzBlock()}
      ${this.facilityBlock()}
      ${this.clubLifeBlock()}
      ${this.festivalCard()}
      ${this.chronicleBlock()}
      ${this.kitForm()}
      ${this.crestBlock()}`;
  },

  // Name, Kürzel und Trikot. Bei der Gründung (Karrierestart) ohne Bestellknopf – das macht der Gründungsknopf.
  kitForm(founding = false) {
    const c = this.career;
    const club = humanClub(c);
    const editable = founding || kitEditable(c);
    this.draft ??= { name: club.name, short: club.short, kit: { pattern: 'uni', second: 0xf2efe6, collar: 'standard', sleeves: 'main', ...club.kit }, awayKit: { ...awayKitOf(club) } };
    const away = this.kitSide === 'away';
    // Heim- oder Auswärtstrikot im Editor: d.kit ist der gerade bearbeitete Satz.
    const d = { ...this.draft, kit: this.draftKit() };
    const mainSponsor = shirtSponsor(c);
    const sponsorShown = mainSponsor ? { id: mainSponsor.id, name: mainSponsor.name, color: sponsorColor(mainSponsor) } : null;
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
          <div class="swatch-row kit-side"><span>${tr('Satz', 'Set')}</span>${[['home', tr('Heim', 'Home')], ['away', tr('Auswärts', 'Away')]]
            .map(([id, label]) => `<button class="${(id === 'away') === away ? 'active' : ''}" data-action="kitSide" data-value="${id}">${label}</button>`)
            .join('')}</div>
          <label>${tr('Vereinsname', 'Club name')} <input data-field="name" value="${esc(d.name)}" maxlength="32" ${editable ? '' : 'disabled'}></label>
          <label>${tr('Kürzel', 'Short name')} <input data-field="short" value="${esc(d.short)}" maxlength="4" ${editable ? '' : 'disabled'}></label>
          <div class="swatch-row"><span>${tr('Muster', 'Pattern')}</span>${Object.entries(KIT_PATTERNS)
            .map(([id, label]) => `<button class="${d.kit.pattern === id ? 'active' : ''}" data-action="kitPattern" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          <div class="swatch-row"><span>${tr('Kragen', 'Collar')}</span>${Object.entries(KIT_COLLARS)
            .map(([id, label]) => `<button class="${(d.kit.collar ?? 'standard') === id ? 'active' : ''}" data-action="kitCollar" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          <div class="swatch-row"><span>${tr('Ärmel', 'Sleeves')}</span>${Object.entries(KIT_SLEEVES)
            .map(([id, label]) => `<button class="${(d.kit.sleeves ?? 'main') === id ? 'active' : ''}" data-action="kitSleeves" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          ${swatches('shirt', tr('Trikot', 'Shirt'))}
          ${d.kit.pattern !== 'uni' || d.kit.sleeves === 'second' ? swatches('second', tr('2. Farbe', '2nd colour')) : ''}
          ${swatches('shorts', tr('Hose', 'Shorts'))}
          ${swatches('socks', tr('Stutzen', 'Socks'))}
          ${this.clubNote ? `<p class="warn">${this.clubNote}</p>` : ''}
          ${founding ? '' : editable
            ? `<button class="primary" data-action="saveClub">${tr(`Trikots bestellen <small>(neuer Satz ${KIT_COST} €, Name gratis)</small>`, `Order kits <small>(new set €${KIT_COST}, name change free)</small>`)}</button>`
            : `<p class="warn">${tr('Die Trikots für diese Saison sind bestellt. Änderungen wieder vor dem ersten Spieltag der nächsten Saison.', 'This season\'s kits are ordered. Changes again before the first matchday of next season.')}</p>`}
        </div>
      </div>`;
  },

  // Der im Editor gewählte Satz (Heim oder Auswärts) des Entwurfs.
  draftKit() {
    return this.kitSide === 'away' ? this.draft.awayKit : this.draft.kit;
  },

  // Landesverband: Auswahl nach Bundesland, darunter die Ligen von unten nach oben.
  verbandBlock() {
    const cur = this.career.verband ?? 'kanal';
    const opts = [`<option value="kanal"${cur === 'kanal' ? ' selected' : ''}>${tr('Kanalbezirk (erfunden)', 'Canal District (fictional)')}</option>`, ...VERBAND_CHOICES().map((o) => `<option value="${o.id}"${cur === o.id ? ' selected' : ''}>${esc(o.label)}</option>`)].join('');
    return `<div class="club-form verband-form"><label>${tr('Landesverband', 'State association')} <select data-verband>${opts}</select></label>
      <p class="t-2">${tr('Bestimmt die Namen der Ligen (Quelle: Spielklassen je Verband). Orte und Vereine bleiben erfunden.', 'Sets the league names (source: divisions per association). Towns and clubs stay fictional.')}</p>
      <p class="t-2 verband-leagues">${verbandLeagues(this.career)}</p></div>`;
  },

  // Gründungsversammlung: Zu Karrierebeginn legst du Name, Trikot und Wappen fest – die Erstausstattung ist frei.
  founding() {
    return `<div class="club-panel founding">
        <h2>${tr('Gründungsversammlung', 'Founding meeting')}</h2>
        <p class="lead">${tr('Bevor der Ball rollt: Wie heißt dein Verein, in welchen Farben läuft er auf, und was steht auf dem Wappen? Die ersten Trikots zahlt der Förderverein. Später kostet ein neuer Satz Geld, das Wappen bleibt immer änderbar.', 'Before a ball is kicked: what is your club called, what colours does it play in, and what goes on the crest? The supporters\' club pays for the first kits. Later a new set costs money; the crest can always be changed.')}</p>
        ${this.verbandBlock()}
        ${this.kitForm(true)}
        ${this.crestBlock(true)}
        <div class="actions founding-actions">
          <button class="primary" data-action="foundClub">${tr('Verein eintragen und loslegen', 'Register the club and get started')}</button>
        </div>
      </div>`;
  },

  crestAction(action, value) {
    const club = humanClub(this.career);
    // Reiter und Farbfach ändern nichts am Wappen: kein Entwurf nötig.
    if (action === 'crestTab') return void (this.crestTab = value);
    if (action === 'crestSlot') return void (this.crestSlot = value);
    const d = (this.crestDraft ??= structuredClone(crestOf(club)));
    if (action === 'crestShape') d.shape = value;
    else if (action === 'crestDivision') d.division = value;
    else if (action === 'crestOverlay') d.overlay = value;
    else if (action === 'crestSymbol') d.symbol = value;
    else if (action === 'crestColor') {
      const [slot, col] = value.split(':');
      d.colors[slot] = Number(col);
    } else if (action === 'crestBand') d.band = !d.band;
    else if (action === 'crestBandText') (d.band = true), (d.bandText = value);
    else if (action === 'crestStars') d.stars = !(d.stars ?? true);
    else if (action === 'crestYear') this.crestYear = clampFounded(this.career, value);
    else if (action === 'crestYearStep') this.crestYear = clampFounded(this.career, (this.crestYear ?? crestExtras(this.career).year) + Number(value));
    else if (action === 'crestRandom') {
      const seed = { id: `${club.id}-${Math.random()}`, kit: { shirt: d.colors.field, second: d.colors.second } };
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const symbols = Object.keys(CREST_SYMBOLS).filter((id) => id !== 'keins');
      this.crestDraft = { ...defaultCrest(seed), shape: pick(Object.keys(CREST_SHAPES)), division: pick(Object.keys(CREST_DIVISIONS)), symbol: pick(symbols), overlay: Math.random() < 0.3 ? pick(Object.keys(CREST_OVERLAYS)) : 'keine', colors: { ...d.colors } };
    } else if (action === 'crestReset') (this.crestDraft = null), (this.crestYear = null);
    else if (action === 'crestSave') {
      if (JSON.stringify(d) !== JSON.stringify(crestOf(club))) updateCrest(this.career, d, this.crestYear);
      else if (this.crestYear != null) setFounded(this.career, this.crestYear);
      this.crestDraft = null;
      this.crestYear = null;
      this.crestNote = tr('Neues Wappen ist beim Schildermacher bestellt. Und schon auf der Anzeigetafel.', 'New crest ordered from the sign maker. Already on the scoreboard.');
      this.h.onChange();
    }
  },

  // Große Vorschau und Gründungsjahr darunter; auch zum Auffrischen beim Tippen im Jahresfeld (ohne Neuzeichnen).
  crestLive() {
    const founding = !!this.career.founding;
    const club = { ...humanClub(this.career), ...(founding && this.draft ? { name: this.draft.name || humanClub(this.career).name, short: this.draft.short || humanClub(this.career).short } : {}) };
    const d = this.crestDraft ?? crestOf(club);
    const extra = crestExtras(this.career);
    const year = this.crestYear ?? extra.year;
    return { club, d, extra, year, svg: crestSVG(d, { size: 120, short: club.short, year, stars: extra.stars, label: club.name }) };
  },

  // Wappen-Editor: Vorschau immer sichtbar, darunter Reiter Form / Muster / Farben / Symbol / Band & Jahr.
  crestBlock(founding = false) {
    const { club, d, extra, year, svg } = this.crestLive();
    const [yMin, yMax] = foundedRange(this.career);
    const tab = this.crestTab ?? 'form';
    const slot = this.crestSlot ?? 'field';
    const mini = (patch) => crestSVG({ ...d, ...patch, colors: d.colors }, { size: 30, short: club.short, year });
    const choice = (action, entries, current, patch) =>
      entries.map(([id, label]) => `<button class="crest-choice ${current === id ? 'active' : ''}" data-action="${action}" data-value="${id}" title="${label}" aria-pressed="${current === id}">${mini(patch(id))}<small>${label}</small></button>`).join('');
    const group = (title, body) => `<h4>${title}</h4><div class="crest-grid">${body}</div>`;
    const slots = tr({ field: 'Feld', second: 'Zweite Farbe', third: 'Dritte Farbe', symbol: 'Symbol', border: 'Rand & Band' }, { field: 'Field', second: 'Second colour', third: 'Third colour', symbol: 'Symbol', border: 'Border & band' });
    const tabs = [['form', tr('Form', 'Shape')], ['muster', tr('Muster', 'Pattern')], ['farben', tr('Farben', 'Colours')], ['symbol', tr('Symbol', 'Symbol')], ['band', tr('Band/Jahr', 'Band/Year')]];
    const panels = {
      form: group(tr('Schildform', 'Shield shape'), choice('crestShape', Object.entries(CREST_SHAPES), d.shape, (id) => ({ shape: id }))),
      muster:
        CREST_DIVISION_GROUPS.map((g) => group(g.label, choice('crestDivision', g.ids.map((id) => [id, CREST_DIVISIONS[id]]), d.division, (id) => ({ division: id })))).join('') +
        group(tr('Rand, Ring und Haupt (dritte Farbe)', 'Border, ring and chief (third colour)'), choice('crestOverlay', Object.entries(CREST_OVERLAYS), d.overlay ?? 'keine', (id) => ({ overlay: id }))),
      farben: `<h4>${tr('Farbfach wählen', 'Pick a colour slot')}</h4>
          <div class="swatch-row crest-slots">${Object.entries(slots).map(([id, label]) => `<button class="${slot === id ? 'active' : ''}" data-action="crestSlot" data-value="${id}"><i class="dot" style="background:${hex(d.colors[id])}"></i>${label}</button>`).join('')}</div>
          <div class="swatch-row">${CREST_COLORS.map((col) => `<button class="swatch ${d.colors[slot] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="crestColor" data-value="${slot}:${col}" aria-label="${hex(col)}"></button>`).join('')}</div>
          <p class="empty">${THIRD_COLOR_DIVISIONS.has(d.division) || (d.overlay ?? 'keine') !== 'keine' ? '' : tr('Die dritte Farbe braucht ein dreifarbiges Muster oder einen Rand/Ring (Reiter Muster).', 'The third colour needs a three-colour pattern or a border/ring (Pattern tab).')}</p>`,
      symbol: CREST_SYMBOL_GROUPS.map((g) => group(g.label, choice('crestSymbol', g.ids.map((id) => [id, CREST_SYMBOLS[id]]), d.symbol, (id) => ({ symbol: id })))).join('') + group(tr('Ohne Motiv', 'No emblem'), choice('crestSymbol', [['keins', CREST_SYMBOLS.keins]], d.symbol, (id) => ({ symbol: id }))),
      band: `<h4>${tr('Schriftband', 'Name band')}</h4>
          <div class="swatch-row"><button class="${d.band ? '' : 'active'}" data-action="crestBand" aria-pressed="${!d.band}" ${d.band ? '' : 'disabled'}>${tr('Ohne Band', 'No band')}</button>${Object.entries(CREST_BAND_TEXTS).map(([id, label]) => `<button class="${d.band && (d.bandText ?? 'short') === id ? 'active' : ''}" data-action="crestBandText" data-value="${id}">${label}</button>`).join('')}</div>
          <h4>${tr('Gründungsjahr', 'Founding year')}</h4>
          <div class="crest-year" data-testid="crest-year">
            <button data-action="crestYearStep" data-value="-10" aria-label="-10">−10</button><button data-action="crestYearStep" data-value="-1" aria-label="-1">−1</button>
            <input type="number" inputmode="numeric" min="${yMin}" max="${yMax}" step="1" value="${year}" data-crest-year aria-label="${tr('Gründungsjahr', 'Founding year')}">
            <button data-action="crestYearStep" data-value="1" aria-label="+1">+1</button><button data-action="crestYearStep" data-value="10" aria-label="+10">+10</button>
          </div>
          <p class="empty">${tr(`Von ${yMin} bis ${yMax}. Das Jahr steht im Schriftband („Jahr“ oder „Beides“), in der Vereinschronik und bestimmt die Jubiläen.`, `From ${yMin} to ${yMax}. The year appears on the name band ("Year" or "Both"), in the club chronicle and sets the anniversaries.`)}</p>
          <h4>${tr('Meistersterne', 'Champion stars')}</h4>
          <div class="swatch-row"><button data-action="crestStars" class="${d.stars ?? true ? 'active' : ''}" aria-pressed="${d.stars ?? true}" title="${tr('Ein Stern je Meisterschaft, bis zu fünf', 'One star per league title, up to five')}">${tr('Sterne über dem Wappen', 'Stars above the crest')} (${extra.stars})</button></div>`,
    };
    const dirty = !!this.crestDraft || this.crestYear != null;
    return `
      <div class="crest-editor" data-testid="crest-editor">
        <div class="crest-stage">
          <div class="crest-live" data-testid="crest-preview">${svg}</div>
          <div class="crest-side">
            <b>${esc(club.name)}</b>
            <small>${tr('gegründet', 'founded')} ${year}</small>
          </div>
          ${founding ? '' : `<button class="primary crest-apply" data-action="crestSave" title="${tr('Wappen übernehmen', 'Use this crest')}" ${dirty ? '' : 'disabled'}>${tr('Übernehmen', 'Apply')}</button>`}
        </div>
        <div class="crest-actions">
          <button data-action="crestRandom">${tr('Würfeln', 'Shuffle')}</button>
          ${dirty ? `<button data-action="crestReset">${tr('Verwerfen', 'Discard')}</button>` : ''}
        </div>
        ${this.crestNote && !dirty ? `<p class="empty crest-note">${this.crestNote}</p>` : ''}
        <div class="crest-options" data-testid="crest-options">
          ${uiTabs(tabs, tab, 'crestTab').replace('class="ui-tabs"', 'class="ui-tabs crest-tabs"')}
          <div class="crest-panel" data-tab="${tab}">${panels[tab] ?? panels.form}</div>
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
    const h = c.hired;
    // Präsidium: an der Linie steht der eingestellte Trainer, die eigene Figur sitzt im Präsidium.
    const now = isPresident(c)
      ? h ? `<li><b>${yearOf(c, h.since)}–${tr('heute', 'today')}</b> ${esc(h.name)} <small>(${hiredAge(c)}, ${PLAY_STYLES[h.style].label})</small></li>` : `<li><b>${tr('heute', 'today')}</b> ${tr('Trainerstelle vakant', 'manager post vacant')}</li>`
      : c.coach?.idx != null ? `<li><b>${yearOf(c, since)}–${tr('heute', 'today')}</b> ${playerOf(c, c.coach.idx).name}${c.coach.generation > 1 ? tr(` <small>(${c.coach.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${c.coach.generation})</small>`) : ''}</li>` : '';
    if (!eras.length && !isPresident(c)) return '';
    return `<h4>${tr('Trainer', 'Managers')}</h4><ul class="milestones">${eras.map((e) => `<li><b>${yearOf(c, e.from)}–${yearOf(c, e.to)}</b> ${e.name} – ${e.seasons} ${plural(e.seasons, 'Saison', 'Saisons', 'season', 'seasons')}${e.titles ? tr(`, ${e.titles}× Meister`, `, ${e.titles}× champions`) : ''}${e.how === 'extern' ? tr(`, dann Präsident – Nachfolger an der Linie: ${esc(e.successor)}`, `, then president – successor on the touchline: ${esc(e.successor)}`) : tr(', heute Ehrenpräsident', ', now honorary president')}</li>`).join('')}${now}</ul>`;
  },

  // Platz und Pacht: Zustand, Pflege (Ehrenamtliche oder Fachbetrieb) und der Vertrag mit der Gemeinde.
  platzBlock() {
    const c = this.career;
    const i = platzInfo(c);
    const bar = (label, v, text) => `<div class="me-bar ${v < 0.25 ? 'low' : v < 0.5 ? 'mid' : ''}"><span>${label}</span><i style="--v:${Math.round(v * 100)}%"></i><small>${text}</small></div>`;
    const v = i.vertrag;
    const typ = v ? { pacht: tr('Pacht von der Gemeinde', 'leased from the council'), langpacht: tr('Langzeitpacht', 'long-term lease'), eigen: tr('Eigentum des Vereins', 'owned by the club') }[v.typ] : '';
    const term = !v ? '' : v.typ === 'eigen' ? '' : tr(` · läuft noch ${i.left} ${plural(i.left, 'Saison', 'Saisons', 'season', 'seasons')}`, ` · ${i.left} ${plural(i.left, 'season', 'seasons', 'season', 'seasons')} left`);
    const buyDisabled = c.cash < i.price;
    const contract = !v
      ? `<p class="empty">${tr('Im Hinterhof gibt es keinen Pachtvertrag – den schließt du erst mit einem richtigen Sportplatz ab.', 'There is no lease in the backyard – you only sign one once you have a proper sports ground.')}</p>`
      : `<ul class="plain">
        <li><b>${tr('Platz', 'Ground')}:</b> ${typ}${term}</li>
        <li><b>${tr('Kosten', 'Cost')}:</b> ${v.typ === 'eigen' ? tr('Grundsteuer und Unterhalt', 'property tax and upkeep') : `${euro(Math.round(i.perMatch * 10) / 10)} ${tr('je Heimspiel', 'per home game')} <small>(≈ ${euro(Math.round(i.perSeason))} ${tr('im Jahr', 'a year')}${c.staff?.platzwart ? tr(', Platzwart halbiert', ', halved by the groundsman') : ''})</small>`}</li>
        <li><b>${tr('Bauen', 'Building')}:</b> ${i.left >= MIN_TERM ? tr('erlaubt', 'allowed') : `<span class="warn">${tr(`erst ab ${MIN_TERM} Saisons Restlaufzeit oder mit eigenem Grund`, `only with ${MIN_TERM}+ seasons left or owned land`)}</span>`}</li>
      </ul>
      ${i.angebot ? `<p class="reply ok">${angebotText(i.angebot)}</p><div class="ui-row">${button(`${tr('Verlängern', 'Renew')} (${PACHT_SEASONS} ${tr('Saisons', 'seasons')}, ${euro(Math.round(15 * i.angebot.mul * (c.staff?.platzwart ? 0.5 : 1) * 10) / 10)}/${tr('Spiel', 'game')})`, { action: 'pachtRenew' })}</div>` : ''}
      ${v.typ !== 'eigen' ? `<div class="ui-row">
        ${v.typ === 'pacht' || i.angebot ? button(`${tr('Langzeitpacht', 'Long-term lease')} (${LANGPACHT_SEASONS} ${tr('Saisons', 'seasons')}, −20 %, ${euro(LANGPACHT_FEE)})`, { action: 'pachtLong', disabled: c.cash < LANGPACHT_FEE }) : ''}
        ${i.kind !== 'none' ? button(`${tr('Grundstück kaufen', 'Buy the land')} (${euro(i.price)})`, { action: 'pachtBuy', disabled: buyDisabled }) : ''}</div>
        <p class="empty">${tr('Wer kauft, zahlt keine Pacht mehr (nur Grundsteuer), baut ohne Genehmigungsgebühr und kann nicht gekündigt werden.', 'If you buy, you no longer pay rent (only property tax), build without permit fees and cannot be given notice.')}</p>` : ''}`;
    let care = '';
    if (i.kind === 'none') care = `<p class="empty">${tr('Hier gibt es keinen Rasen zu pflegen.', 'There is no grass to look after here.')}</p>`;
    else if (i.kind === 'kunst') care = `<p class="empty">${tr('Kunstrasen: kein Verschleiß, keine Platzsperre, nichts zu mähen.', 'Artificial turf: no wear, no closures, nothing to mow.')}</p>`;
    else {
      const p = platz(c);
      const rows = Object.entries(CARE)
        .filter(([, def]) => def.kinds.includes(i.kind))
        .map(([id, def]) => {
          const helperBlock = careBlock(c, id, 'helfer');
          const proBlock = careBlock(c, id, 'profi');
          const why = { done: tr('diese Woche erledigt', 'done this week'), gap: tr('noch nicht wieder nötig', 'not needed again yet'), fine: tr('nicht nötig', 'not needed'), weather: tr('bei dem Wetter sinnlos', 'pointless in this weather') }[helperBlock ?? proBlock];
          const btns = why && (helperBlock === 'done' || helperBlock === 'gap' || helperBlock === 'fine' || helperBlock === 'weather')
            ? `<small>${why}</small>`
            : `${button(`${tr('Helfer', 'Volunteers')}`, { action: 'care', value: `${id}:helfer`, disabled: helperBlock !== null })}${button(`${tr('Fachbetrieb', 'Contractor')} (${euro(def.cost)})`, { action: 'care', value: `${id}:profi`, disabled: proBlock !== null })}`;
          return `<li class="facility"><div><b>${def.name}</b><br><small>${def.desc}</small></div><div class="state">${btns}</div></li>`;
        })
        .join('');
      care = `<div class="me-bars">${bar(tr('Rasen', 'Pitch'), i.cond, i.label)}${bar(tr('Linien', 'Lines'), i.chalk, i.chalk >= 0.6 ? tr('frisch', 'fresh') : i.chalk >= 0.25 ? tr('blass', 'faded') : tr('kaum zu sehen', 'barely visible'))}</div>
        ${c.staff?.platzwart ? `<p class="empty">${tr('Der Platzwart mäht und zieht ab von selbst; Helfer arbeiten mit seiner Anleitung voll.', 'The groundsman mows and drags by himself; volunteers work at full effect under his guidance.')}</p>` : `<p class="empty">${tr(`Ehrenamtliche schaffen ${Math.round(HELPER_EFFECT * 100)} % (höchstens ${HELPER_SLOTS} Einsätze pro Woche), der Fachbetrieb 100 % gegen Bezahlung.`, `Volunteers manage ${Math.round(HELPER_EFFECT * 100)} % (at most ${HELPER_SLOTS} jobs per week), the contractor 100 % for a fee.`)}</p>`}
        <ul class="plain">${rows}</ul>
        <p class="empty">${tr('Je abgespielter der Platz, desto unebener springt der Ball. Nach viel Regen und bei schlechtem Zustand sperrt die Gemeinde den Platz: das Spiel wird am Mittwoch nachgeholt (weniger Zuschauer, mehr Absagen). Die Sommerpause erholt den Rasen.', 'The more worn the pitch, the more the ball bounces unevenly. After heavy rain and in poor condition the council closes the ground: the match is replayed on Wednesday (fewer spectators, more drop-outs). The summer break restores the grass.')}${i.sperren ? ` ${tr(`Bisher ${i.sperren}× gesperrt.`, `Closed ${i.sperren}× so far.`)}` : ''}</p>`;
    }
    return `<div class="facilities platz"><h4>${tr('Platz und Pacht', 'Pitch and lease')}</h4>${care}<h4 class="sub">${tr('Pachtvertrag', 'Lease')}</h4>${contract}</div>`;
  },

  // Vereinsheim, Sportplatz, Tribünen, Gastro ausbauen: Handwerker oder Arbeitseinsatz, mit Bauschlange.
  facilityBlock() {
    const c = this.career;
    const f = facilities(c);
    const why = {
      needs: (def) => `<small>${tr('braucht erst', 'needs first')}: ${def.needs.map((n) => FACILITIES[n].name).join(', ')}</small>`,
      ground: () => `<small>${tr('braucht einen richtigen Sportplatz', 'needs a proper sports ground')}</small>`,
      level: (def) => `<small>${tr(`erst ab der ${leagueTitle(c, def.minLevel)}`, `only from the ${leagueTitle(c, def.minLevel)} up`)}</small>`,
      land: () => `<small>${tr(`Pachtvertrag zu kurz (mind. ${MIN_TERM} Saisons) – verlängern oder kaufen`, `lease too short (${MIN_TERM}+ seasons) – renew or buy`)}</small>`,
    };
    const queueIdx = (id) => f.queue.findIndex((q) => q.id === id);
    const row = ([id, def]) => {
      const built = f.built[id];
      const building = f.building?.id === id;
      const block = buildBlock(c, id);
      const qb = f.building ? buildBlock(c, id, { queued: true }) : null;
      const cost = buildCost(c, id, 'handwerker');
      const costE = buildCost(c, id, 'einsatz');
      const state = built
        ? `<span class="ok">${tr('steht seit Saison', 'built in season')} ${built}</span>`
        : building
          ? `<span class="warn">${tr('im Bau, noch', 'under construction,')} ${f.building.weeks} ${plural(f.building.weeks, 'Woche', 'Wochen', 'week', 'weeks')}${tr('', ' to go')}</span>`
          : queueIdx(id) >= 0
            ? `<span class="warn">${tr('vorgemerkt', 'queued')} (${queueIdx(id) + 1})</span>${button(tr('Streichen', 'Remove'), { action: 'dequeue', value: id })}`
            : block === null
              ? `${button(`${tr('Handwerker', 'Builders')} (${euro(cost)})`, { action: 'build', value: `${id}:handwerker`, disabled: c.cash < cost })}${button(`${tr('Arbeitseinsatz', 'Work party')} (${euro(costE)}, ${buildWeeks(c, id, 'einsatz')} ${tr('Wo.', 'wks')})`, { action: 'build', value: `${id}:einsatz`, disabled: c.cash < costE })}`
              : block === 'building' && qb === null && f.queue.length < QUEUE_MAX
                ? `${button(`${tr('Vormerken', 'Queue')} (${euro(cost)})`, { action: 'enqueue', value: `${id}:handwerker` })}`
                : block === 'building'
                  ? `<small>${tr('erst die laufende Baustelle fertig machen', 'finish the current building work first')}</small>`
                  : (why[block] ?? (() => ''))(def);
      const extra = def.land && !built ? ` · ${tr('Genehmigung der Gemeinde', 'council permit')}` : '';
      return `<li class="facility${built ? ' built' : ''}"><div><b>${def.name}</b> <small>${buildWeeks(c, id, 'handwerker')} ${plural(buildWeeks(c, id, 'handwerker'), 'Woche', 'Wochen', 'week', 'weeks')}${def.upkeep ? ` · ${euro(def.upkeep)}${tr('/Woche Nebenkosten', '/week running costs')}` : ''}${extra}</small><br><small>${def.desc}</small></div><div class="state">${state}</div></li>`;
    };
    const groups = FACILITY_GROUPS.map((g) => {
      const rows = Object.entries(FACILITIES).filter(([, d]) => (d.group ?? 'heim') === g.id).map(row).join('');
      return rows ? `<h4 class="sub">${g.name}${g.id === 'tribuene' ? ` <small>${tr('Fassungsvermögen', 'capacity')}: ${capacity(c)}</small>` : ''}</h4><ul class="plain">${rows}</ul>` : '';
    }).join('');
    return `<div class="facilities"><h4>${tr('Vereinsheim und Anlage ausbauen', 'Upgrade clubhouse and grounds')} <small>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}</small></h4>
      ${f.note ? `<p class="reply ok">${f.note}</p>` : ''}${groups}</div>`;
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
    const awards = mu.awards.length ? `<ul class="plain">${mu.awards.map((a) => `<li>★ ${a.name} – ${a.kind === 'season' ? tr('Spieler der Saison', 'Player of the Season') : tr('Spieler des Monats', 'Player of the Month')} (S${a.season})</li>`).join('')}</ul>` : empty(tr('Noch keine Auszeichnung vom Kreisblatt.', 'No District Gazette award yet.'));
    const records = mu.records.length ? `<ul class="plain">${mu.records.map((r) => `<li><b>${r.label}:</b> ${r.text}</li>`).join('')}</ul>` : empty(tr('Rekorde entstehen mit der Zeit.', 'Records come with time.'));
    const legends = mu.legends.length ? `<ol class="plain">${mu.legends.map((l) => `<li><span>${l.name}${l.active ? '' : ` <small>(${tr('ehemalig', 'former')})</small>`}</span><b>${l.goals} ${plural(l.goals, 'Tor', 'Tore', 'goal', 'goals')} · ${l.apps} ${plural(l.apps, 'Spiel', 'Spiele', 'app', 'apps')}</b></li>`).join('')}</ol>` : empty(tr('Noch keine Legenden.', 'No legends yet.'));
    const kits = `<div class="archive">${mu.kits.map((k) => `<figure><span class="kit-mini" style="background:url(${kitPreviewURL(k.kit)}) center/100% 100%"></span><figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>`;
    const crests = mu.crests.length ? `<div class="archive">${mu.crests.map((k) => `<figure>${crestSVG(k.crest, { size: 40, short: club.short, year: crestExtras(c).year })}<figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>` : '';
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
    const termWord = (t) => (t === 1 ? tr('1 Saison', '1 season') : tr(`${t} Saisons`, `${t} seasons`));
    const willing = (p) => (p >= 0.7 ? tr('gern', 'gladly') : p >= 0.45 ? tr('vielleicht', 'maybe') : tr('eher nicht', 'unlikely'));
    const offers = c.round === 0 && c.offers.length
      ? c.offers
          .map((o, i) => {
            const wish = newWish(sponsorDef(o.id) ?? o, c.season);
            const terms = TERMS.map((t) => {
              const refused = (o.refused ?? []).includes(t);
              const hint = t > 1 ? ` <small>(${willing(termChance(o, t))})</small>` : '';
              return `<button class="${t === 1 ? 'primary' : ''}" data-action="sponsor" data-value="${i}:${t}" ${refused ? 'disabled' : ''}>${tr('Unterschreiben', 'Sign')} · ${termWord(t)} · ${euro(termWeekly(o, t))}${hint}</button>`;
            }).join('');
            return `<article class="rumor" style="--c:${o.renew ? '#5cc46a' : '#c9a227'}"><div class="who"><b>${o.name}</b> <em>${SLOTS[o.slot]}${o.renew ? tr(' · Verlängerung', ' · renewal') : ''}</em>
              <small>${BRANCHEN[o.branche ?? sponsorDef(o.id)?.branche] ?? ''} · ${lineOf(o)} · ${bossOf(o)}, ${SPONSOR_TRAITS[o.trait]?.name ?? SPONSOR_TRAITS.treu.name}</small></div>
              <p>${euro(o.weekly)} ${tr('pro Spieltag bei 1 Saison; länger gebunden gibt es weniger pro Woche, dafür ist der Vertrag sicher.', 'per matchday on 1 season; a longer commitment pays less per week but is secure.')}</p>
              <p>${tr('Bonus', 'bonus')} ${euro(o.bonus)} ${tr('bei', 'for')}: ${goalText(o.goal)}</p>
              <p class="wish">${tr('Wunsch', 'Wish')}: ${wishLabel(wish)}</p>
              <div class="actions">${terms}${o.negotiated ? '' : `<button data-action="negotiate" data-value="${i}">${tr('Nachverhandeln', 'Negotiate')}</button>`}<button data-action="sponsorDecline" data-value="${i}">${tr('Ablehnen', 'Decline')}</button></div></article>`;
          })
          .join('')
      : '';
    const active = c.sponsors.length
      ? c.sponsors
          .map((s, i) => {
            const g = goalStatus(c, s.goal);
            const left = s.left ?? 1;
            const term = s.term ?? 1;
            const wish = s.wish;
            const w = WISHES[wish?.kind];
            const cost = wishCost(wish, s.weekly);
            const wishState = !wish
              ? ''
              : wish.done
                ? `<span class="ok">${tr('erfüllt', 'done')}</span>`
                : w.kind === 'spiel'
                  ? `<small>${wish.count} / ${wish.n}</small>`
                  : `<button data-action="sponsorWish" data-value="${i}">${w.act}${cost ? ` (${euro(cost)})` : ` (${tr('gratis', 'free')})`}</button>`;
            const penalty = cancelCost(c, s);
            const ask = this.cancelAsk === i;
            const tags = [BRANCHEN[s.branche ?? sponsorDef(s.id)?.branche] ?? '', s.exclusive ? tr('Konkurrenzschutz', 'exclusivity') : '', arenaOf(c) && c.arena.id === s.id ? c.arena.name : ''].filter(Boolean).join(' · ');
            return `<li class="sponsor"><b>${s.name}</b> <small>${SLOTS[s.slot]}${s.seasons ? tr(` · ${s.seasons + 1}. Saison zusammen`, ` · season ${s.seasons + 1} together`) : ''}${tags ? ` · ${tags}` : ''}</small><br>
              <small>${tr('Vertrag', 'Contract')}: ${term > 1 ? tr(`Saison ${term - left + 1} von ${term}`, `season ${term - left + 1} of ${term}`) : tr('läuft bis Saisonende', 'runs to the end of the season')}</small><br>
              ${euro(s.weekly)}${tr('/Spieltag', '/matchday')}${s.pause > 0 ? tr(` <em>(setzt ${s.pause} Wochen aus)</em>`, ` <em>(pausing for ${s.pause} weeks)</em>`) : s.owed ? tr(` <em>(schuldet ${euro(s.owed)})</em>`, ` <em>(owes ${euro(s.owed)})</em>`) : ''}
              <div class="goal"><small>${tr('Saisonziel', 'Season goal')}: ${goalText(s.goal)} · ${tr('Bonus', 'bonus')} ${euro(s.bonus)} · ${g.text}${g.ok ? ' ✓' : ''}</small>
                <span class="meter"><i class="${g.ok ? 'ok' : ''}" style="width:${g.pct}%"></i></span></div>
              ${wish ? `<div class="wish"><small>${tr('Wunsch', 'Wish')}: ${wishLabel(wish)}</small> ${wishState}</div>` : ''}
              <span class="rel"><i style="width:${s.rel ?? 50}%"></i></span><small>${bossOf(s)} ${tr('ist', 'is')} ${relLabel(s.rel ?? 50)} (${s.rel ?? 50}/100)</small>
              <div class="actions"><button data-action="sponsorCancel" data-value="${i}">${ask ? tr(`Wirklich kündigen? Strafe ${euro(penalty)}`, `Really terminate? Penalty ${euro(penalty)}`) : tr('Kündigen', 'Terminate')}</button></div></li>`;
          })
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
        ${arenaOf(c) ? `<small>${tr('Sportplatz', 'Ground')}: ${arenaOf(c)}</small>` : ''}
        <small>${tr('Ziel: Saisonabschlussfahrt (ab', 'Goal: end-of-season trip (from')} ${euro(DESTINATIONS.kegeltour.cost)})${c.spirit ? tr(' · Stimmung nach der letzten Fahrt: bestens (weniger Absagen)', ' · spirits after the last trip: excellent (fewer drop-outs)') : ''}</small></div>
      <div class="cash-grid">
        <section><h4>${tr('Sponsoren', 'Sponsors')}</h4><ul class="plain">${active}</ul>
          ${c.sponsorNote && c.round === 0 ? `<p class="reply ok">${c.sponsorNote}</p>` : ''}${offers ? `<h4>${tr('Angebote für diese Saison', 'Offers for this season')}</h4><div class="rumors">${offers}</div>` : c.round === 0 ? '' : `<p class="empty">${tr('Neue Angebote gibt es vor der nächsten Saison.', 'New offers come before next season.')}</p>`}</section>
        <section><h4>${tr('Strafenkatalog', 'Fines list')}</h4><ul class="plain fines">${FINES.map((f) => `<li>${f.strict && spielberichtStreng(c) ? f.strict : f.label} <b>${euro(f.amount)}</b></li>`).join('')}</ul>
          <h4>${tr('Sünderkartei', 'Hall of shame')}</h4><ol class="plain">${sinners || `<li><em>${tr('alle brav', 'all well behaved')}</em></li>`}</ol></section>
        <section><h4>${tr('Kassenbuch', 'Ledger')}</h4><ul class="plain ledger">${ledger || `<li><em>${tr('noch keine Buchungen', 'no entries yet')}</em></li>`}</ul></section>
      </div>`;
  },
};
