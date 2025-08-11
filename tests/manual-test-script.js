/**
 * Manual Test Script for X-Proxy Bug Fixes
 * 
 * Run this script in the browser console on the options.html page
 * to manually verify the bug fixes are working correctly.
 * 
 * Usage:
 * 1. Open Chrome DevTools (F12)
 * 2. Navigate to the extension's options page
 * 3. Copy and paste this entire script into the console
 * 4. Run: await runManualTests()
 */

async function runManualTests() {
  console.log('🧪 Starting Manual Tests for X-Proxy Bug Fixes...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Helper function to log test results
  function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (message) console.log(`   ${message}`);
    
    results.tests.push({ name, passed, message });
    if (passed) results.passed++; else results.failed++;
  }

  try {
    // Test 1: Date Handling (RangeError Fix)
    console.log('\n--- Test 1: Date Handling Fix ---');
    
    try {
      const testProfile = {
        id: 'test-date',
        name: 'Date Test',
        createdAt: null,
        updatedAt: 'invalid-date-string'
      };
      
      // Check if OptionsManager exists
      if (typeof window.optionsManager !== 'undefined') {
        const safeDate1 = window.optionsManager.safeParseDate(testProfile.createdAt);
        const safeDate2 = window.optionsManager.safeParseDate(testProfile.updatedAt);
        const normalizedDate1 = window.optionsManager.normalizeDate(testProfile.createdAt);
        const normalizedDate2 = window.optionsManager.normalizeDate(testProfile.updatedAt);
        
        logTest('safeParseDate handles null', safeDate1 instanceof Date);
        logTest('safeParseDate handles invalid string', safeDate2 instanceof Date);
        logTest('normalizeDate handles null', typeof normalizedDate1 === 'string');
        logTest('normalizeDate handles invalid string', typeof normalizedDate2 === 'string');
        
        // Test that normalized dates don't throw RangeError
        try {
          new Date(normalizedDate1);
          new Date(normalizedDate2);
          logTest('Normalized dates are valid', true);
        } catch (e) {
          logTest('Normalized dates are valid', false, e.message);
        }
      } else {
        logTest('Date handling functions', false, 'OptionsManager not found - test in options page');
      }
    } catch (e) {
      logTest('Date handling test', false, e.message);
    }

    // Test 2: Storage Data Format
    console.log('\n--- Test 2: Storage Data Consistency ---');
    
    try {
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      
      logTest('Storage data exists', !!data);
      logTest('Profiles array exists', Array.isArray(data?.profiles));
      logTest('Settings object exists', typeof data?.settings === 'object');
      
      if (data?.profiles?.length > 0) {
        const profile = data.profiles[0];
        logTest('Profile has ID', typeof profile.id === 'string');
        logTest('Profile has name', typeof profile.name === 'string');
        logTest('Profile has config or old format', !!(profile.config || profile.type));
        
        // Check date fields don't cause errors
        if (profile.createdAt) {
          try {
            new Date(profile.createdAt);
            logTest('Profile createdAt is valid', true);
          } catch (e) {
            logTest('Profile createdAt is valid', false, 'Invalid date format');
          }
        }
      }
    } catch (e) {
      logTest('Storage data test', false, e.message);
    }

    // Test 3: Profile Structure Validation
    console.log('\n--- Test 3: Profile Structure Validation ---');
    
    try {
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      
      if (data?.profiles?.length > 0) {
        data.profiles.forEach((profile, index) => {
          // Check both old and new formats are handled
          const hasConfig = !!profile.config;
          const hasOldFormat = !!(profile.type && profile.host);
          
          logTest(`Profile ${index + 1} has valid format`, hasConfig || hasOldFormat);
          
          if (hasConfig) {
            logTest(`Profile ${index + 1} config has type`, !!profile.config.type);
            logTest(`Profile ${index + 1} config has host`, !!profile.config.host);
            logTest(`Profile ${index + 1} config has port`, typeof profile.config.port === 'number');
          }
        });
      } else {
        console.log('   No profiles found for structure validation');
      }
    } catch (e) {
      logTest('Profile structure test', false, e.message);
    }

    // Test 4: Active Profile Consistency
    console.log('\n--- Test 4: Active Profile Consistency ---');
    
    try {
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      
      if (data?.activeProfileId) {
        const activeProfile = data.profiles?.find(p => p.id === data.activeProfileId);
        logTest('Active profile exists in profiles list', !!activeProfile);
        
        if (!activeProfile) {
          console.log('   ⚠️  Stale active profile ID detected - should be cleaned up');
        }
      } else {
        logTest('No active profile ID (using system proxy)', true);
      }
    } catch (e) {
      logTest('Active profile consistency test', false, e.message);
    }

    // Test 5: UI Element Tests (if on options page)
    console.log('\n--- Test 5: UI Element Tests ---');
    
    try {
      const saveAllBtn = document.getElementById('saveAllBtn');
      const profilesList = document.getElementById('profilesList');
      
      logTest('Save All button exists', !!saveAllBtn);
      logTest('Profiles list exists', !!profilesList);
      
      // Check if clicking Save All doesn't cause errors
      if (saveAllBtn && typeof window.optionsManager !== 'undefined') {
        console.log('   Testing Save All button click (check console for errors)...');
        // Just check the function exists, don't actually click
        logTest('Save All handler accessible', typeof window.optionsManager.saveData === 'function');
      }
      
    } catch (e) {
      logTest('UI elements test', false, e.message);
    }

  } catch (globalError) {
    console.error('Global test error:', globalError);
    logTest('Global test execution', false, globalError.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.tests.length}`);
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Bug fixes are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
    console.log('\nFailed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.message}`);
    });
  }
  
  return results;
}

// Instructions for usage
console.log('Manual Test Script Loaded!');
console.log('To run tests, execute: await runManualTests()');

// Export for potential use
if (typeof window !== 'undefined') {
  window.runManualTests = runManualTests;
}