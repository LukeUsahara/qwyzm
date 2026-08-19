export interface Clock {
  /** High-resolution local time. Typically `performance.now()`. */
  now(): number;
}

/**
 * Shared-timeline clock. `syncedNow()` is comparable across devices
 * after `offsetMs` is established. Solo play uses offset 0.
 *
 * `offsetMs` means: synced = local + offsetMs
 */
export interface SyncedClock extends Clock {
  readonly offsetMs: number;
  syncedNow(): number;
  toSynced(localNow: number): number;
  toLocal(syncedNow: number): number;
}

export function createPerformanceClock(): Clock {
  return {
    now: () => performance.now(),
  };
}

export function createOffsetSyncedClock(
  clock: Clock,
  offsetMs: number,
): SyncedClock {
  return {
    offsetMs,
    now: () => clock.now(),
    syncedNow: () => clock.now() + offsetMs,
    toSynced: (localNow) => localNow + offsetMs,
    toLocal: (syncedNow) => syncedNow - offsetMs,
  };
}

export function createLocalSyncedClock(
  clock: Clock = createPerformanceClock(),
): SyncedClock {
  return createOffsetSyncedClock(clock, 0);
}

export class FakeClock implements SyncedClock {
  localNow: number;
  offsetMs: number;

  constructor(localNow = 0, offsetMs = 0) {
    this.localNow = localNow;
    this.offsetMs = offsetMs;
  }

  now(): number {
    return this.localNow;
  }

  syncedNow(): number {
    return this.localNow + this.offsetMs;
  }

  toSynced(localNow: number): number {
    return localNow + this.offsetMs;
  }

  toLocal(syncedNow: number): number {
    return syncedNow - this.offsetMs;
  }

  advance(ms: number): void {
    this.localNow += ms;
  }

  set(localNow: number): void {
    this.localNow = localNow;
  }
}
