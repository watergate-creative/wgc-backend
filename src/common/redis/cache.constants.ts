export const EVENT_CACHE = {
  /** Dynamic key: events:list:<hash-of-query-params> */
  LIST_PREFIX: 'events:list:',
  /** Static key: events:upcoming:<limit> */
  UPCOMING_PREFIX: 'events:upcoming:',
  /** Static key: events:detail:<uuid> */
  DETAIL_PREFIX: 'events:detail:',
  /** Static key: events:slug:<slug-string> */
  SLUG_PREFIX: 'events:slug:',
  /** Top-level namespace for bulk invalidation via SCAN */
  NAMESPACE: 'events:',

  /** 24 hours — events rarely mutate; cron handles daily expiration */
  TTL_SEC: 86400,
} as const;

export const PARTICIPANT_CACHE = {
  /** Dynamic key: participants:event:<eventId>:<hash-of-query-params> */
  LIST_PREFIX: 'participants:event:',
  /** Dynamic key: participants:lookup:<email>:<hash-of-query-params> */
  LOOKUP_PREFIX: 'participants:lookup:',
  /** Top-level namespace for bulk invalidation via SCAN */
  NAMESPACE: 'participants:',

  /** 2 minutes — registrations are write-heavy; dashboards need fresh data */
  TTL_SEC: 120,
} as const;
