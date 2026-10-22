// Kennzahl und erwartete Richtung je Befehl (+1 = steigt, −1 = sinkt).
export const EXPECT = {
  'build:halten': [['pPerMin', -1], ['longs', -1]], // longs statt longShare: mit mehr kurzen Pässen sinkt der Anteil schon durch den Nenner
  'build:kurz': [['passLen', -1], ['longShare', -1]],
  'build:direkt': [['passLen', 1], ['longShare', 1]],
  'route:aussen': [['ownWide', 1], ['crosses', 1]],
  'route:mitte': [['ownWide', -1], ['crosses', -1]],
  'route:tiefe': [['through', 1]], // fwdAhead entfällt: die Spitze steht ohnehin an der letzten Linie des Gegners (Abseitsgrenze)
  'route:kombi': [['combos', 1]],
  'route:konter': [['defX', -1], ['through', 1]],
  'side:left': [['ownLeft', 1]],
  'side:right': [['ownRight', 1]],
  'press:hoch': [['defX', 1], ['winsHigh', 1]],
  'press:mittel': [['defX', 1]], // Mittelblock: zwischen Standard und hohem Pressing; Ballgewinne nach Drittel sind zu grob (60 % liegen ohnehin außerhalb des eigenen Drittels)
  'press:tief': [['defX', -1], ['winsHigh', -1]],
  'guard:aussen': [['oppWide', 1]],
  'guard:zentrum': [['oppWide', 1]],
  'guard:konter': [['countersAg', -1]],
  'cover:left': [['blockZ', -1]], // Block schiebt zur Seite (Meter). Der Anteil der Gegnerangriffe über diese Seite sinkt dadurch nicht: das Spiel folgt dem Block (gemessen)
  'cover:right': [['blockZ', 1]],
  'shape:aufruecken': [['midX', 1]],
  'shape:kompakt': [['lenDef', -1]],
  'shape:stuermer_fallen': [['fwdAhead', -1]],
  'tempo:ruhig': [['pPerMin', -1], ['stamina', 1]],
  'tempo:schnell': [['pPerMin', 1]],
  'risk:sicher': [['shots', -1], ['through', -1]],
  'risk:aggressiv': [['shots', 1], ['through', 1]],
  'simple:angreifen': [['midX', 1], ['shots', 1]],
  'simple:absichern': [['defX', -1], ['countersAg', -1]],
  'simple:pressing': [['defX', 1], ['winsHigh', 1]],
  'simple:konter': [['defX', -1], ['through', 1]],
  'simple:halten': [['pPerMin', -1]],
  'simple:fluegel': [['ownWide', 1], ['crosses', 1]],
  'mentality:offensive': [['midX', 1], ['defX', 1]],
  'mentality:defensive': [['midX', -1], ['defX', -1]],
};
