/** Capital de départ de l'utilisateur, en euros */
export const INITIAL_CAPITAL_EUR = 1000;

/** Objectif net par jour (lundi–vendredi), en euros */
export const OBJECTIF_QUOTIDIEN_EUR = 100;

/** Part versée au trader sur le net (0–1). 30% = 0.3 */
export const TRADER_PERCENT = 0.3;

/** Jours ouvrés : 1 = lundi, 5 = vendredi */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Nombre de jours ouvrés dans le mois (lun–ven) */
export function getWorkingDaysInMonth(year: number, month: number): number {
  let count = 0;
  const d = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  while (d <= last) {
    if (isWorkingDay(d)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Objectif mensuel = 100 € × nombre de jours ouvrés du mois */
export function getObjectifMensuel(year: number, month: number): number {
  return OBJECTIF_QUOTIDIEN_EUR * getWorkingDaysInMonth(year, month);
}

/** Part trader pour un net donné (30% du net si > 0) */
export function getTraderShare(net: number): number {
  return Math.max(0, net) * TRADER_PERCENT;
}
