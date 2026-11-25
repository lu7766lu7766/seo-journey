/** Schedule activity ids (plan §2.4). Numbers/effects live in src/content/activities.ts (P2). */
export const ACTIVITY_IDS = ['write', 'research', 'techcheck', 'schema', 'qa', 'authors', 'social', 'rest'] as const
export type ActivityId = (typeof ACTIVITY_IDS)[number]
