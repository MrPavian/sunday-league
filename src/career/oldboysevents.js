// Ereignisse rund um die Alten Herren (ROADMAP 11.9): Bierkasse, Grillen, Zipperlein, Retro-Trikots, der Neue aus der Ersten.
// Eingetragen in events.js (eventPacks). Gezogen werden sie nur, wenn es die Alten Herren gibt.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { AGE_MIN, moveFromFirst, oh } from './oldboys.js';

const name = (c, idx) => playerOf(c, idx).name.split(' ')[0];
const member = (c, rng) => rng.pick(oh(c).squad);
const some = (c) => (oh(c)?.squad.length ?? 0) >= 4;

export const OLDBOYS_EVENTS = {
  ah_bierkasse: {
    weight: 1.2,
    needs: (c, rng) => (some(c) && c.cash > 15 ? { who: member(c, rng) } : null),
    text: (c, ctx) => tr(`Die Bierkasse der Alten Herren ist leer. ${name(c, ctx.who)} hat nachgezählt: Es fehlen genau drei Kästen und ein Fass Vertrauen.`, `The old boys' beer kitty is empty. ${name(c, ctx.who)} has recounted: exactly three crates and a keg of trust are missing.`),
    options: [
      { label: tr('Aus der Vereinskasse auffüllen (15 €)', 'Top it up from the club kitty (€15)'), effect: outcome([
        { w: 3, run: (c) => (book(c, tr('Bierkasse Alte Herren aufgefüllt', 'Old boys\' beer kitty topped up'), -15), adjustMood(c, 0.04), tr('Die Alten Herren sind gerührt. Einer hält eine Rede, die länger dauert als das Spiel.', 'The old boys are touched. One gives a speech longer than the game.')) },
        { w: 1, run: (c) => (book(c, tr('Bierkasse Alte Herren aufgefüllt', 'Old boys\' beer kitty topped up'), -15), tr('Kaum aufgefüllt, ist sie wieder leer. Niemand will es gewesen sein.', 'Barely topped up, it is empty again. Nobody wants to have been it.')) },
      ]) },
      { label: tr('Hut rumgehen lassen', 'Pass the hat round'), effect: outcome([
        { w: 3, run: (c) => (book(c, tr('Hutsammlung Alte Herren', 'Old boys\' hat collection'), 12), tr('Zwölf Euro, ein Knopf und eine Bierdeckel-Telefonnummer. Die Kasse lebt.', 'Twelve euros, a button and a beer mat phone number. The kitty lives.')) },
        { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Der Hut kommt leer zurück. Und mit einem Loch.', 'The hat comes back empty. And with a hole in it.')) },
      ]) },
    ],
  },

  ah_grillen: {
    weight: 1.2,
    needs: (c, rng) => (some(c) ? { who: member(c, rng) } : null),
    text: (c, ctx) => tr(`Nach dem Spiel der Alten Herren: Grillen. ${name(c, ctx.who)} hat die Würstchen vergessen, dafür vier Kilo Nackensteak mitgebracht.`, `After the old boys' game: barbecue. ${name(c, ctx.who)} forgot the sausages but brought four kilos of pork neck steak.`),
    options: [
      { label: tr('Alles auf den Rost', 'Everything on the grill'), effect: outcome([
        { w: 3, run: (c) => (adjustMood(c, 0.06), tr('Ein Fest. Die Nachbarn kommen auf „nur ein Bier“ vorbei und gehen um zwei.', 'A feast. The neighbours drop in for "just one beer" and leave at two.')) },
        { w: 1, run: (c) => (book(c, tr('Feuerwehreinsatz Grillplatz', 'Fire brigade at the barbecue spot'), -10), tr('Der Rost brennt, die Feuerwehr kommt, isst aber mit. 10 € Spende.', 'The grill catches fire, the fire brigade comes and eats too. €10 donation.')) },
      ]) },
      { label: tr('Doch lieber Pizza bestellen (20 €)', 'Order pizza instead (€20)'), effect: (c) => (book(c, tr('Pizza für die Alten Herren', 'Pizza for the old boys'), -20), adjustMood(c, 0.02), tr('Vernünftig. Und teuer. Die Alten Herren nörgeln über den Teig.', 'Sensible. And expensive. The old boys grumble about the dough.')) },
    ],
  },

  ah_zipperlein: {
    weight: 1,
    needs: (c, rng) => (some(c) ? { who: member(c, rng) } : null),
    text: (c, ctx) => tr(`${name(c, ctx.who)} (${playerOf(c, ctx.who).age}) will am Freitag unbedingt auf Linksaußen spielen. Der Physio schaut weg, die Knie knirschen hörbar.`, `${name(c, ctx.who)} (${playerOf(c, ctx.who).age}) insists on playing left wing on Friday. The physio looks away, the knees creak audibly.`),
    options: [
      { label: tr('Soll er mal', 'Let him'), effect: outcome([
        { w: 2, run: (c, ctx) => (adjustMood(c, 0.03), tr(`${name(c, ctx.who)} läuft zwei Sprints, trifft aus dem Nichts und legt sich dann auf den Rasen. Held.`, `${name(c, ctx.who)} runs two sprints, scores out of nowhere and lies down on the grass. Hero.`)) },
        { w: 1, run: (c, ctx) => ((oh(c).hurt[ctx.who] = 2), tr(`Nach zwölf Minuten: Wade. ${name(c, ctx.who)} fällt zwei Spiele aus und erzählt es jedem.`, `After twelve minutes: calf. ${name(c, ctx.who)} is out for two games and tells everyone.`)) },
      ]) },
      { label: tr('Auf die Bank mit ihm', 'Bench him'), effect: (c, ctx) => (adjustMood(c, -0.01), tr(`${name(c, ctx.who)} sitzt beleidigt auf der Bank. Beim Grillen ist er trotzdem der Erste.`, `${name(c, ctx.who)} sulks on the bench. At the barbecue he is first in line anyway.`)) },
    ],
  },

  ah_retro: {
    weight: 0.9,
    needs: (c) => (some(c) ? {} : null),
    text: () => tr('Auf dem Dachboden liegen noch die Trikots von 1994: Rot-Weiß, Polyester, ein Sponsor, den es nicht mehr gibt. Die Alten Herren wollen sie anziehen.', 'In the attic lie the 1994 shirts: red and white, polyester, a sponsor that no longer exists. The old boys want to wear them.'),
    options: [
      { label: tr('Retro-Tag! Alle in Polyester', 'Retro day! Everyone in polyester'), effect: outcome([
        { w: 3, run: (c) => (adjustMood(c, 0.07), tr('Die Trikots passen ungefähr. An den Bäuchen eher knapp. Das Kreisblatt macht ein Foto.', 'The shirts roughly fit. Tight around the bellies. The District Gazette takes a photo.')) },
        { w: 1, run: (c) => (book(c, tr('Trikots Alte Herren gereinigt', 'Old boys\' shirts cleaned'), -12), tr('Die Reinigung verlangt 12 € Mottenzuschlag.', 'The cleaner charges €12 for moths.')) },
      ]) },
      { label: tr('Lieber nicht', 'Better not'), effect: () => tr('Die Trikots bleiben auf dem Dachboden. Die Motten sind enttäuscht.', 'The shirts stay in the attic. The moths are disappointed.') },
    ],
  },

  ah_aufnahme: {
    weight: 0.9,
    needs: (c, rng) => {
      const o = oh(c);
      const old = o && humanClub(c).squad.filter((i) => i !== c.coach?.idx && playerOf(c, i).age >= AGE_MIN && humanClub(c).squad.length > 9);
      return old?.length ? { who: rng.pick(old) } : null;
    },
    text: (c, ctx) => tr(`${name(c, ctx.who)} (${playerOf(c, ctx.who).age}) aus der Ersten fragt, ob er nicht lieber nur noch freitags kicken kann: „Sonntag um zehn ist keine Uhrzeit für Menschen.“`, `${name(c, ctx.who)} (${playerOf(c, ctx.who).age}) from the first team asks whether he could just play on Fridays: "Ten on a Sunday morning is no time for human beings."`),
    options: [
      { label: tr('Zu den Alten Herren wechseln lassen', 'Let him move to the old boys'), effect: (c, ctx) => (moveFromFirst(c, ctx.who) ? tr(`${name(c, ctx.who)} wechselt. Beim ersten Training – also Grillen – wird er gefeiert wie ein Neuzugang.`, `${name(c, ctx.who)} moves. At his first "training" – the barbecue – he is celebrated like a new signing.`) : tr('Der Kader ist zu dünn oder bei den Alten Herren ist kein Platz mehr. Er bleibt vorerst.', 'The squad is too thin or the old boys are full. He stays for now.')) },
      { label: tr('Du spielst Sonntag, Punkt', 'You play Sunday, full stop'), effect: (c) => (adjustMood(c, -0.02), tr('Er murrt, bleibt aber. Sonntags sieht man ihm die Reue an.', 'He grumbles but stays. On Sundays you can see the regret.')) },
    ],
  },
};
