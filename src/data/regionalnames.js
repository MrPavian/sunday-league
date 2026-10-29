// Regionale Vor- und Nachnamen je Bundesland (vom Nutzer gewünscht, 2026-10-29: „Xaver kommt in Bayern öfter vor als in
// Niedersachsen“). Gilt nur in Karrieren mit gewähltem Landesverband und nur für Personen mit deutschem Nachnamen.
//
// Nachnamen: die 50 Namen mit dem höchsten Überrepräsentations-Faktor je Bundesland laut namenskarte.com
// (https://www.namenskarte.com/bundesland/<land>, Schätzdaten aus Telefonbucheinträgen, Datenstand laut Seite unbekannt;
// abgerufen 2026-10-29). Bremen: nur die ersten 20 – weiter hinten ist die Liste fast nur alphabetisch S–Z, vermutlich ein
// Fehler der Seite.
// Vornamen: Namen, die laut beliebte-vornamen.de im Bundesland „besonders häufig vor[kommen]“, Geburtsjahrgang 2020
// (https://www.beliebte-vornamen.de/jahrgang/j2020/laender2020, abgerufen 2026-10-29), hier nur die Jungennamen; für das
// Saarland gab es zu wenige Meldungen. Für ältere Jahrgänge fand sich keine regionale Quelle; auf Wunsch des Nutzers
// (2026-10-29: „Auch für Ältere“) bekommen Ältere (ab 28) die Namen aus TIMELESS – EINSCHÄTZUNG, kein Messwert: Namen, die auch
// vor 2000 schon gebräuchlich waren. Modenamen der 2020er (Fiete, Jonte, Bosse, Luke, Pepe …) bleiben den Jungen.
export const REGION_NAMES = {
  'Baden-Württemberg': {
    last: ['Armbruster', 'Bühler', 'Haug', 'Eisele', 'Schweizer', 'Sauter', 'Wörner', 'Rapp', 'Walz', 'Kohler', 'Benz', 'Ruf', 'Baur', 'Haag', 'Mack', 'Straub', 'Hauser', 'Buck', 'Maier', 'Hummel', 'Geiger', 'Schmid', 'Frey', 'Metzger', 'Brenner', 'Strobel', 'Kurz', 'Binder', 'Merz', 'Zeller', 'Bader', 'Fritz', 'Vollmer', 'Wahl', 'Mayer', 'Lutz', 'Moser', 'Link', 'Kern', 'Weiss', 'Rieger', 'Löffler', 'Beck', 'Haas', 'Kopp', 'Ott', 'Hermann', 'Frank', 'Baumann', 'Fink'],
    first: ['David', 'Diego', 'Samuel'],
  },
  Bayern: {
    last: ['Mayr', 'Obermeier', 'Mühlbauer', 'Vogl', 'Hartl', 'Brandl', 'Schweiger', 'Seidl', 'Wimmer', 'Lehner', 'Riedl', 'Eder', 'Lechner', 'Stadler', 'Koller', 'Baumgartner', 'Wittmann', 'Fleischmann', 'Endres', 'Brunner', 'Huber', 'Popp', 'Gruber', 'Karl', 'Raab', 'Schaller', 'Seitz', 'Auer', 'Kraus', 'Beer', 'Wiedemann', 'Wild', 'Bauer', 'Götz', 'Rauch', 'Betz', 'Kolb', 'Bayer', 'Schuster', 'Schwab', 'Neubauer', 'Miller', 'Albert', 'Renner', 'Wirth', 'Baier', 'Graf', 'Böhm', 'Stark', 'Meier'],
    first: ['Josef', 'Korbinian', 'Xaver'],
  },
  Berlin: {
    last: ['Gericke', 'Fechner', 'Mielke', 'Behrendt', 'Höhne', 'Lück', 'Michaelis', 'Borchert', 'Gehrke', 'Janke', 'Giese', 'Lemke', 'Marquardt', 'Arndt', 'Erdmann', 'Hensel', 'Meißner', 'Krause', 'Böttcher', 'Hartwig', 'Linke', 'Haase', 'Lange', 'Großmann', 'Hildebrandt', 'Hübner', 'Hoppe', 'Klose', 'Bartsch', 'Döring', 'Hein', 'Heinrich', 'Albrecht', 'Hoffmann', 'Lenz', 'Fuhrmann', 'Henke', 'Herrmann', 'Krebs', 'Fröhlich', 'Berg', 'Hirsch', 'Horn', 'Gärtner', 'Hahn', 'Nagel', 'Eckert', 'Hartmann', 'Ernst', 'Kaiser'],
    first: ['Maxim', 'Theodor', 'Valentin'],
  },
  Brandenburg: {
    last: ['Konzack', 'Haseloff', 'Krautz', 'Niendorf', 'Paulick', 'Buder', 'Jank', 'Jurisch', 'Noack', 'Sydow', 'Bölke', 'Jurk', 'Matschke', 'Wernicke', 'Redlich', 'Winzer', 'Lehmann', 'Tietz', 'Lieske', 'Thiede', 'Pfennig', 'Steinborn', 'Donath', 'Schultze', 'Brose', 'Kube', 'Dräger', 'Falkenberg', 'Wendland', 'Reschke', 'Henschel', 'Nitschke', 'Schulz', 'Paschke', 'Schüler', 'Zech', 'Thiele', 'Raschke', 'Rettig', 'Teichert', 'Rösler', 'Sasse', 'Kleemann', 'Neumann', 'Heide', 'Pusch', 'Preuß', 'Lukas', 'Reimann', 'Schiller'],
    first: ['Bruno', 'Till', 'Willi'],
  },
  Bremen: {
    last: ['Stehmeier', 'Wagschal', 'Wendelken', 'Warnken', 'Stelljes', 'Seebeck', 'Tietjen', 'Döscher', 'Wellbrock', 'Wohlers', 'Siemer', 'Stöver', 'Wilkens', 'Siemers', 'Stelter', 'Wiechmann', 'Wessels', 'Warnke', 'Timmermann', 'Wolters'],
    first: ['Jarle', 'Osman', 'Piet', 'Prince', 'Tammo', 'Tjark'],
  },
  Hamburg: {
    last: ['Timmann', 'Schwartau', 'Buhk', 'Hinsch', 'Ladiges', 'Riecken', 'Griem', 'Westphalen', 'Bestmann', 'Rieper', 'Schween', 'Garbers', 'Koops', 'Cords', 'Fock', 'Krogmann', 'Behn', 'Burmester', 'Behncke', 'Soltau', 'Brügmann', 'Diercks', 'Maack', 'Behrmann', 'Eggers', 'Ellerbrock', 'Pein', 'Lühmann', 'Mecklenburg', 'Heitmann', 'Lüdemann', 'Peper', 'Schulenburg', 'Flügge', 'Eckhoff', 'Lüders', 'Joost', 'Kröger', 'Quast', 'Matthies', 'Buhr', 'Freytag', 'Dehn', 'Rump', 'Schroeder', 'Behr', 'Ross', 'Kaya', 'Busch', 'Rasch'],
    first: ['Fiete', 'Jonte', 'Piet'],
  },
  Hessen: {
    last: ['Euler', 'Debus', 'Weitzel', 'Lotz', 'Weil', 'Ruppel', 'Rühl', 'Reitz', 'Diehl', 'Heil', 'Herbert', 'Wiegand', 'Eckhardt', 'Henrich', 'Hohmann', 'Schaub', 'Noll', 'Fey', 'Muth', 'Petri', 'Ruppert', 'Damm', 'Appel', 'Pfaff', 'Krug', 'Bernhardt', 'Faust', 'Röder', 'Göbel', 'Schäfer', 'Keil', 'Sattler', 'Michel', 'Kraft', 'Volk', 'Hess', 'Dietz', 'Stumpf', 'Nickel', 'Metz', 'Völker', 'Pfeifer', 'Hofmann', 'Jakob', 'Sauer', 'Kremer', 'Schott', 'Jäger', 'Pfeiffer', 'Roth'],
    first: ['Arian', 'Luke', 'Silas'],
  },
  'Mecklenburg-Vorpommern': {
    last: ['Dinse', 'Schult', 'Schuldt', 'Saß', 'Heiden', 'Nehls', 'Dettmann', 'Burmeister', 'Lembke', 'Behm', 'Mahnke', 'Holtz', 'Roloff', 'Köhn', 'Pagel', 'Rieck', 'Boldt', 'Ewert', 'Jahnke', 'Schultz', 'Westphal', 'Drews', 'Wegner', 'Behnke', 'Reinke', 'Haack', 'Mundt', 'Ehlert', 'Rohde', 'Stegemann', 'Krüger', 'Hacker', 'Niemann', 'Maaß', 'Radtke', 'Lau', 'Eggert', 'Berndt', 'Holz', 'Zander', 'Block', 'Schröder', 'Bremer', 'Brandt', 'Hagemann', 'Hagen', 'Buchholz', 'Freitag', 'Köster', 'Rose'],
    first: ['Fiete', 'Friedrich', 'Fritz'],
  },
  Niedersachsen: {
    last: ['Saathoff', 'Frerichs', 'Eilers', 'Gerdes', 'Brandes', 'Schaper', 'Borchers', 'Hinrichs', 'Cordes', 'Janssen', 'Warnecke', 'Bruns', 'Harms', 'Schrader', 'Lampe', 'Albers', 'Niemeyer', 'Ahlers', 'Freese', 'Behrens', 'Ahrens', 'Janßen', 'Bartels', 'Fricke', 'Bode', 'Schütte', 'Reinecke', 'Heuer', 'Otten', 'Oppermann', 'Dreyer', 'Pape', 'Diekmann', 'Grote', 'Meyer', 'Menke', 'Brockmann', 'Otte', 'Bertram', 'Kuhlmann', 'Korte', 'Brinkmann', 'Nolte', 'Brüggemann', 'Lohmann', 'Lindemann', 'Sander', 'Horstmann', 'Kramer', 'Bergmann'],
    first: ['Enno', 'Hanno', 'Jonte'],
  },
  'Nordrhein-Westfalen': {
    last: ['Dohmen', 'Schäfers', 'Hermanns', 'Hilgers', 'Hamacher', 'Beckers', 'Küppers', 'Esser', 'Giesen', 'Dahmen', 'Cremer', 'Krings', 'Franken', 'Küpper', 'Kersting', 'Tillmann', 'Schiffer', 'Wirtz', 'Frings', 'Schürmann', 'Kemper', 'Pütz', 'Faßbender', 'Brune', 'Schmitz', 'Jansen', 'Wortmann', 'Neuhaus', 'Schulte', 'Engels', 'Heinen', 'Büscher', 'Schnitzler', 'Schröer', 'Breuer', 'Kamp', 'Hölscher', 'Mertens', 'Heinrichs', 'Hülsmann', 'Budde', 'Kleine', 'Hillebrand', 'Janzen', 'Pieper', 'Beckmann', 'Feldmann', 'Biermann', 'Heimann', 'Hecker'],
    first: ['Adam', 'Phil', 'Tom'],
  },
  'Rheinland-Pfalz': {
    last: ['Geib', 'Kuntz', 'Hammes', 'Theisen', 'Christmann', 'Klöckner', 'Laux', 'Theis', 'Oster', 'Best', 'Michels', 'Weiler', 'Henn', 'Adams', 'Knopp', 'Roos', 'Meurer', 'Seibel', 'Reis', 'Orth', 'Hauck', 'Franzen', 'Thelen', 'Zöller', 'Weis', 'Wendel', 'Doll', 'Schüller', 'Christ', 'Heinz', 'Bender', 'Schaaf', 'Heck', 'Reinhard', 'Schlosser', 'Hammer', 'May', 'Born', 'Römer', 'Dick', 'Faber', 'Münch', 'Kohl', 'Ackermann', 'Rausch', 'Blum', 'Schneider', 'Reuter', 'Sturm', 'Krieger'],
    first: ['Kilian', 'Robin', 'Samuel'],
  },
  Saarland: {
    last: ['Recktenwald', 'Altmeyer', 'Speicher', 'Meiser', 'Jochum', 'Backes', 'Theobald', 'Baltes', 'Brill', 'Kiefer', 'Neu', 'Lauer', 'Welsch', 'Paulus', 'Zimmer', 'Fries', 'Dörr', 'Scherer', 'Maas', 'Kirsch', 'Rupp', 'Schmitt', 'Groß', 'Jost', 'Bach', 'Jung', 'Klein', 'Wilhelm', 'Maurer', 'Marx', 'Kuhn', 'Krämer', 'Kunz', 'Engel', 'Becker', 'Mohr', 'Ziegler', 'Paul', 'Simon', 'Barth', 'Wagner', 'Schwarz', 'Martin', 'Stein', 'Lang', 'Schumacher', 'Braun', 'Keller', 'Fuchs', 'Müller'],
    first: [],
  },
  Sachsen: {
    last: ['Uhlig', 'Kretzschmar', 'Dietze', 'Fritzsche', 'Petzold', 'Schöne', 'Neubert', 'Böhme', 'Börner', 'Hempel', 'Frenzel', 'Naumann', 'Reichel', 'Seifert', 'Richter', 'Rothe', 'Geißler', 'Kunze', 'Kluge', 'Seidel', 'Schubert', 'Walther', 'Schumann', 'Dittrich', 'Hennig', 'Rudolph', 'Riedel', 'Heinze', 'Förster', 'Unger', 'Lindner', 'Winkler', 'Fiedler', 'Günther', 'Menzel', 'Beyer', 'Lorenz', 'Arnold', 'Büttner', 'Ebert', 'Scholz', 'Thomas', 'Schramm', 'Langer', 'Friedrich', 'Berger', 'Schindler', 'Dietrich', 'Schreiber', 'Pohl'],
    first: ['Arthur', 'Gustav', 'Kurt'],
  },
  'Sachsen-Anhalt': {
    last: ['Helmecke', 'Elze', 'Fehse', 'Könnecke', 'Ecke', 'Bethge', 'Bahn', 'Köppe', 'Reinicke', 'Heinecke', 'Stolze', 'Haberland', 'Heinicke', 'Braune', 'Kühne', 'Möhring', 'Hinze', 'Schulze', 'Knopf', 'Matthias', 'Kersten', 'Schütze', 'Meinecke', 'Grunert', 'Mewes', 'Bohne', 'Ebeling', 'Zabel', 'Große', 'Henze', 'Laue', 'Falke', 'Fritsche', 'Buchmann', 'Bollmann', 'Huth', 'Schröter', 'Bosse', 'Busse', 'Kunert', 'Heyer', 'Franke', 'Blume', 'Heine', 'Baumgarten', 'Herbst', 'Jordan', 'Finke', 'Klaus', 'Nowak'],
    first: ['Carlo', 'Pepe', 'Willi'],
  },
  'Schleswig-Holstein': {
    last: ['Carstensen', 'Brodersen', 'Nissen', 'Andresen', 'Thomsen', 'Jürgensen', 'Matthiesen', 'Lorenzen', 'Christiansen', 'Clausen', 'Hinrichsen', 'Jessen', 'Jensen', 'Petersen', 'Johannsen', 'Jacobsen', 'Nielsen', 'Paulsen', 'Frahm', 'Hansen', 'Reimers', 'Bruhn', 'Carstens', 'Kühl', 'Holst', 'Haß', 'Krohn', 'Kock', 'Ehlers', 'Sievers', 'Wulff', 'Schütt', 'Timm', 'Groth', 'Wulf', 'Harder', 'Martens', 'Voß', 'Witt', 'Hamann', 'Evers', 'Kruse', 'Steffen', 'Möller', 'Reimer', 'Hinz', 'Schlüter', 'Jürgens', 'Peters', 'Bock'],
    first: ['Bosse', 'Jonte', 'Lasse'],
  },
  Thüringen: {
    last: ['Seyfarth', 'Baumbach', 'Schuchardt', 'Dietzel', 'Kaufhold', 'Töpfer', 'Kästner', 'Bergner', 'Eckardt', 'Büchner', 'Wolfram', 'Apel', 'Ehrhardt', 'Hopf', 'Hartung', 'Weise', 'Kirchner', 'Heß', 'Reinhardt', 'Eichhorn', 'Kellner', 'Jahn', 'Brückner', 'Eberhardt', 'Henning', 'Heinemann', 'Burkhardt', 'Kühn', 'John', 'Henkel', 'Schade', 'Bachmann', 'Gebhardt', 'Hesse', 'Gerlach', 'Otto', 'Köhler', 'Kaufmann', 'Ludwig', 'Schilling', 'Bischoff', 'Engelhardt', 'König', 'Koch', 'Heller', 'Grimm', 'Steiner', 'Schmidt', 'Ritter', 'Fischer'],
    first: ['Franz', 'Friedrich', 'Gustav'],
  },
};

// Ältere Jahrgänge: nur diese Namen aus den Listen oben (Einschätzung, siehe oben).
export const TIMELESS = new Set(['Josef', 'Korbinian', 'Xaver', 'David', 'Samuel', 'Theodor', 'Valentin', 'Bruno', 'Till', 'Willi', 'Piet', 'Tammo', 'Tjark', 'Friedrich', 'Fritz', 'Enno', 'Hanno', 'Adam', 'Tom', 'Kilian', 'Robin', 'Arthur', 'Gustav', 'Kurt', 'Franz']);
