// Frauenvornamen nach Geburtsjahrgang (Frauenteam, women.js): die 20 häufigsten ersten Vornamen der Mädchen je Jahrgang,
// Rangliste von Knud Bielefeld (keine amtliche Statistik; Auswertung von Geburtsmeldungen), abgerufen 2026-10-29:
// https://www.beliebte-vornamen.de/jahrgang/j1985 (…/j1990, j1995, j2000, j2005, j2010).
// Gewählt wird die Liste des nächstgelegenen Jahrgangs; Englisch nimmt die englische Liste (origins.js girlName).
export const GIRLS_BY_YEAR = {
  1985: ['Julia', 'Stefanie', 'Jennifer', 'Katharina', 'Sarah', 'Anna', 'Sandra', 'Katrin', 'Nadine', 'Franziska', 'Christina', 'Claudia', 'Jessica', 'Nina', 'Annika', 'Melanie', 'Carolin', 'Daniela', 'Christin', 'Nicole'],
  1990: ['Julia', 'Sarah', 'Jennifer', 'Katharina', 'Lisa', 'Christina', 'Jessica', 'Anna', 'Laura', 'Melanie', 'Sabrina', 'Vanessa', 'Nadine', 'Janina', 'Sandra', 'Annika', 'Nina', 'Stefanie', 'Franziska', 'Jana'],
  1995: ['Laura', 'Anna', 'Sarah', 'Julia', 'Lisa', 'Lena', 'Katharina', 'Jana', 'Annika', 'Jennifer', 'Alina', 'Jessica', 'Marie', 'Sophie', 'Vanessa', 'Nina', 'Jasmin', 'Michelle', 'Luisa', 'Kim'],
  2000: ['Anna', 'Lea', 'Sarah', 'Hannah', 'Michelle', 'Laura', 'Lisa', 'Lara', 'Lena', 'Julia', 'Johanna', 'Marie', 'Leonie', 'Annika', 'Katharina', 'Sophie', 'Antonia', 'Emily', 'Alina', 'Melina'],
  2005: ['Leonie', 'Hannah', 'Anna', 'Lea', 'Lena', 'Laura', 'Emily', 'Lara', 'Sophie', 'Marie', 'Julia', 'Sarah', 'Lilly', 'Emma', 'Lina', 'Johanna', 'Nele', 'Alina', 'Luisa', 'Sophia'],
  2010: ['Mia', 'Hannah', 'Lena', 'Lea', 'Emma', 'Anna', 'Leonie', 'Lilly', 'Emily', 'Lina', 'Laura', 'Marie', 'Sarah', 'Sophia', 'Lara', 'Sophie', 'Maja', 'Amelie', 'Luisa', 'Johanna'],
};
const YEARS = Object.keys(GIRLS_BY_YEAR).map(Number);
export const girlsOfYear = (year) => GIRLS_BY_YEAR[YEARS.reduce((best, y) => (Math.abs(y - year) < Math.abs(best - year) ? y : best), YEARS[0])];
