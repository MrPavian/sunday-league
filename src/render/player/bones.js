// Skelett der Spielerfigur: Knochennamen, Eltern und Maßstab ausgeblendeter Teile.
export const BONES = ['root', 'hips', 'spine', 'head', 'upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'upperLegL', 'lowerLegL', 'footL', 'upperLegR', 'lowerLegR', 'footR', 'hood'];
export const HIDDEN = 0.001; // Maßstab ausgeblendeter Teile (Trikot über dem Kopf)
// Nur der Schiri hat drei Knochen mehr: Gelbe und Rote Karte in der Faust, Notizbuch in der Linken (je ein Quader im selben
// Netz, ausgeblendet bis zur Geste – keine zusätzlichen Draw Calls).
export const REF_BONES = ['cardY', 'cardR', 'book'];
export const ALL_BONES = [...BONES, ...REF_BONES];
export const B = Object.fromEntries(ALL_BONES.map((n, i) => [n, i]));
export const PARENT = { cardY: 'lowerArmR', cardR: 'lowerArmR', book: 'lowerArmL', hips: 'root', spine: 'hips', head: 'spine', upperArmL: 'spine', lowerArmL: 'upperArmL', upperArmR: 'spine', lowerArmR: 'upperArmR', upperLegL: 'hips', lowerLegL: 'upperLegL', footL: 'lowerLegL', upperLegR: 'hips', lowerLegR: 'upperLegR', footR: 'lowerLegR', hood: 'head' };
