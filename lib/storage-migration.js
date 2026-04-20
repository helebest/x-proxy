// Storage schema migration for X-Proxy.
// Converts any x-proxy-data payload (legacy, current, or absent) into the
// canonical v2 shape with an explicit `mode` field: 'direct' | 'system' | 'profile'.
//
// v1 → v2: infer `mode` from `activeProfileId`.
//   activeProfileId matches a profile → mode='profile'
//   otherwise (undefined, or stale) → mode='system' and activeProfileId dropped

export const SCHEMA_VERSION = 2;
const VALID_MODES = new Set(['direct', 'system', 'profile']);

export function migrateData(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];
  const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};

  // 'profile' mode is only sound when activeProfileId still points at a real
  // profile. This check is applied uniformly to both v1 inference and v2
  // passthrough so stale v2 state (e.g. a window where options.js cleared
  // activeProfileId but didn't update mode yet) can't initialize the service
  // worker into mode='profile' + activeProfile=null.
  const activeIdValid = data.activeProfileId
    && profiles.some(p => p && p.id === data.activeProfileId);

  let mode;
  if (data.version === SCHEMA_VERSION && VALID_MODES.has(data.mode)) {
    mode = data.mode === 'profile' && !activeIdValid ? 'system' : data.mode;
  } else {
    mode = activeIdValid ? 'profile' : 'system';
  }

  return {
    version: SCHEMA_VERSION,
    mode,
    profiles,
    activeProfileId: mode === 'profile' ? data.activeProfileId : undefined,
    settings,
  };
}
