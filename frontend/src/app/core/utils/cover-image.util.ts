/**
 * Images de couverture par défaut (dossier public/assets/images), utilisées
 * quand un quiz ou un cours n'a pas d'image ou que son URL ne se charge pas.
 */
export const DEFAULT_QUIZ_COVER = 'assets/images/QuestionHead.jpg';
export const DEFAULT_COURSE_COVER = 'assets/images/image1.jpg';

/**
 * Valeur CSS `background-image` : la couverture est superposée à l'image par
 * défaut, qui reste visible si la couverture est absente ou en erreur.
 */
export function coverBackground(url: string | null | undefined, fallback: string): string {
  const safe = (value: string) => value.replace(/"/g, '%22');
  return url ? `url("${safe(url)}"), url("${fallback}")` : `url("${fallback}")`;
}
