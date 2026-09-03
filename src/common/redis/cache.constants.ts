export const EVENT_CACHE = {

  LIST_PREFIX: 'events:list:',

  UPCOMING_PREFIX: 'events:upcoming:',

  GROUPED_PREFIX: 'events:grouped:',

  DETAIL_PREFIX: 'events:detail:',

  SLUG_PREFIX: 'events:slug:',

  NAMESPACE: 'events:',


  TTL_SEC: 86400,
} as const;

export const PARTICIPANT_CACHE = {

  LIST_PREFIX: 'participants:event:',

  LOOKUP_PREFIX: 'participants:lookup:',

  NAMESPACE: 'participants:',


  TTL_SEC: 120,
} as const;
