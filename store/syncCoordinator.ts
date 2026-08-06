let syncing = false;
let idleResolvers: (() => void)[] = [];

export function beginOutboxSync() {
  if (syncing) return false;
  syncing = true;
  return true;
}

export function endOutboxSync() {
  syncing = false;
  const resolvers = idleResolvers;
  idleResolvers = [];
  resolvers.forEach((resolve) => resolve());
}

export function waitForOutboxIdle() {
  if (!syncing) return Promise.resolve();
  return new Promise<void>((resolve) => idleResolvers.push(resolve));
}
