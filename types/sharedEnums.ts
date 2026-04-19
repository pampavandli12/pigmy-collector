export const Status = {
  Idle: 'Idle',
  Loading: 'Loafing',
  Success: 'Success',
  Error: 'Error',
} as const;
export type Status = (typeof Status)[keyof typeof Status];
