import { describe, it, expect } from 'vitest'
import { migrateData, SCHEMA_VERSION } from '../lib/storage-migration.js'

describe('migrateData — v1 → v2 schema with explicit `mode`', () => {
  it('turns undefined/absent data into v2 defaults in system mode', () => {
    const result = migrateData(undefined)
    expect(result.version).toBe(SCHEMA_VERSION)
    expect(result.mode).toBe('system')
    expect(result.profiles).toEqual([])
    expect(result.activeProfileId).toBeUndefined()
  })

  it('turns empty object into v2 defaults in system mode', () => {
    const result = migrateData({})
    expect(result.version).toBe(SCHEMA_VERSION)
    expect(result.mode).toBe('system')
    expect(result.profiles).toEqual([])
  })

  it('maps v1 with valid activeProfileId to mode="profile"', () => {
    const v1 = {
      version: 1,
      profiles: [{ id: 'p1', name: 'A' }],
      activeProfileId: 'p1',
      settings: { bypassList: ['localhost'] }
    }
    const result = migrateData(v1)
    expect(result.version).toBe(SCHEMA_VERSION)
    expect(result.mode).toBe('profile')
    expect(result.activeProfileId).toBe('p1')
    expect(result.profiles).toEqual([{ id: 'p1', name: 'A' }])
    expect(result.settings).toEqual({ bypassList: ['localhost'] })
  })

  it('maps v1 with no activeProfileId to mode="system"', () => {
    const v1 = { version: 1, profiles: [{ id: 'p1', name: 'A' }], activeProfileId: undefined }
    const result = migrateData(v1)
    expect(result.mode).toBe('system')
    expect(result.activeProfileId).toBeUndefined()
  })

  it('drops a stale activeProfileId that no longer points at a profile', () => {
    const v1 = {
      version: 1,
      profiles: [{ id: 'p1', name: 'A' }],
      activeProfileId: 'ghost'
    }
    const result = migrateData(v1)
    expect(result.mode).toBe('system')
    expect(result.activeProfileId).toBeUndefined()
  })

  it('passes through already-v2 data in profile mode unchanged', () => {
    const v2 = {
      version: 2,
      mode: 'profile',
      profiles: [{ id: 'p1' }],
      activeProfileId: 'p1',
      settings: {}
    }
    const result = migrateData(v2)
    expect(result).toEqual(v2)
  })

  it('passes through already-v2 data in direct mode unchanged', () => {
    const v2 = {
      version: 2,
      mode: 'direct',
      profiles: [],
      activeProfileId: undefined,
      settings: {}
    }
    const result = migrateData(v2)
    expect(result.mode).toBe('direct')
    expect(result.version).toBe(SCHEMA_VERSION)
  })

  it('passes through already-v2 data in system mode unchanged', () => {
    const v2 = {
      version: 2,
      mode: 'system',
      profiles: [{ id: 'p1' }],
      activeProfileId: undefined,
      settings: {}
    }
    const result = migrateData(v2)
    expect(result.mode).toBe('system')
  })

  it('downgrades v2 mode="profile" with stale activeProfileId to "system"', () => {
    const stale = {
      version: 2,
      mode: 'profile',
      profiles: [{ id: 'p1' }],
      activeProfileId: 'ghost',
      settings: {}
    }
    const result = migrateData(stale)
    expect(result.mode).toBe('system')
    expect(result.activeProfileId).toBeUndefined()
  })

  it('downgrades v2 mode="profile" with undefined activeProfileId to "system"', () => {
    const stale = {
      version: 2,
      mode: 'profile',
      profiles: [{ id: 'p1' }],
      activeProfileId: undefined,
      settings: {}
    }
    const result = migrateData(stale)
    expect(result.mode).toBe('system')
    expect(result.activeProfileId).toBeUndefined()
  })

  it('coerces an unknown mode string in v2 data to "system"', () => {
    const bad = {
      version: 2,
      mode: 'wat',
      profiles: [],
      activeProfileId: undefined,
      settings: {}
    }
    const result = migrateData(bad)
    expect(result.mode).toBe('system')
  })

  it('preserves settings object when migrating from v1', () => {
    const v1 = {
      version: 1,
      profiles: [],
      activeProfileId: undefined,
      settings: { notifyChange: false, bypassList: ['*.local'] }
    }
    const result = migrateData(v1)
    expect(result.settings).toEqual({ notifyChange: false, bypassList: ['*.local'] })
  })
})
