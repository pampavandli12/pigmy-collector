let syncing = false;
let rerunRequested = false;
let idleResolvers: (() => void)[] = [];

export function beginOutboxSync() {
  if (syncing) {
    rerunRequested = true;
    return false;
  }
  syncing = true;
  return true;
}

export function takeOutboxRerun() {
  if (!rerunRequested) return false;
  rerunRequested = false;
  return true;
}

export function endOutboxSync() {
  syncing = false;
  const resolvers = idleResolvers;
  idleResolvers = [];
  resolvers.forEach((resolve) => resolve());
}

export function resetOutboxSyncState() {
  syncing = false;
  rerunRequested = false;
  idleResolvers = [];
}

export function waitForOutboxIdle() {
  if (!syncing) return Promise.resolve();
  return new Promise<void>((resolve) => idleResolvers.push(resolve));
}
