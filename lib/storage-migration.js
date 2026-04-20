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

  if (data.version === SCHEMA_VERSION && VALID_MODES.has(data.mode)) {
    return {
      version: SCHEMA_VERSION,
      mode: data.mode,
      profiles,
      activeProfileId: data.mode === 'profile' ? data.activeProfileId : undefined,
      settings,
    };
  }

  const activeMatches = data.activeProfileId
    && profiles.some(p => p && p.id === data.activeProfileId);

  return {
    version: SCHEMA_VERSION,
    mode: activeMatches ? 'profile' : 'system',
    profiles,
    activeProfileId: activeMatches ? data.activeProfileId : undefined,
    settings,
  };
}
