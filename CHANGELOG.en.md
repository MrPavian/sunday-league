# Changelog

[Deutsche Version → CHANGELOG.md](CHANGELOG.md) · [Back to the README](README.en.md)

What has changed in Sunday League – newest delivery first, in plain player language.
The most recent weeks are covered in detail, the early days of the game (25 September to 6 October) briefly.
In the game, the same highlights are under **Settings → What's new**.

## 2026-11-13-1 – Press conference

### New
- **Press conference from the fourth tier up** (four new events):
  - Before a top-of-the-table game (you and the opponents in the top four, from matchday 4 at the earliest, once per half-season): bold statement, understatement or no comment.
  - A week after a bold statement the press follows up. After a win, mood and board backing rise; after a draw or defeat it costs backing or mood, depending on whether you stand by it.
  - After three wins in a row (once per season): the question about the season's target.
  - With an unhappy player (once per season): the question about his role.
- All effects are game values of the same size as the other events (mood ±0.02 to 0.05, backing ±1 to 2).

## 2026-11-12-3 – Throw-ins and fewer penalties after corners

### Changed
- **Throw-ins:** two team-mates offer themselves, one short infield and one down the line. The thrower waits up to 2.6 seconds until one of them is free within range.
  - Measured (40 matches per pitch): a team-mate is first on the ball in 81 / 85 / 92% of throw-ins on the 7-a-side / 9-a-side / full pitch, previously 75 / 50 / 38%.
  - The thrower had no free team-mate in range in 55 / 77 / 88% of cases before, now in 2 / 4 / 1%.
- **Penalties:** aerial duels in the box were whistled far too often, above all after corners.
  - Penalties per match: 0.54 / 0.70 / 0.34 → 0.36 / 0.28 / 0.23 (100 matches per pitch). For comparison: Bundesliga 0.30 in 2018/19 and 0.19 in 2024/25.
  - Goals after corners: 10.4 / 12.0 / 10.3% → 8.5 / 6.6 / 8.3%.
  - Consequence: about 0.2 fewer goals per match (300 matches: full pitch 1.74 → 1.57, 9-a-side 2.30 → 2.07).

## 2026-11-12-2 – Difficulty and an easier start

### New
- **Difficulty:** relaxed, normal or hard. Chosen when creating your manager, changeable at any time under Club → Me. Old saves run on "normal".
  - Board: the league's pressure counts with a factor of 0.7 / 1 / 1.3.
  - Sponsor money per matchday: factor 1.15 / 1 / 0.85.
  - Family: see below.
  - All figures are game values.

### Changed
- **Family in professional football:** measured, the family's patience never dropped below 65 and a relationship crisis never occurred. Now on "normal": from the fourth tier everyday life costs one point of patience every second week, and the crisis comes below 45 instead of below 35. On "hard": one point a week, crisis below 60. On "relaxed" it stays as before.
- **Getting started:**
  - Kitty: the supplier offers are folded away (the page was more than five screens long in the first week).
  - Private life: only the next step per area is offered, one up and one down.
  - The founding meeting's heading was cut off in portrait.

### Fixed
- **Stadium announcer:** an announcement could be lost on a slow frame rate because a more important banner was showing. It now waits and follows.

## 2026-11-12-1 – Backup of your saves

### New
- **Automatic backup:** every save slot gets a backup from the end of last season. Under "Saves" it is shown on the slot's card; "Go back to it" restores it after asking.
  - One backup per slot, because browser storage is tight. If it is full, the save itself takes priority and the backup is dropped.
  - If a different save ends up in the slot (new career, import), the old backup is discarded.

### Changed
- **Manager type "saver":** only from €20,000 in your private account (game value). Measured before, almost everyone counted as a saver who could not yet afford anything in the lower leagues.

### Internal
- Long-career measurement (`scripts/balance-audit.mjs`) and event count across all leagues (`scripts/events-count.mjs`); results in `ROADMAP.md` 11.18.

## 2026-11-11-3 – Stadium announcer: half-time and full time

### Fixed
- **Stadium announcer:** the announcements of the half-time and final score were never visible. The half-time one was lost under the big half-time banner, the final score was covered by the match report straight away. The half-time announcement now follows the banner, and in matches with an announcer the match report appears a good three seconds later.

### Internal
- Permanent browser tests for the stadium announcer and the Super Cup.
- A fast check for work in progress (`npm run check:fast`).
- Roadmap split: `ROADMAP.md` now holds only the open items, everything done is in `docs/ROADMAP-ARCHIV.md`.

## 2026-11-11-2 – Salary talks and moving house

### New
- **Salary talks:** where the club pays (from the County League up), the board asks for a contract talk once a season.
  - Demand considerably more (+20%), ask for a moderate rise (+10%), leave things as they are, or take a cut for the club's sake (−10%).
  - Your chances rise with the board's trust (10 to 90%). A rebuff costs trust, a cut earns trust and mood.
  - The result is a factor on the usual salary of the league, between 70 and 150%. It is shown under Club → Me → "Private life".
  - A club that courts you in the summer pays 10% more. After a sacking you start at the usual rate.
- **Moving house on a change of club:** from the fourth tier the new club is always too far away, from the sixth tier when you change leagues. Below that you stay in the area.
  - At first you commute: a second flat for €6,000 per season, and it wears on your energy and the family's patience.
  - Moving costs €3,000 plus 5% of the value of your own home. Your partner and every school-age child do not take the move without grumbling.
  - The question arrives as an event; you can also move later under "Private life".
- All figures are game values.

## 2026-11-11-1 – The manager's private life

### New
- **Money of your own:** the manager has a private account, separate from the club's. Every matchday an equal share of the season's income is added.
  - Up to the fifth tier, €3,000 a season is left over from your own job (derived).
  - From the club: County League €3,000 (the tax-free coaching allowance), the three leagues above €4,800 / €7,200 / €12,000 (game values).
  - Professional leagues: fourth tier €35,000 (weak source), third tier €150,000 and second tier €400,000 (game values), top flight €1.4m (from press estimates for 2025/26).
  - The club's cash is not charged extra: the salary is part of the running costs already in the game.
- **Spending** under Club → Me → "Private life":
  - Home, car and clothes in five stages each, with upkeep per season. Changing stage returns part of the old price.
  - Luxuries: a watch, a motorboat, a holiday home, plus one long-haul family trip per season.
  - Donations to the club.
  - All prices are game values.
- **Effects:**
  - A home relaxes the family, a car saves energy.
  - Your appearance is compared with what is usual in the league. If it fits in professional football, it strengthens your standing and reputation. Too flashy at an amateur club lowers the dressing-room mood. Too plain in professional football costs trust with the board.
  - **Manager type:** follows from your behaviour – down to earth, saver, bon vivant, businessman, family person or benefactor – and takes effect once a season.
- **Family events:** meeting someone (a woman or a man), moving in together, getting married (small or big), children, first day at school, the teenage years, a relationship crisis, separation and divorce, caring for your mother, bereavement.
  - Decisions affect the family's patience, your energy, the account and the mood.
  - Separation and bereavement can be switched off on the "Private life" page.
  - Female or male partner can be changed there at any time.
- Applies to managers you created yourself. Very old saves without a created manager stay as they are.

### Fixed
- **Neutral venue:** European finals and the Super Cup were accounted for like a home game (bar, gate, referee, pitch rent). Not any more.
- **Music:** after a spell in the background, the clubhouse theme played all the missed bars at once.

## 2026-11-09-8 – Stadium announcer, music and more

### New
- **Stadium announcer:** from 60 spectators there is a PA system, though not at the car park, the park or the backyard (game value). Every announcement starts with a chime, then the text appears. Announced are:
  - A welcome before kick-off
  - Home goals: the announcer calls the first name, the fans answer with the surname, then the new score
  - Away goals
  - Substitutions
  - Attendance after a little over two thirds of the match
  - Half-time and final score
  - Settings → Sound: "Text", "With voice" (the device's speech output where available) or "Off".
- **Music:** composed for the game and generated entirely in the game.
  - A calm theme in the clubhouse and the menu.
  - A short fanfare as the teams walk out, wherever there is an announcer.
  - Quiet underneath everything else, can be switched off under Settings → Sound.

### Improved
- **Rain:** the white glints on the wet ground stood still and looked like frozen drops. Now they flash up briefly while it rains, like drops hitting the ground. Once the rain stops, a calmer, fainter sheen remains.
- **Substitutions by drag and drop:** in the substitution panel, drag a bench player onto the one who should come off (or the other way round). The target lights up green, and letting go plans the change.
  - On a phone: hold the card briefly, then drag. Otherwise the list scrolls as usual, and it scrolls along at the edge while you drag.
  - Tapping and the keyboard still work.
- **Line-ups at tournaments:** before indoor and other tournament games you could not really pick your line-up. Absences were drawn anew for every game and upset your own line-up.
  - Now it is fixed at the start of the tournament who is missing (a cold, a holiday), for the whole tournament. Whoever gets injured during the tournament is out from then on.
  - Your line-up takes the floor exactly as you set it.
  - The tournament card shows who is unavailable and has a "Change the line-up" button. From the line-up, "Back to the tournament" takes you straight back to the game.

## 2026-11-09-7 – Price protest and the match of the European winners

### New
- **Fans' price protest:** from a ticket price of 150% of the league price, any home game may see a protest (20% chance at 150%, up to 50% at 200%, then at least three quiet home games).
  - A banner reading "Football must be affordable", a walkout at half-time, 10% fewer paying spectators, and the club mood drops.
  - Season-ticket holders still turn up.
  - Model: the 77th-minute walkout in Liverpool against £77 tickets (February 2016) and the German "Kein Zwanni" campaign. All values are game values.
  - The ticket prices panel in the clubhouse now carries a warning.
- **Match of the European winners at the start of the season:** whoever wins the top or second European cup meets the winners of the other competition on a Wednesday night in the first week of the new season.
  - One match at a neutral stadium, playable in 3D. If level, it goes straight to penalties, as in reality in 2025.
  - Prize money per UEFA circular 32/2025: €4m for each club, €1m more for the winners.
  - The trophy goes into the cabinet. If you miss the match, it is played without your input.

## 2026-11-09-6 – Club grounds in 3D and more

### New
- **Club grounds in 3D:** the facilities you have built stand on your own grass pitch next to the field, the highest stage per area:
  - At the left end: training pitch (lines, two goals), fitness corner with hurdles, training hall, training centre.
  - Behind the clubhouse:
    - team building (weights room, recovery, video room), one storey more per stage
    - medical block with a red cross
    - club office with a sign
    - youth house, boarding house and academy
  - On the right: car park with cars, club shop in club colours, forecourt with flags and shuttle bus.
  - Trees make way where a building stands.
  - Fully built that is 12 draw calls more (122 instead of 110), measured in the graphics budget.
- **Third-place play-off** at the World Cup, South American and Africa Championship as in reality; the European Championship has none. Your players get their own market value boost for it (third place a little more than fourth, game value).
- **Opponent check before cup games:** the same report as before a league game, on the cup card.
- **Switch tactics when a man down or up:** new conditions "when a man down" and "when a man up" after sendings-off, plus "kick-off" as start time.

### Dropped
- **Fog as AI visibility:** fog that thick would mean the game is off anyway (user decision).

## 2026-11-09-5 – National team manager polished

### Fixed
- **Duplicate names:** invented names appeared twice in the national team squad list (e.g. the same striker twice). Every name in the squad is now unique.

### Checked
- New browser check "national team manager": accept the offer, change the squad (list stays open), international break with "you manage …", touchline game in manager mode with half-time and up to five substitutions, record afterwards.

## 2026-11-09-4 – National team manager on the side

### New
- **Offers by reputation:** At the start of a season a federation may come asking once your club plays in a professional league. Reputation comes from your league, titles, European cups and years in the job. Small countries ask early, the big ones only with a very good reputation; all 126 countries in the game are possible. You can accept, decline or resign at any time.
- **Only alongside the club:** The club stays yours (user decision). The country plays in the international breaks and at tournaments.
- **Squad from all of the country's players:** your own club players of that nationality (★) and invented candidates who come through each season. You pick 26; without a choice the assistant picks the best. Your own players in the squad count as called up.
- **On the touchline:** qualifiers, League of Nations and tournament games of your country appear as cards in the clubhouse. "To the touchline" starts the 3D game with tactics, shouts and substitutions as at your club, or you take the result only. Up to five substitutions are allowed, no rolling substitutes (IFAB Law 3).
- **Record:** wins, draws and defeats of your country are counted and add a little to your reputation.

### Game values
- Reputation, the thresholds per strength tier (tier 1 from 85, tier 5 from 30) and the chance of an offer (50% per season) are not sourced.
- The candidates are invented: 46 per country at the country's level, slightly weaker further down.
- No salary: there are no sourced figures for part-time national team managers.

## 2026-11-09-3 – Eliminations for the inter-confederation play-offs

### New
- **As in 2026 World Cup qualifying:** Until now each confederation simply sent its next best team. Now:
  - **Asia:** The best six qualify directly. The next six play a fourth round in two groups of three, each team playing the others once. The group winners qualify, the runners-up play a two-legged tie for the play-off place.
  - **Africa:** The nine group winners qualify, the four best runners-up play semi-finals and a final (one game each) for the play-off place.
  - **Oceania:** The best four play semi-finals and a final. The winner qualifies, the losing finalist goes into the play-offs.
  - **North and Central America:** qualifying in three groups as in reality; in 2026 the two best runners-up went into the play-offs.
  - **South America:** as before, the seventh-placed team.

### Game values
- In the game Asia has four groups instead of three. So the best six of the ranking qualify directly (all group winners, then the best runners-up). The fourth round is seeded by the ranking, in reality by pots.
- Without a host from North and Central America (2030 World Cup) the confederation has six fixed places. Then the next two of the ranking go into the play-offs.
- The eliminations are calculated in the quick model, without a card in the clubhouse, with a fixed result.

## 2026-11-09-2 – Qualifying over two seasons

### New
- **As in the real calendar of EURO 2028 qualifying:** matchdays 1–2 in March 2027, 3–4 in June 2027, 5–8 in September/October, 9–10 in November 2027, play-offs in March 2028. In the game, the groups of European qualifying (European Championship and World Cup) start in the March of the season before. June comes after the season and is calculated at the end of the season, the rest is played in the international breaks of the tournament season.
- **March only without quarter-finalists:** As in reality, only groups without quarter-finalists of the League of Nations play in March; those groups start in June (in reality groups of four, the others groups of five).
- **Your players:** a qualifier in the March of the season before appears as a card in the clubhouse, with the group table.

### Game values
- The game has groups of three and four instead of four and five. So it is not the group size that decides the start in March but whether a quarter-finalist is in the group.
- World Cup, Europe: the same procedure. The format from 2028 has not been published yet.
- The other confederations and old saves stay with one season.

## 2026-11-09-1 – Kit templates from the kit history

### New
- **17 new templates** based on the kit history you sent (39 shirts from 1988 to 2027). Close to the originals and freely colourable, without crests, sponsors or maker marks. Motifs that already existed (wings, jags, stripes and pinstripes, chest band, centre stripe, side panels, halftone, tonal checks, tonal pixels, fine hoops) are not duplicated.
  - **1 colour (tonal):** tonal squares, tonal shards.
  - **2 colours:** shoulder seams, shoulder triangles, raglan yoke, yoke and chest band, side bars, vest seam, yoke with lines.
  - **3 colours:** curved side panels (panel with edge), shoulder bars.
  - **Retro (with model shown in the editor):** brushed shoulders, chevron bars, fading hoops, dot fade, fan hem, shoulder band.
- **Symmetry as in the original:** where the original is not mirror-symmetrical, neither is the template: chevron bars (diagonal bars on the left, two vertical bars on the right as in 2014/15), brushed shoulders (denser on the left), tonal squares and shards scattered.
- **Reworked (templates from 8 November):** brush strokes and sawtooth with brush slanted again as on the sheet, block grid back to four columns in three colours as on the sheet, the all-over patterns zigzag, wave, wedges, broken lines and confetti no longer mirrored. Wings, star shoulders and the grids without a model (gradient, shadow fade, halftone, tonal pixels) stay mirror-symmetrical.

## 2026-11-08-9 – Release fees and new kit templates

### New
- **Kit templates from your sheets:** The 200 shirts on the two sheets produced 23 new templates, all freely colourable. Recolours and patterns that already existed (plain, hoops, halves, sash, checks, chest band, shoulder yoke) are not duplicated.
  - **1 colour (tonal):** tonal zigzag, tonal diamonds, tonal sawtooth, tonal star.
  - **2 colours:** side frame, fine hoops.
  - **3 colours:** block checks, three-colour hoops, three-colour quarters, double sash, double V.
  - **4 colours (new, with a fourth colour):** four-colour hoops, block grid, sawtooth with chevron.
  - **Retro:** sawtooth, two-sided sawtooth, sawtooth with yoke, sawtooth with brush, zigzag hoops, diamonds, harlequin, brush strokes, star.
- **Editor:** a new "4 colours" group and a fourth colour row whenever a template needs it. If the main and second colours are the same (both white at the start), the pattern tiles now show the pattern in contrast instead of a blank area.
- **More colours:** 29 instead of 14 – adding colours from your sheets (beige, pink, petrol, turquoise, lime, wine red, gold, silver, dark grey) and neon (yellow, green, orange, pink, cyan, violet).
- **Mirror-symmetrical:** patterns with a grid or random spread (gradient, halftone, confetti, broken lines, star shoulders, wings, zigzag, wave, wedges and the new ones) are now mirror-symmetrical to the centre. Halves, quarters, sashes, diagonals, tricolour, rainbow, block checks, lightning and squiggles stay deliberately uneven.
- **International breaks:** For every released player, the European governing body pays €3,659 per game (qualifiers and League of Nations, the fixed rate of the 2020–24 cycle). For World Cup qualifiers the world governing body additionally pays 2,362 per player and game (first time for 2026, stated in US dollars, used as euros in the game). The total appears in the accounts and in the international break news.
- **European Championship:** compensation per player and day by club category, as at EURO 2024 (announced unchanged for 2028): €10,187 in the top division, €3,395 from the third professional tier down.
- **World Cup:** stays at 5,000 per player and day (guide value for 2026, as euros).

### Game values
- The rate of the middle category has not been published; the second division gets the midpoint of €6,791.
- In European World Cup qualifiers both bodies pay, because both programmes cover these games.
- All of the country's games in the window that the player is released for count, including a possible play-off final.
- Outside Europe there is no published programme for continental championships, so no payment.

## 2026-11-08-8 – Leagues for the European national teams

### New
- **League of Nations:** In the seasons without European qualifying (first 2026/27, as in reality), the game's 37 European countries play in three leagues with promotion and relegation. The model is the 2026/27 Nations League: six matchdays in September/October and November, home and away.
- **League A:** 16 teams in four groups of four, as in reality. Group winners and runners-up play two-legged quarter-finals in March (the group winner at home in the second leg), and the four winners play the finals in the summer: semi-finals, third-place play-off and final.
- **Promotion and relegation:** League A's last-placed teams go down and League B's group winners go up; League A's third-placed teams play League B's runners-up in March. Between B and C, the group winners and the worst last-placed teams swap places.
- **Effect on qualifying:** As in reality, the best-ranked group winners who do not qualify through their group take the play-off places of the next World Cup or European Championship, followed by the best of the overall ranking. The third-placed teams are no longer part of them.
- **Your players:** are called up for the League of Nations as well; their games are in the clubhouse during the international break, with league and group. Winners and new leagues of your countries arrive as news at the start of the season.

### Game values
- The game has 37 instead of 54 European countries: League B has 12 teams in groups of three, League C the rest. That is why there is no play-off between B and C.
- The first edition sorts the leagues by strength.
- The finals are calculated at the end of the season. In the second leg, a level aggregate goes straight to penalties without extra time.
- The reform from 2028/29 (three leagues of 18 teams) has been decided but has no details yet; the game keeps the 2026/27 format.

## 2026-11-08-7 – Qualifying play-offs

### New
- **Real play-offs:** the qualifying play-off places no longer go to the next best in the ranking – they are played for, in the format of the real competitions.
- **World Cup, Europe (as in 2026):** the group winners go straight through, the other places are decided by four teams per path: a one-off semi-final and final, the better-seeded side at home in the semi-final, home advantage in the final drawn. The entrants are the group runners-up; the places that go through the Nations League in real life go to the best third-placed teams (there is no Nations League in the game).
- **European Championship (as in 2028):** the group winners and the eight best runners-up go straight through, then up to two reserved places for the best-placed hosts. With two or three places left, one path each with a semi-final and final; with four left, eight teams in four two-legged ties (penalties if level on aggregate).
- **Inter-confederation play-offs (World Cup, as in 2026):** six countries – one each from Asia, Africa, South America and Oceania, two from North and Central America – for two places. The two strongest are seeded into the finals, the other four play the semi-finals; all one-off games. As in real life, Asia and North/Central America have one fixed place fewer for this.
- **In the March international break:** the groups are finished before, the semi-finals appear as a card in the clubhouse after the draw, the final follows the semi-finals. In the stadium there is extra time and a penalty shoot-out.

## 2026-11-08-6 – International breaks

### New
- **Qualifying through the season:** qualifying for the World Cup, the European Championship and the other continental championships is no longer worked out in one go at the start of the tournament, but in three international breaks as in the world governing body's 2026–2030 calendar: autumn (September/October, up to four games), November and March (two each). In the game they sit between two matchdays – the league rests, no league game is lost. The Africa and Asia championships in winter only use the breaks before them.
- **Groups with a fixture list:** home and away, everyone plays once per matchday; pots and places as before.
- **Your players:** if someone is called up (pro leagues only), their game is a card in the clubhouse – watch it in the stadium, take the result only or skip the rest, with the group table. Cost: a little tiredness (per game as at a tournament, at most 15%) and a league game's injury risk per appearance. Benefit: a small market value boost at the end of the season (a quarter of the tournament values).
- **Hosts:** qualify automatically where known (2030 World Cup: all six, 2034 Saudi Arabia; 2028 European Championship with two places reserved for the hosts, as in real life).
- Old saves in mid-season play the current qualifying as before at the start of the tournament; the breaks start next season.

## 2026-11-08-5 – Clubhouse without the window

### Changed
- **No more window in the clubhouse:** the view of your own pitch only suited the kickabout ground – in front of a stadium it no longer worked. In its place there are three wall variants to choose from, switchable with ⇄ on the wall or in the notebook (Graphics → Clubhouse wall).
- **Trophy cabinet** (default): titles, cups, promotions and souvenir photos on two glass shelves, newest first. Leads to the museum. Always a tile in the classic view.
- **Team photo:** the squad in two rows in club colours, the keeper in theirs. A new one every season. Leads to the squad.
- **Big boards:** the tactics board shows the surnames of your line-up, the notice board the part of the table around your place, the calendar the next three dates with league, cup and European games (cup dates in red).
- On narrow phones in portrait the whole wall sits in one row, so the desk and kick-off come into view quickly.

## 2026-11-08-4 – European football

### New
- **European competitions:** places 1 and 2 in the 1. Liga play next season in the top one of three European competitions, place 3 in the second, place 4 in the third. The opponents are fictional clubs from 22 countries.
- **The real format:** a league phase with 36 clubs in one table, each playing eight opponents from four pots (one home and one away from each pot, never a club from the same country). Places 1–8 go straight into the round of 16, 9–24 into the knockout play-offs, from 25th it is over. Then two legs, extra time and penalties if level after both, and a one-off final at a neutral ground.
- **Tuesday and Thursday:** because the 1. Liga has only ten match weeks in the game, there are two European nights a week (9pm, floodlights), always before the league game on Sunday. The final is on the Thursday of the last week.
- **Real-size prize money** (2025/26 amounts): starting fee, win and draw bonuses in the league phase, ranking bonus and round bonuses all the way to the final. Everything is under Season → Cup.
- **Two new achievements:** European nights and European champions.

### Changed
- **No state cup for pro clubs:** as in real life, second- and top-flight clubs no longer play the state cup; they go straight into the National Cup.

## 2026-11-08-3 – U19s as their own team

### New
- **U19s with their own league:** From the Regionalliga your U19s play every week with a table (Squad → Teams). Without a youth academy in the state league – top at the halfway mark goes straight up to the main round of the U19 Youth League. With an academy always in the Youth League: first phase, then championship or main round, the best play the finals for the title. Talents with at least five appearances develop faster, the higher the round, the more.

## 2026-11-08-2 – Rules like real football

### Changed
- **Home advantage in the National Cup:** As in the real regulations, an amateur side always plays at home against pro clubs up to the semi-final. The final is played at a neutral stadium. As a second- or top-flight club you face amateurs in the first two rounds and play away at their ground.
- **League table when level on points:** After goal difference and goals scored, head-to-head, away goals in head-to-head and all away goals now decide. At the World Cup and European Championship head-to-head comes first in the groups.

## 2026-11-08-1 – Achievements

### New
- **Achievements in the club museum:** 19 small, tongue-in-cheek milestones – first win, clean sheet, hat-trick, thrashing, comeback from two down, goalkeeper scores, “King of air shots”, “Cinders in the knee ×3”, “Off a car ×5”, first own goal, first red card, champions, promotion, unbeaten season, wooden spoon, cup win, Regionalliga, 1. Liga and ten years of loyalty. Every new achievement makes the District Gazette once. Existing saves get their titles and promotions filled in quietly from the chronicle.

## 2026-11-07-9 – Season review as a page

### New
- **Share the special as a page:** At season’s end the Kreisblatt special now comes as its own page as well as an image – with crest, final table, every match and each player’s numbers (apps, goals, assists, average grade). Send it by messenger or email; it opens in any browser, even offline. Older specials in the archive can be shared too; they just lack the table, matches and squad.

## 2026-11-07-8 – More English names

### New
- **English careers with more names:** new careers in English draw from many more first names and surnames – Welsh, Scottish and northern English ones too, plus more names in every community. Existing saves keep their players.

## 2026-11-07-7 – Heavy pitches and real wind

### New
- **Heavy pitch:** when it rains between October and March, grass and cinder pitches turn soft. The ball sticks in the mud, running costs noticeably more energy and fewer goals are scored. The match card warns you beforehand. Artificial turf just gets wet.
- **Wind that matters:** in gales, high balls now drift clearly – keeping it on the ground pays off.

## 2026-11-07-6 – Opponent check

### New
- **Opponent check before the match:** the match card under “Today” now shows what you know about your next opponent: form over the last five games, league position, strength, style, strengths and weakness, and who is most dangerous.
- **The better you watch, the sharper it gets:** if you hardly know their players you only see a rough range. “Watch the opponent” (costs one action of the week) and a tip from the landlord make the report more precise – right down to system and weak spot.

## 2026-11-07-5 – Stadium growth you can see

### New
- **The stadium grows with you:** On your own full-size pitch you now see the stand upgrades in the match. Stadium upgrade: terraces behind both goals. Third-division stadium: a covered main stand behind the clubhouse with seats in club colours, plus an away block. Arena: roofs over the ends and a low tier on the camera side. Seating expansion: seats behind the goals too. Grand arena: a second tier and taller ends. With naming rights, the stadium name hangs under the roof.
- **Opening shot:** At home games in an upgraded stadium the camera briefly shows the stands before kick-off, then zooms onto the pitch.

### Fixed
- **Scaffold stand:** With "Seats", the scaffold stand should stand on the full-size pitch – in league matches it was not drawn until now.

## 2026-11-07-4 – Reserve team

### New
- **Reserve team:** from the Regionalliga, register reserves under Squad → Teams. They play in their own 16-team league with a table, two promoted and three relegated; matches run in the background, the result appears in the chat every Monday.
- **Match practice:** the reserves field whoever did not play for the first team at the weekend, plus U19 players aged 18+; the reserves' own amateurs fill the remaining places. Anyone with at least five reserve appearances develops like a squad player rather than someone who only sits on the bench. Reserve appearances count half towards complaints about playing time. U19 players with five appearances develop 15 % faster.
- **DFB rules:** new reserves start in the lowest division (Kreisklasse C). Two teams of one club never play in the same league – the reserves at most one league below the first team, a third-division club's reserves never in the Regionalliga. If the first team is relegated, the reserves are moved down where necessary.
- **Costs:** referees, travel and fees, €80 to €200 a week depending on the reserves' league.

## 2026-11-07-3 – Coaching staff from the Regionalliga

### New
- **Coaching staff:** from the Regionalliga, hire a goalkeeper coach, a fitness coach and a physiotherapist under Squad → Training.
- **Applicants and wages:** every season two people apply for each job, a cheaper one and a more experienced one. In the Regionalliga they work as mini-jobbers (at most €603 a month, the 2026 limit). From the 3. Liga they are full-time employees; wages follow the usual pay for fitness coaches and physiotherapists and rise with league and experience. Wages come out of the kitty every week; if it is empty, the person leaves. After relegation below the Regionalliga, the staff look for a new club.
- **Effect:** with a goalkeeper coach, goalkeepers develop up to 20 % faster. A fitness coach cuts injuries by up to 10 % and gets players fit sooner. With a physiotherapist, injured players return up to 15 % sooner. The more experienced, the stronger the effect.

## 2026-11-07-2 – Switch tactics during the match

### New
- **Tactic presets during the match:** the tactics sheet now lists all your saved tactics under "My tactics". One tap changes style, system and game plan at once.
- **Switch by plan:** under Squad → Tactics you can set up to two rules: from which minute (30 to 85), at which score (any, leading, level, behind) and to which preset. Example: "from minute 70, when leading → Park the bus". The team then switches on its own – on the touchline, in the live ticker and in simulated matches. The minute is counted on a 90-minute scale, so "from 70" means the closing stage on every pitch.
- **Keep track during the match:** the tactics sheet shows which rule is still waiting; you can drop it for this match. A short note appears when the team switches.

## 2026-11-07-1 – Bug hunt: fixes from long careers

### Fixed
- **Youth player off to a pro club:** if you first said "Stay with us instead …" and he went anyway, the development fee was booked twice and the newspaper story later appeared twice in the chat.
- **Decisions of the week:** if someone involved has left the club in the meantime (transfer, end of contract), it now says "No longer an issue" – before, the game could get stuck at that point.
- **Old boys:** a former player who had joined the old boys could also end up with an opponent at the start of the new season and then played for two teams.
- **Group chat:** two suspended players no longer write the same sentence – each has his own.

## 2026-11-06-6 – New title screen and a view from the clubhouse

### New
- **Title screen redrawn:** Sunday morning at the village pitch, now pin-sharp on every screen – every pixel the same size. More to see: the village with its church, the low morning sun, a small stand, birds, smoke from the barbecue and the groundsman remarking the lines with his chalk cart. Logo and text no longer cover anything, and on short screens the logo gets smaller.
- **Clubhouse window:** under "Today" you now look down on the pitch, as if from the first or second floor.

### Fixed
- **Own youth in higher leagues:** players from your own youth section, sons of former players and the manager's children always came up at county-league strength – in the first division even a top talent stood no chance. Now they come up one level below the league, two levels below in the professional leagues.
- **Duplicate players after promotion or relegation:** when the new league was put together, an old boys player could end up in an opponent's squad at the same time.
- **Summer party:** the player who wants to join after the party now comes from your league's level and is sure not to play anywhere else.

## 2026-11-06-5 – A tutorial to get started

### New
- **Optional tutorial:** after founding your club, the game asks whether you would like a quick tour.
  - **Clubhouse tour:** eleven steps from "Today" via phone, line-up, tactics, training, transfers, season, kitty and grounds to the pub. Each step opens its tab and highlights what it is about.
  - **First match on the touchline:** tips on tactics and shouts, substitutions, the assistant, situation cards and half-time – each when the moment comes. The match is paused while a tip is open.
  - Stop any time with "End tutorial", restart it in **Settings → Game**. On a computer, Enter moves on.

### Fixed
- **Youth did not match the league:** the new U19 intake (and new old-boys players) was drawn from the whole player pool – so even in the recreational league 17-year-olds rated 70 to over 100 joined the club. Now, like outside signings, it comes from your own league's level. The same applied to the player-manager if you do not create your own.
- **Throw-ins:** opponents now keep 2 m from the thrower, as in Law 15. Before, one often stood right in front, and the ball bounced straight back out.
- **Winter break:** the rumour mill was greyed out because the break week had no actions. Now you get the usual two – the transfer window is open after all.

## 2026-11-06-4 – Club grounds: training, medical, club office, youth and surroundings

### New
- **Six new upgrade areas** in the clubhouse, each in three steps from volunteers to professionals:
  - **Training ground:** goalkeeper and fitness corner, indoor hall, training centre – all players develop faster.
  - **Team building:** weights room, recovery with sauna and ice bath, video room – fit again sooner, fewer injuries, more insight when you watch a game.
  - **Medical:** treatment room, physiotherapy, medical department – shorter absences and fewer injuries.
  - **Club office:** club office, headquarters, marketing and ticketing – more sponsor money, more spectators.
  - **Youth:** youth centre, school partnership, youth boarding house, youth academy – more and better talents.
  - **Stadium surroundings:** car park, club shop, forecourt with shuttle – more spectators and matchday income.
- **Youth academy required from the second division** for a licence, as in reality. Clubs already in the first or second division have one.

### Changed
- **Tidier menus:** at most two levels. The club section has no sub-tabs any more – kitty, grounds, club life, kit & crest, museum and you are tabs of their own (the president's office sits under "You"). Youth, women and old boys are together under **Squad → Teams**.
- The grounds are sorted into three themes: pitch and stadium, team, club. The crest editor only opens when you want it.
- On phones, tabs no longer run off the side but sit in a tidy grid; the squad-limit buttons stay together.

## 2026-11-06-3 – Ticket prices, season tickets and a squad that cannot run dry

### New
- **Ticket prices:** set your own from the district league up, 50 to 200% of the league price. Cheaper brings more spectators (and more thirst at the bar), dearer costs noticeably and only pays when people would otherwise be turned away. From the third-division stadium there is a separate seat price.
- **Season tickets:** 20% below the day price, money at the start of the season (or right away for the remaining home games). Holders turn up even in the rain.

### Fixed
- In the professional leagues the squad could run dry: if every contract ran out and you did not extend, nobody was left after one season. Now the club extends the best players by a year if needed, so at least eleven plus three remain – with a note in the chat.
- Events crashed with an empty squad.

### Technical
- Background matches can run in parallel in web workers (same results, switched on for testing only for now).

## 2026-11-06-2 – World Cup, European Championship and continental tournaments

### New
- **National team tournaments:** World Cup (48 teams), European Championship (24), Africa and Asia championships (24 each), South America (16), North and Central America (16) and Oceania (8) – on their real schedule, with groups, best third-placed teams and knockout rounds. Real countries, neutral names, all players fictional.
- **Call-ups from the Regional League up:** your players join their country if it qualified and they are good enough. Heritage decides; players with two countries often play for the one they live in.
- **Watch in the stadium:** their country's games run in 3D in the tournament stadium, both teams AI-controlled. Or just the result, or skip to the end.
- **Market value:** appearances, goals and long runs raise wage demands, fees and asking prices – fully for two seasons, then half.
- **Compensation:** at the World Cup the world body pays €5,000 per player per day.
- **Winter:** the Africa and Asia championships run during the winter break; whoever goes far misses league games afterwards.
- **Qualifying:** before each tournament the countries of each continent play groups home and away; group winners and the best runners-up go through. Even big countries can miss out – it makes the Gazette.

## 2026-11-06-1 – Summer moves to other clubs

### New
- **Summer offers:** finish the season in the top three and clubs from the league above get in touch, two if you are champions. In the first division clubs from the top half of the same league call.
- **Accept at the end of the season:** one tap on the club accepts, a second tap withdraws. The move takes effect next season: the new club plays wherever it ends up after promotion and relegation, with a new squad and fixtures. Kitty, grounds and sponsors start afresh; family, awards and your own player come with you. Your old club stays on as an opponent.
- **Sacked in the summer:** a club from the league below calls as well.

## 2026-11-05-7 – Second and first division

### New
- **Second and first division:** the pyramid now goes all the way to the top, with seven fictional clubs each. The 3. Liga champions go up again if they hold a licence.
- **Money as on average in reality:** wages, TV money, marketing and tickets are derived from the professional leagues' financial report, crowds from the 2023/24 league averages.
- **Licensing:** second division with 15,000 places (3,000 covered seats), undersoil heating and 1,200 lux floodlights; first division with 8,000 seats and 1,800 lux.
- **New facilities:** undersoil heating (no more closures for frost and snow), 1,200 and 1,800 lux floodlights, seating expansion, a grand arena for 50,000.
- Every club from the second and first division plays in the Bundespokal.

### Changed
- The Bundespokal round bonus is capped at the real amount – in the first division it would otherwise have been millions per round.
- Higher pyro fines in the second and first division.

## 2026-11-05-6 – Several subs, your own tactics, sharper figures

### New
- **Several substitutions at once:** pick a pair in the sub menu, "+ Another change" (or space), pick the next pair – all go together at the next stoppage. Planned changes are listed and can be removed again.
- **Substitution rules by league (researched):** unlimited in the recreational league; five from the district league up, as in men's amateur football (Saxony FA, Spielordnung § 56(7); Württemberg FA, referee notes 2024/25 – previously four up to the District Premier Division); in the Regional League and Third Division five in at most three stoppages, half-time does not count (DFB Laws of the Game, Law 3). Still no re-entry anywhere.
- **Save tactics:** under Team → Tactics "My tactics": store system, playing style and game plan under a name (up to eight), switch back with one tap, delete, or overwrite under the same name. The tactics belong to you and move with you when you change clubs.
- **Poaching with a fee:** if a contracted player is poached in the Regionalliga or 3. Liga, the new club now pays a transfer fee – before, he left for free.

### Changed
- **Graphics:** figures get baked-in shading (undersides darker, every body part slightly darker at the bottom than at the top) and one more light step – shorts, legs, arms and head stand apart more clearly. Plus boot soles in a contrasting colour. No extra draw call, about 24 more triangles per figure.
- **Even kits:** stripes, pinstripes, hoops, checks, wide hoops, edged stripes, double and tonal stripes now sit mirror-symmetrically around the centre and meet the sides and back at the edges – before they looked offset. The cross is centred.

## 2026-11-05-5 – New kits, names, events and chat lines

### New
- **Kit templates by colours:** 18 new patterns, sorted in the editor into one colour (tonal – stripes, hoops, checks, diagonal, shadow fade and pixels as a darker or lighter shade of the main colour), two colours (double stripes, centre stripe, cross, V chest, hem band, quarters) and three colours (tricolour, three bands, double hoop, stripe pairs, double chevron, edged yoke). The retro patterns remain a group of their own.
- **More names:** new German careers get more first and last names in every origin group (name edition 9). Players' attributes and looks stay the same.
- **Events from the top amateur tier up:** press conference after defeats, the agent wants a raise, fan protest about prices, an association fine for pyrotechnics, the sponsors' VIP evening, a social-media slip, undersoil heating in the frost, a second-division club wants your talent, TV moves you to Monday, doping control, a live-stream offer in the Regional League.
- **Chat:** 20 new messages about the club – pro life (ice bath, GPS data, fan shop, team bus) only higher up, amateur life (bottle deposits, kit washing, sausage stall) lower down – plus 15 new yes and 8 new no replies.

### Changed
- **Every event checked** (193 of them) against league, pitch and professionalism. What does not fit higher up no longer appears there: e.g. work parties, raffles, shrunken kits, car pools, Walter the groundsman, expense allowances, "the disciplinary panel in a pub back room". Job stories (shifts, field work, promotion) appear up to the Regional League, not in the Third Division. Pitch events (closure, storm, snow, work party) not in the hall, the backyard neighbour only on small pitches in residential areas. The licence reminder comes from the association instead of the district from the Regional League Canal Group up.
- Likewise for chat messages: neighbours at the fence, bed-sheet banners or the leaking dressing room no longer appear higher up.

## 2026-11-05-4 – Key help out of the way

### Fixed
- **Key help:** the box with the keys (1–4 shouts, X substitute …) sat top right next to the scoreboard and covered the away team's name at medium window widths. It now sits below and fades out after eight seconds; press H to bring it back.

### Changed
- New careers are set up faster (the player lists are only built once).
- The 3D graphics run on three.js r187 instead of r186. Checked on six venues by day and evening: same draw calls, same brightness, same picture.

## 2026-11-05-3 – The seat gets hot

### New
- **Backing from the board:** the board measures every league game against the season target. How strictly depends on the league: not at all in the Sunday league, barely in the district leagues, clearly from the Regional League Canal Group up, hard in the Regional League and Third Division. Shown under Club → You.
- **Warning and ultimatum:** if the backing drops, first a warning, then an ultimatum – four points from the next three league games. If not, you are sacked. In the summer there may be an ultimatum for the start of the season.
- **New club:** after the sack up to three clubs from the same league get in touch. You take over their squad, league position and fixtures; kitty, grounds, sponsors and youth start afresh. Your old club plays on – you will meet again.
- **As president:** the members apply the pressure. A narrowly lost motion of no confidence costs the hired manager, a clearly lost one (or the second within two seasons) costs you the office – then it goes on as manager at another club.
- Applies to new careers.

## 2026-11-05-2 – Regional League and Third Division

### New
- **Two more leagues:** above the top amateur tier come the Regional League (North, North-East, West, South-West or Bavaria, depending on your state) and the Third Division. Opponents are one and two leagues stronger than in the top amateur tier, far more fans come, and the Third Division pays TV money.
- **Contracts:** from the Regional League on your players are contracted professionals with a monthly wage and a term; it shows in the player profile. In the final year you can extend – a sulking player will not. Anyone not extended leaves on a free in the summer. Ending a contract early costs severance pay.
- **Transfer fees:** players from pro clubs cost a transfer fee instead of training compensation; the transfer market also shows their wage demand.
- **Licence:** the Regional League needs a stadium for 2,500 and floodlights, the Third Division 5,001 places with 2,000 seats and 800-lux floodlights – plus a reserve in the bank. What is missing is shown under Club → Grounds. No licence, no promotion.
- **Turning down promotion:** any club can decline promotion, usually for money reasons – lower down more often than higher up. If the champions of your league decline, the runners-up go straight up. The Third Division champions always decline for now, as there is no second division yet. The top four of the Third Division play in the national cup.
- Applies to new careers.

## 2026-11-05-1 – World class, team leaders, star of the league

### New
- **Hidden bonuses:** some players have something special that is not in their rating. You discover it over time – after a few games, sooner with an assistant coach, straight away by scouting. Then it shows on the card and profile.
- **World class:** when it gets tight late on, he plays more precisely and keeps his nerve. Measured: about a third more goals for his team in tight closing phases.
- **Team leader:** the step above a leader. Next to him the others run more, stay calmer under pressure, and the team gets less nervous when narrowly ahead. In the dressing room bad moods spread less often and talks work better.
- **Star of the league:** after four matchdays the District Gazette crowns the three strongest players in the league. Opponents mark him tighter, more fans come, other clubs want him – and on the bench he sulks. After promotion or relegation the title is gone.
- Applies to new careers.

## 2026-11-04-3 – Youth, love, school – and transfer strikes

### New
- **Talent from your own youth section:** a kid with lots of talent is more likely to become a big talent – but it is no guarantee, late bloomers and flops still happen. For your own lads the estimate is more accurate from the start.
- **Growing up:** final exams, apprenticeships with shift work, first love and heartbreak, bands, gaming, the gym and parties, the driving test. For the kids, other hobbies and the first crush. Some of it costs form or training time, some of it costs you the player.
- **Boarding academies and host families:** kids who moved to a pro academy sometimes want to come back. From the State League on, young signings from further away need a host family – otherwise homesickness sets in.
- **Bad moods spread:** sulking players drag others along when the mood is bad. That turns into cliques in the dressing room and a meeting with the players’ council – shut it down and the atmosphere turns poisonous.
- **Brighter evenings and pub:** evening games under floodlights or street lamps are much brighter and crisper, without losing the evening feel. The pub sat behind a semi-dark layer and took on the pitch’s lighting – now it has its own warm light.
- **Transfer strike:** a player who is refused a move sometimes simply stays away from training to force it. You can suspend him, release him or stand firm – then he may deregister without a release, and you get nothing.

## 2026-11-04-2 – Too good for the league

### Changed
- **A league that is too low holds players back (new careers):** anyone above the level of their league learns less – a little less progress per league above, at most half. Talent stays the bigger factor.
- **People notice:** the player card says “above his league”. Clubs from the league above try to poach such players, and some players come to you themselves wanting to play higher – you can release them, promise to go up together or hold on to them, which makes them sulk.

## 2026-11-04-1 – League level, development and talent

### Changed
- **Rating with league level (new careers):** next to the rating it now says which league a player fits, e.g. “Rating 84 · level County Senior League” – on the player card, in the rumour mill, on the transfer market and for yourself. If the rating is only an estimate, it says “level about …”. League names follow your association; above the top amateur tier, Regional League to First Division.
- **Development by league (new careers):** from the Regional League Canal Group upwards, players gain more rating points – higher up a point counts for less, so the same progress takes more points. A young top-amateur player gains about 27 instead of 19 points over eight seasons; up to the County Senior League nothing changes.
- **Talent (new careers):** every player has a hidden talent – from exceptional to “maxed out”. It decides how much a young player improves and how far he gets: some shoot up, many get steadily better, some barely move. The player card and the youth page show an estimate that gets more accurate with seasons at the club, match practice and an assistant coach – and is sometimes wrong.

## 2026-10-31-6 – New strength model (new careers)

### Changed
- **New strength model (new careers):** every player has a fixed level from Sunday league to the top amateur tier, so the leagues are much further apart (Sunday league around 54, top amateur tier around 128, pros 180–195; ratings go beyond 99). A side one level up takes about 80 % of the points higher up, a little less lower down. Passing, control, shooting and tackling mistakes now depend on the opponent. Careers already under way keep the old model.

## 2026-10-31-5 – Family and energy by league

### Changed
- **Family and energy by league:** from the County Senior League on, your assistant rather than the captain steps in when you are out (if the post is filled). From the State League on, a family crisis or burnout lasts one week instead of two. In the red zone (below 25) it bites before the crisis: with no energy left you get one thing less done a week, and when things are tense at home the family stops coming to games.

## 2026-10-31-4 – More life in the chat

### New
- **More life in the chat:** counted first: 17 messages a week, but mostly replies, the match call and the same striker warning. Now every week brings something from around the club – the parish, neighbours, sponsors, fans, other clubs, the weather and the unexpected (the same message at most once every 16 weeks). The match call and the melee report have variants, and the striker warning only comes when he has scored again.

## 2026-10-31-3 – Tidier club pages

### Changed
- **Tidier club pages:** on a phone the Club tab was almost twelve screens long. It now has sub-pages – You, Grounds, Club life, Kit and Crest – and the upgrade groups can be expanded (the group with work in progress is open). From the president’s office, “Club expansion” leads straight to Grounds. Under Youth, the U19s and the youth teams have their own tabs; in the kitty, the fines list and the ledger can be expanded. No page is now longer than three and a half screens.

## 2026-10-31-2 – Crowds and stands

### New
- **Crowds and stands:** under Club → Stands you now see the season’s average attendance, how full the ground is, the record and the last few seasons. When a home game sells out, the District Gazette reports how many had to stay outside and which upgrade adds room next; from the County Senior League on, the gate money you missed out on is counted too. New records make the Gazette as well.

## 2026-10-31-1 – More sponsors

### New
- **More sponsors:** twelve bigger firms from the region (housing co-op, furniture store, motor group, IT services, hospital, wind power, harbour bank, regional airport and more) come knocking from the County Senior League, Regional League or State League – 72 sponsors now. Plus new ad spaces: back-of-shirt sponsor from the County Senior League, shorts sponsor from the State League. From the County Senior League on, the front of the shirt always goes to a bigger firm if one is free.

## 2026-10-30-7 – Rivalries

### New
- **Rivalries:** besides the league derby, rivalries now grow out of what happens: top and bottom clashes in the second half of the season, melees, players moving to the other side and a narrowly lost title race. From “Rival” on the match is refereed like a derby, more people come and the result hits the mood harder. Over the summer things cool down a little; meet again after promotion or relegation and the rivalry lives on. Under Club you can see the list with every reason.

## 2026-10-30-6 – Referees with faces

### New
- **Referees with faces:** district, county and state level now each have their regular referees – with a name, a face, a way of reffing (fussy, lets it flow, short-sighted, in control) and a quirk. One of them takes charge of your league match, and he always looks the same in the 3D game. The match card shows who is reffing on Sunday and your record with him; anyone who has been before also comes up in the team chat. Under Club you can see all referees at your level.

## 2026-10-30-5 – Training plan

### New
- **Training plan:** Under Squad → Training you set how often the team trains (1× to 5× a week, shown next to what is usual in your league) and on what: balanced, fitness, ball work and passing, finishing or duels and defending, plus optional extra keeper training. More training means more development at the end of the season, and the focus steers it into its attributes. In return, every evening beyond the usual costs family time and energy every week. If you set nothing, training stays as before.

## 2026-10-30-4 – Scouting

### New
- **Scouting:** On the transfer market you only see other players' ratings as a range, such as "64–78". Anyone in your league or who has played against you counts as "seen". With "Watch them play" (one action a week) you watch a club: the ranges narrow, and the standouts are known exactly. Class and traits only show for players you have watched.
- **Kickabout pitch:** "Go to the kickabout pitch" (one action) puts two unattached players on the rumour board.

## 2026-10-30-3 – The pub in 3D

### New
- **The pub as a room:** The local is now a 3D room in the style of the game. The landlord stands behind the bar (your hired landlord with his own face, otherwise Kalle), Grandpa Heinz and a few players sit at the regulars' table, two play darts – the darts stay in the board. Pennants, scarves and the club name in your colours, a title pennant for every championship. People drink, chat and gesture.
- **Tap instead of menus:** Tap a person and what you can do with them appears below: buy a round or pump the landlord, the regulars' table and beer-mat tactics with Grandpa Heinz, the duel at the dartboard, a one-to-one with a player. All of them are also listed under the room; the classic view shows only the list.
- **Closer in portrait:** In portrait on a phone the pub shows a close-up with bigger figures. Swipe sideways to look around the room; picking someone from the list moves the camera to them.

## 2026-10-30-2 – Legs, nerves and a second wind

### Changed
- **Tiredness like real football:** Players lose their energy over the whole match. Towards the end they make about 40 % fewer fast runs than at the start, as measured in sports science (Mohr et al. 2003); before, they were spent after a third of the game. Substitutes bring fresh legs. Tired players shoot and pass less accurately than fresh ones. On the full-size pitch more goals go in as a result; the conversion rate is now just over 10 % as in real football.

### New
- **Nerves for the leading side:** A narrow lead brings pressure late on, all the more after the other side pulls one back. Nervy players wobble, calm heads stay cool and settle the others. The ticker says so.
- **Energy from a goal back:** Pulling a goal back or equalising in the second half sometimes frees up fresh energy, not always.
- **"Second wind" profile:** Some players find fresh legs late in the game when they are tired.

## 2026-10-30-1 – Skill beats bulk

### Changed
- **Strength in duels:** Strength counts a little less in shoulder-to-shoulder duels. Measured, it mattered more for strikers than technique and finishing; now strength and technique are level. Shielding the ball while standing is still down to strength. Goal counts stay in the usual range.

## 2026-10-29-9 – Women's team with squad and league

### New
- **Women's team with squad and league:** If you have founded a women's team, you will now find it under Club → Women: 16 players with name, age, position, rating and portrait, a coach and the captain from the founding. They play in their own eight-team league, on Sundays alongside the first team; results arrive in the group chat. Champions go up (as far as the regional league), the bottom side goes down. Home games cost referee fees as for women's football in Westphalia.
- **From the youth section to the women's team:** Girls from the youth section and your daughters join the squad as real players at 16. In summer some stop and new players join.

## 2026-10-29-8 – Colourful kits, indoor clock and indoor goals

### Fixed
- **Colourful kits stay on:** Your team often played in the white change kit even with colourful home and away kits – a kit had to differ from the opposing keeper as well as the opposing shirt. Now only outfield shirts count; a keeper who clashes changes colour (the host's keeper too). Measured over all clubs and 132 colourful kit pairs: change kit 36.5 % → 9.4 %.
- **Indoor clock:** Indoor matches now show 2 × 20 minutes like futsal (extra time 2 × 5) instead of running up to 90. Display only.
- **Indoor goals and catch nets:** Goals are striped red and white like handball goals, and the catch nets behind them are a light veil instead of bars. Before, the white goals vanished against the white boards and players in front of goal looked as if they were behind it.

## 2026-10-29-7 – More nationalities

### New
- **More nationalities:** New careers now also feature players with Ukrainian, Romanian, Kosovar, Afghan, Bulgarian, Iranian and Vietnamese names – in proportion to the 2024 German microcensus. The share of German names stays as before. Each group has its own first names and its own line in the pub dossier.
- **No real internationals** from these countries as player names.

## 2026-10-29-6 – Retro kits, new kit editor, kit supplier and Manager of the Month

### New
- **Retro kits:** 14 new patterns after legendary 90s shirts – zigzag, wings, jags, squiggles, rainbow, confetti, star shoulders, edged stripes and more. All in any colours, many with a third colour. The editor names the inspiration; there are no crests, sponsors or manufacturers.
- **Kit supplier:** A team sports supplier makes new kits cheaper, some give one free set a year from a certain league up. Two offers per season in the kitty, three-season deal.
- **Manager of the Month and of the Season:** Every four matchdays the District Gazette names the manager with the most points, and at the end of the season the one who got the most out of his squad. Your awards are on the roll of honour.

### Improved
- **Clearer kit editor:** sections for set and name, pattern, cut and colours; patterns shown as small previews in your colours, split into Classic and Retro.

## 2026-10-29-5 – Stadium, referee fees, squad limit and trips at real prices

### New
- **Stadium upgrade:** From the Landesliga up you can expand your ground into a small stadium – room for 2,500 spectators, what the Regionalliga requires.
- **Adjustable squad limit:** The squad tab shows your league's squad limit; move it with − and +. Expand it to see the default for every league.

### Improved
- **Referee fees** as in a real association: €27 in the Kreisliga, €35 in the Bezirksliga, from the Landesliga up with two assistants (Oberliga €175 per home game).
- **End-of-season trip and training camp** now cost what they really cost per person – Mallorca around €450, the bowling trip €110. Everyone pays their share, the club gives a subsidy you set in the kitty. The more the players pay, the fewer come along.
- **Training camp by league:** the lake or your own pitch at the bottom, the association's sports school from the Bezirksliga, Belek from the Oberliga.

## 2026-10-29-4 – Regional names, Tim at the window, grey hair

### New
- **Regional names:** With a state chosen, many players, managers and referees carry surnames typical of it – Huber, Gruber or Mayr in Bavaria, Hansen or Petersen in Schleswig-Holstein, Uhlig or Kretzschmar in Saxony. You also meet the first names that are especially common there, in Bavaria for example Xaver, Josef and Korbinian (trendy names like Fiete or Jonte only among the young). Applies to new careers.

### Improved
- **Getting older:** Manager applicants look as old as they are – a 65-year-old is usually grey. Players and managers turn grey over the years.
- **No real footballers:** The name generator no longer produces names of well-known internationals.

### Fixed
- **Tim "The Tiger" in the backyard:** He now leans on a cushion in front of the window; his head and arms no longer vanish into the wall.

## 2026-10-29-3 – Leagues up to the Oberliga, choose your state, full nationwide cup and winter break

### New
- **Choose your state:** At the founding meeting you pick your regional association (21 to choose from). The leagues are then named as they are there, e.g. in Westphalia from Kreisliga C to Oberliga Westfalen. Clubs get made-up names that sound local. The Sunday league stays the Sunday league.
- **Three new leagues up to the Oberliga:** Above the county league come the 7th tier (e.g. Landesliga), the 6th tier (e.g. Westfalenliga) and the Oberliga. More spectators, higher entry fees, stronger opponents, higher costs. From the Landesliga up you go straight into the State Cup instead of the District and County Cups.
- **Promotion and relegation for everyone:** At the end of the season the other clubs go up and down too, in every league. The District Gazette reports who moves.
- **National Cup with 64 clubs:** All the other ties are played alongside yours. The cup tab shows every round, and even after you go out the real winner is decided.
- **Winter break as its own week:** After the first half of the season there is a week without a league match, with the indoor tournament. Between tournament games you set a separate tournament line-up.

### Note
- Backed by sources: Oberliga crowds (Oberliga Westfalen averages 298 to 462) and €5 entry in the Landesliga. The values for the 6th and 7th tiers sit evenly between the county league and the Oberliga. Hamburg and Niederrhein have one class fewer, so their top tier is called "Oberliga (Spitzenstaffel)".

## 2026-10-29-2 – Change system during the match

### New
- **Change your system mid-match:** In the tactics sheet on the touchline and in the live ticker you can pick a different system, e.g. from 2-3-1 to 3-2-1. Each player takes the spot in the new formation closest to his old one and runs there – until everyone is in place, the shape wobbles. A player moved out of position plays a little weaker there.

## 2026-10-29 – Corners: keeper claims crosses, tighter marking

### Improved
- **Corners:** On the full-size pitch the goalkeeper now comes out for crosses into the six-yard box and catches them – before he stayed on his line. Defenders go to the ball with their man, and a real aerial duel now decides who heads it instead of simply the nearest player. Goals from corners: full-size pitch about 9 % instead of 15 %, 7-a-side 11 % instead of 13 %. Still more than in real football (3–5 %).
- **Fewer headed goals:** Because the keeper claims more crosses, fewer headers go in on the full-size pitch and there are slightly fewer goals overall (about 1.2 in a short game).

## 2026-10-28-3 – Goalkeeper in the box

### Improved
- **Close-range shots:** On the 9-a-side pitch and the full-size pitch, shots from inside the box went in far too often (21 % and 32 %, real 13–16 %). Now it is about 16 % and 22 %. In front of the big 7.32 m goal the keeper dives further, and the short-game bonus on large pitches is no bigger than on the 7-a-side pitch.
- **Headers:** For the goalkeeper a header on goal now counts as a shot – from close range he has less time. On the full-size pitch about 15 % of goals are headers, as in real football.
- **Fewer goals on large pitches:** In short games the full-size pitch now averages about 1.5 goals, the 9-a-side pitch 2.0.

## 2026-10-28-2 – Keepers stop long shots, play-off with a break

### Improved
- **Goals per shot:** On the full-size pitch one shot in five went in, now about one in eight. Long shots from more than 25 m are almost always saved, as in real football. Because a short game only lasts 2 × 3 minutes, fewer goals fall on the full-size pitch (just under 2 instead of just under 3 on average). On the other pitches it stays at about one goal in ten shots.
- **Play-off:** After the first leg you first see the result and “On to the second leg”, then the second leg.

### Fixed
- **Tipped into his own net:** When the goalkeeper tipped a hard shot “over the bar”, the ball often still dropped into the big goal. “Round the post” sometimes went towards the middle of the goal, too.

## 2026-10-28 – Away kit, midweek games, crow and player development

### New
- **Away kit:** The kit editor switches between home and away. You order both sets together for one price. If the kits are too similar, the visitors wear their away kit, and only if that clashes too, a neutral change kit. Clubs without their own away kit play in their second colour. The goalkeeper always stands out from both teams. The match card shows who plays in which kit.
- **Midweek games:** After a midweek cup game the clubhouse first shows the result and “On to Sunday”, then the league match. Legs recover by Sunday; between Saturday and Sunday there is only time for part of that. The national cup avoids the other cups' weeks – two cups in one week only happen when a short season has no room left.
- **Player development:** Every player has a hidden development type: normal, early, late, steady, breakthrough or stalled early. The league limits how much is possible – less in the recreational league than in the county league, with outliers both ways. A move, a new manager or a new style of play sometimes makes it click.
- **New incident – the crow:** A stubborn crow flies onto the pitch, pecks at the players and is chased off by both teams.

### Improved
- **Team chat:** Asking again whether someone can play after all is limited to twice per match day.
- **Names and stories:** Name, looks and the pub story match the player's origin, and the stories match his position – a goalkeeper no longer talks about his goals. Existing saves keep their names.
- **Corners:** Corners reach the box much more often instead of flying out for a throw-in, on the ash pitch too. Headers are slower and less precise, and the goalkeeper stays near the centre of the goal on crosses. Goals from corners are still a little too frequent.
- **Thunderstorms:** They only come in the right season and fitting weather, with distant thunder and first drops as a warning.

### Fixed
- **No re-entry:** Substituted players can't come back on, in the recreational league too.
- **Kit by role:** A goalkeeper playing outfield wears the normal shirt, not the goalkeeper kit.
- **Play-off:** Line-up and tactics can be chosen beforehand, and the game is played on the higher league's pitch with its number of players – no more eleven-a-side in the backyard.
- **Indoor hall:** The boards behind the goal are flush with the posts.
- **Ash pitch:** The players' shelter is made of acrylic glass instead of a dark panel that looked like a black bar on screen.
- **Cloud shadows:** No more stripes on house walls.
- **Overhead kicks:** The AI no longer tries them from its own half.

## 2026-10-23-2 – Transfer market, crest editor and old boys

### New
- **Transfer market:** As in amateur football, moves only happen in two transfer windows – in summer before the first match day and in winter after the winter break. The player search lists players from your league and the neighbouring leagues; first you ask the club for a release, then you talk to the player. Without a release there is a waiting period. You can put your own players on the transfer list, accept or reject offers and loan players out for a season. Training compensation follows a real association table, signing-on fees stay below the amateur limit. The CPU clubs also trade players among themselves, and the District Gazette reports on it.
- **Poaching only in the window:** If one of your players says yes to another club during the season, he keeps playing for you until the next transfer window. Then the offer arrives – you release him (with compensation) or hold on to him.
- **Free agents at any time:** New “Free” filter in the player search. Players without a club need neither a release nor a window – approach them, court them on the rumour board, done.
- **Crest editor:** The founding year is adjustable (1880 to the current game year), plus 40 patterns, 15 shapes, 78 emblems and a third colour.
- **Old boys:** With enough over-32 players around you can found an old boys side. It plays every other Friday in its own six-team league; the squad comes from former players, your first team's over-32s and new faces. Instead of training there is a beer kitty and team spirit; when your playing career ends you can carry on there.

### Fixed
- **Door button:** The door icon at the top right of the clubhouse takes you back to the main menu again (it did nothing since the last delivery).

## 2026-10-23 – Coaching orders that count, faster game

### Improved
- **Coaching orders:** Every order has been measured (the same matches with and without it). “Close the middle” was only half built and now pushes the opponent wide. Stay compact, speed up/slow down, guard against the counter, cover left/right, mid-block, keep the ball and more risk all take hold much more strongly.
- **One-twos:** The wall only plays the return pass once he really has the ball, and tries again if needed – one-twos arrive more often (57 → 64 %), lay-offs too (58 → 68 %).
- **Faster:** The match engine needs about 40 % less computing time.

## 2026-10-22 – Presidency, club festival, pitch care and Tim

### New
- **Player-manager or manager only:** At the start of a career you choose whether you are in the squad yourself or only on the touchline. Old saves stay player-manager.
- **Presidency:** After your time as manager (stepping down or moving to the old boys) you can hire a manager from three applicants – with an interview and haggling over wages – and run the club as president: season target, finances, facilities, sacking the manager. You watch matches from the stand or in the live ticker.
- **Club festival:** After the last matchday, with seven attractions (barbecue, cakes, raffle, goal wall, penalty king, bouncy castle, kids' tournament), helpers, weather, small mishaps and a local paper report.
- **Summer tournament:** Before the first matchday, with 4, 6 or 8 teams – as guests or as hosts. The trophy goes in the cabinet.
- **Pitch care:** Grass and lines wear out; mow, chalk, water, reseed – with helpers or a contractor. A worn pitch bounces less evenly; in rain or frost the pitch may be closed and the match moved to Wednesday.
- **Lease and facilities:** A renewal offer from the council, a long-term lease or buying the ground. New to build: artificial turf, a second pitch, terraces, seats, a stand roof, a sausage stall and a beer garden.
- **Superfan Tim “The Tiger”:** Balding, full beard, can in hand – he stands at the touchline at every match (in the backyard he watches from a window) and cheers, rants and drinks. Plus 19 events, such as “Tim buys a round” after big games or a three-week letters-page story.

### Improved
- **Full-size pitch:** The camera shows more space in the direction of play and follows the ball further to the side, so the ball nearly always stays in view. Penalty area (16.5 m), goal area, centre circle (9.15 m) and penalty spot (11 m) have real dimensions; a foul anywhere in the penalty area gives a penalty, and the keeper uses his hands there and comes off his line during attacks.
- **New players match the league:** In the lower leagues hardly any village stars, superstars or legends turn up any more – the offers get better with every promotion.
- League events (disciplinary panel, district cup, fans …) come up more often again in the higher leagues.
- Ties in tournament tables: points, goal difference, goals, head-to-head, then lots.
- Live ticker: the final question says “we lead” or “we trail”, and the option reads “Finish them off – one more goal!”.

### Fixed
- A cup win now shows up straight away as a card on the home screen.
- On the phone the club card can be closed with × again, even with long texts.
- “Share picture” at the end of the season reliably downloads on the PC and shares on the phone.
- Android: exporting saves and sharing the picture go through the share dialog.

## 2026-10-19 – Pure manager game

### New
- The main menu now has just three entries: **Career**, **Saves** and **Settings**. A match plays in the background as scenery, without any controls.
- Every match with your own team is coached either from the touchline (shouts, tactics, substitutions, half-time) or via the live ticker. Penalty shoot-outs are simulated.

### Improved
- Old saves load as usual.

### Fixed
- Typing the club name (for example with the space bar) no longer triggers the match controls.

### Removed
- Playing yourself (keyboard, gamepad, touch stick) together with the play-mode switch, difficulty, auto-switch and key bindings.
- The friendly match with pitch choice, the challenges with their rewards and the browsable player pool.

## 2026-10-16 – Hall floor, ball physics, strength

### New
- New player attribute **Strength**: height, build, position and age help decide who shields the ball, wins a duel or wins the header. Old saves get the value automatically.
- In the sports hall, the floor outside the boards now has its own surface, and the boards sit right behind the goal.

### Improved
- The ball rolls more realistically: rolling resistance plus air resistance instead of an even slow-down. The AI's passes are tuned to it.
- On the full-size pitch nobody shoots from 40 metres any more: shots come from 30 metres at most, and shot distances are much more realistic.
- Fast back-and-forth exchanges (ping-pong) are rarer: whoever loses the ball is briefly locked out, whoever wins it is briefly protected.
- In a thunderstorm everyone clears the pitch faster.
- The stand-in referee's escorts walk calmly beside him instead of twitching.
- The police wear long trousers; cloud shadows drift more calmly across the grass.

## 2026-10-15 – Hall and police

### New
- The hall has board passes: teams play the ball off the boards. The board door swings open when someone walks through.
- The police now wear blue with a peaked cap and can no longer be mistaken for the referee.

### Improved
- The hall is higher-scoring (about 2 goals per match on average instead of 1.5), and low shots have more punch.
- The ball bounces livelier on concrete and asphalt, and a bit lower in the hall, like futsal.

## 2026-10-14 – Out of position and hall play

### New
- **Out of position:** a player who is not on his position loses strength – the further from his own role, the more. After a few matches he gets used to it, and some grumble in the team chat. Line-up and substitution board show a note.
- In the hall, a drunk fan climbs over the boards instead of the police – until the steward leads him out through the door.

### Improved
- The hall is played flatter: high balls only near the goal, with catch nets behind the goals.
- The AI now only substitutes like for like.

### Fixed
- In the hall, the referee and players walked through the boards; there are now obstacles and a board door.

## 2026-10-09 – Fouls, sponsors, 42 new events

### New
- **Fouls with consequences:** shirt pulling, shoving, tripping and shoves in header duels. The referee sometimes plays the advantage and shows a straight red (last-man foul, serious foul play).
- **Suspensions** in the career – shown in squad, line-up, chat and the district paper.
- Sponsors with **terms of 1 to 3 seasons**, termination against a penalty, and one wish per season (for example autograph session, youth camp or home wins). Board partners on the boards, sleeve sponsor on the upper arm.
- 42 new events: 20 with five multi-part chains (such as reporter week, fan club, groundsman retirement), 14 for training, volunteering, referee in the recreational league and season goal, 8 around sponsoring.
- New animations: fouls are visible, there are scenes after the whistle (innocent gesture, protesting, consoling after a red), the referee shows advantage and cards clearly, plus a header with take-off, a softer slide tackle and stretching.

### Improved
- From the Kreisliga A up, nobody turns up only for the second half (the electronic match report opens early). If a starter is missing, the best-fitting substitute steps in automatically.

### Fixed
- Blocked sponsors never came back; now they expire after three seasons.
- A red card in the cup or hall tournament shortly before a league match suspended two league matches instead of one.
- Nobody walks through boards, benches, cars or walls any more when pigeons, dogs, fences or police are involved (report of 10 October).
- Several English texts and a club name reminiscent of a real club were corrected.

## 2026-10-08 – Corners, headers and the nationwide cup

### New
- 12 new season events (promotion party, relegation crisis, farewell match, company run, pitch closure and more) and a dedicated event for the derby return leg.

### Improved
- **Corners and headers** on all pitches: hard shots are deflected more often, crosses are slower and more accurate, and at corners attackers and defenders stand in the box. Clearly more corners and headed goals.
- Under pressure in their own third, defenders now simply clear the ball (clearance).
- In the national cup the pros are stronger (an average district-league side advances about 3–5 % of the time), and the stadium is fuller.
- In a thunderstorm, whoever has to wait for the referee waits behind the line instead of on the pitch.

### Fixed
- Deflected shots into the net count for the shooter and no longer as an own goal.
- National cup: attendance and settlement now match, no double pitch rent any more.
- Extra time: a short rest before extra time, and the kick-off changes sides.

## 2026-10-07 – Cup expansion and thunderstorms

### New
- **Cup:** when level, you choose in the settings between going straight to penalties and extra time. New are the State Cup and the **National Cup** against fictional pro clubs – with venue choice, stadium and sponsor bonuses.
- Warming up at the touchline and livelier spectators.

### Improved
- In a thunderstorm every venue has real shelters, including the stadium and the full-size pitch with the extra stand.
- The player figures may be a little more detailed.

### Fixed
- In a thunderstorm nobody runs through house walls, cars or boards any more.

## 2026-10-04 – Looks, goalkeeper and flow of play

### New
- Looks: six new hairstyles, three beards, socks down, sweatband, tape and sports glasses. Faces show exhaustion, joy and anger, and shirts get wet.
- Crests with a lettered banner (initials and year), champion stars and eight motifs; kits with four patterns, collar types and sleeves in the second colour.
- Goal celebration with a pile-on: the scorer stands still, his teammates sprint over.
- Goalkeeper: catching by ball height, punching with one or both hands, throw and goal kick, spreading wide, rebounds.
- Three kinds of crosses depending on pitch size (low, medium, high), runs into the box and headers after crosses.
- New incident reactions (storm slip, police at the manager, pigeon on the crossbar, dog, fence, sprinkler, car alarm, stand-in referee).
- More variety in team chat replies (52 instead of 22 variants) and new events (confirmations, delays, weather chat, district-paper quotes, reunions).

### Improved
- Flow of play: throw-in with a run-up, smoother transitions between running, shooting and passing, body contact in duels; the goalkeeper dives and rolls off.
- Grass, clouds, figures and the edge of the pitch look better.

## 2026-10-03 – Midweek cups and wing play

### New
- **District Cup and County Cup** as knockouts in midweek; sponsor logos on the kits.
- English names, clubs, leagues and sponsors (60 sponsors), more events for higher leagues.
- A bratwurst and beer stand at the pitch; backyard goals are visible.

### Improved
- Attacks go down the wings more often – with width, wing play to the byline and crosses instead of shots from a tight angle.
- The goalkeeper's dive runs in phases; players get up after a slide tackle or fall.
- In portrait on a phone there is no empty area any more; a decided club decision can be minimised.
- Tactical commands were checked: order does not matter, tempo works, “drop the strikers” takes effect.

## 2026-10-02 – Club founding and Android

### New
- **Founding meeting:** colour choice without a jump, you fill the honorary posts yourself.
- The Android app as a download (always the latest version) and preparation for the Play Store.

## 2026-10-01 – Youth, fitness and the Bezirksliga

### New
- **Kreisliga A** as the fourth league (9 against 9) and the **Bezirksliga** (11 against 11 on the full-size pitch, with offside and expense allowances).
- **Youth:** league play with a table, match festivals, Whitsun tournament and DFB base; children develop differently (early and late developers, school stress, parent types); move to a performance centre with a training fee; the bridge from U19 to the first team through training with the squad, maturity and mentors.
- **Fitness:** 50 to 100 percent per player; starting stamina and injury risk affect the line-up.
- Poaching attempts, pro contracts and recruiting as a conversation over two to four weeks.

### Improved
- “Pick automatically” considers strength in the position and form.
- The clubhouse window is bigger and closer.
- The manager editor starts with an empty profession field.

## 2026-09-30 – The clubhouse as a room

### New
- **New interface (“UI 3.0”):** the clubhouse is a room with a tactics board, a window onto the pitch and a desk. The squad is a deck of player cards, the line-up a magnet board, the team chat lives in the manager's phone, plus district-paper pages, pinboard, wall calendar, folder and notebook.
- The coach's bench gets its own area.
- Goalkeeper animations, high balls with a jump, punching under pressure.
- Attack: shooting from a good position, one-two, lay-off, back pass and the “Combine” order.

### Improved
- Game and menus use less memory and processing time; muted sound no longer uses processing time.
- Goals only count from the opponent's half.

### Fixed
- Two memory leaks when changing venue and with incident visitors.

## 2026-09-29 – Manager mode 2.0 and new design

### New
- **New design system** with two-level navigation, the club overview “Today”, player cards and the line-up on the pitch, a tactics board with a pitch, and a vibration setting. The in-match manager view gets its own display.
- Manager mode 2.0: passing, the cost of attacking, playing styles and an endgame card.

### Fixed
- The game froze when the late arrival from the traffic jam joined mid-match.

## 2026-09-28 – Graphics 2.0 and manager mode 2.0

### New
- **Graphics 2.0** in seven phases: an integer pixel grid with quality levels, light and atmosphere, new players, spectators, environment and weather, ball and effects, image post-processing.
- **Manager mode 2.0:** orders with real effect, situation map, half-time talk, opposing managers, player profiles, “Your match” with chains of causes, match plan and beginner/advanced view, substitution hints.
- Tricks and acrobatics: step-over, heel flick, Zidane trick, Jay-Jay lob, fall and side-fall scissor kicks.
- Numbers in a dedicated, easier-to-read digit font.

## 2026-09-27 – Atmosphere in the ground

### New
- Atmosphere: spectators, shouts, murmurs, applause, goal horn and echo.
- In-match injuries with forced substitution and playing a man down, a substitution board and substitution rules per league.
- A second decision slot for club life on the pinboard.
- Half length adjustable per pitch (from the backyard at 2 × 1:30 to the grass pitch at 2 × 2:30) and selectable tournament length.

### Improved
- Leagues with 8 teams and 14 matchdays are possible.
- Consistent player names (origin first, first name by birth year); the look fits the name.
- Manager shouts reduced to four real calls.

### Fixed
- The corner to the near post works again.

## 2026-09-26 – Club life, tactics and Android

### New
- **Three ways to play:** play yourself, manager in 3D, or the live ticker with decisions. In manager mode you shout instructions from the touchline.
- **Android app** and installable web app.
- **Club life:** decisions around the clubhouse with lasting consequences, a team chat that matters, club memory (former players at rivals, bogey teams, flashbacks), relationships on the pitch, opposing managers in the district paper, matchday surprises (referee missing, traffic jam, pitch double-booked, granny with cake).
- A season goal from the board with mid-term report, club museum with display case and honours board, season review as a district-paper special, generations (the club legend's son).
- Positional play and tactics: systems, playing styles, zonal defending.
- Crest editor, more names, professions with bonuses, sponsors and kit patterns; a title picture of Sunday morning on the village green.
- The default match length is 2 × 2 minutes, selectable up to 2 × 5.

### Improved
- Venue cards with their ground, particle effects per surface, player figures with a face, hairstyles and shirt numbers.
- Phone layout, and on weak devices effects switch off automatically.
- The AI plays forward with the ball instead of back to the goalkeeper; the goalkeeper only catches inside his own box.
- A long-term test over several seasons uncovered weaknesses in the cash flow and the competition, which were fixed.

## 2026-09-25 – The beginning

Day one: a prototype with a car-park match became a game with a career in one go.

### New
- **Venues:** backyard, city park, ash pitch, grass pitch, hall tournament in the winter break; 5-a-side and 7-a-side.
- **Career:** seasons in the Freizeitliga Kanalbezirk with promotion and relegation up to Kreisklasse B (with play-offs), transfers through the rumour mill, a team cash box with a fines catalogue, sponsors, a youth department, a clubhouse to expand, the regulars' pub, a summer city championship.
- **Life stories:** events with many outcomes, derbies, relationship drama, long-term stories (selling the ground, anniversary, merger) and the end of a career with a successor.
- Weather and seasons, match incidents (dog, fence, car alarm, police, thunderstorm, sprinkler, stand-in referee), hobby referees with cards.
- A complete **English translation** with language choice, saves with three slots plus export and import.
- Live ticker for simulated matches, designing free kicks and corners yourself, penalty shoot-outs in the tournament.

### Improved
- The feel of play: active teammates, real passing with aiming help, a goalkeeper with reaction time, a more compact defence, one-on-ones.
- Graphics: contact shadows, colour correction, weather looks, backlight.
