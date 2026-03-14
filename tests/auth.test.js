import { describe, it, expect } from 'vitest'

/**
 * Auth handler logic extracted from background.js for testing.
 * This pure function handles proxy authentication via chrome.webRequest.onAuthRequired.
 */
function handleAuthRequired(details, activeProfile) {
  if (!details.isProxy || !activeProfile) return {};
  const auth = activeProfile.config?.auth;
  if (!auth || !auth.username) return {};
  return { authCredentials: { username: auth.username, password: auth.password } };
}

describe('handleAuthRequired', () => {
  it('should return credentials when auth exists and isProxy is true', () => {
    const details = { isProxy: true };
    const profile = {
      config: { auth: { username: 'user1', password: 'pass1' } }
    };
    const result = handleAuthRequired(details, profile);
    expect(result).toEqual({
      authCredentials: { username: 'user1', password: 'pass1' }
    });
  });

  it('should return empty object when activeProfile is null', () => {
    const details = { isProxy: true };
    const result = handleAuthRequired(details, null);
    expect(result).toEqual({});
  });

  it('should return empty object when username is empty', () => {
    const details = { isProxy: true };
    const profile = {
      config: { auth: { username: '', password: '' } }
    };
    const result = handleAuthRequired(details, profile);
    expect(result).toEqual({});
  });

  it('should return empty object when isProxy is false', () => {
    const details = { isProxy: false };
    const profile = {
      config: { auth: { username: 'user1', password: 'pass1' } }
    };
    const result = handleAuthRequired(details, profile);
    expect(result).toEqual({});
  });

  it('should return correct username and password values', () => {
    const details = { isProxy: true };
    const profile = {
      config: { auth: { username: 'myuser', password: 'mypass123' } }
    };
    const result = handleAuthRequired(details, profile);
    expect(result.authCredentials.username).toBe('myuser');
    expect(result.authCredentials.password).toBe('mypass123');
  });

  it('should return empty object when auth is undefined', () => {
    const details = { isProxy: true };
    const profile = { config: {} };
    const result = handleAuthRequired(details, profile);
    expect(result).toEqual({});
  });

  it('should return empty object when config is undefined', () => {
    const details = { isProxy: true };
    const profile = {};
    const result = handleAuthRequired(details, profile);
    expect(result).toEqual({});
  });
});
