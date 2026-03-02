/** Capital de départ de l'utilisateur, en euros */
export const INITIAL_CAPITAL_EUR = 1000;

/** Objectif mensuel fixe : 2000 € */
export const OBJECTIF_MENSUEL_EUR = 2000;

/** Objectif net par jour : 100 € */
export const OBJECTIF_QUOTIDIEN_EUR = 100;

/** Jours ouvrés par mois : 5 jours/semaine × 4 semaines = 20 */
export const WORKING_DAYS_PER_MONTH = 20;

/** Part versée au trader sur le net (0–1). 30% = 0.3 */
export const TRADER_PERCENT = 0.3;

/** Jours ouvrés : 1 = lundi, 5 = vendredi */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Nombre de jours ouvrés dans le mois : toujours 20 (4 semaines × 5 jours) */
export function getWorkingDaysInMonth(_year: number, _month: number): number {
  return WORKING_DAYS_PER_MONTH;
}

/** Objectif mensuel fixe : 2000 € */
export function getObjectifMensuel(_year: number, _month: number): number {
  return OBJECTIF_MENSUEL_EUR;
}

/** Part trader pour un net donné (30% du net si > 0) */
export function getTraderShare(net: number): number {
  return Math.max(0, net) * TRADER_PERCENT;
}
