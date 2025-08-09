// Debug script to check what's in storage
// Run this in Chrome extension console to see the data

const STORAGE_KEY = 'x-proxy-data';

// Clear console for fresh output
console.clear();
console.log('%c=== X-PROXY STORAGE DEBUG ===', 'color: #4CAF50; font-size: 16px; font-weight: bold');

// Get all storage data
chrome.storage.local.get(null, (allData) => {
  console.log('%c📦 All Storage Keys:', 'color: #2196F3; font-weight: bold');
  console.log(Object.keys(allData));
  
  // Check for legacy profiles key
  if (allData.profiles) {
    console.log('%c⚠️ Found legacy "profiles" key with data:', 'color: #FF9800; font-weight: bold');
    console.log(allData.profiles);
  }
  
  // Check main storage key
  if (allData[STORAGE_KEY]) {
    const data = allData[STORAGE_KEY];
    console.log('%c✅ Found x-proxy-data:', 'color: #4CAF50; font-weight: bold');
    console.log('Version:', data.version);
    console.log('Active Profile ID:', data.activeProfileId || 'None');
    
    if (data.profiles && Array.isArray(data.profiles)) {
      console.log(`%c👤 Profiles (${data.profiles.length}):`, 'color: #9C27B0; font-weight: bold');
      data.profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.name}`);
        console.log(`     ID: ${profile.id}`);
        console.log(`     Type: ${profile.config?.type || 'Unknown'}`);
        console.log(`     Host: ${profile.config?.host || 'Not set'}:${profile.config?.port || 'Not set'}`);
        console.log(`     Active: ${profile.isActive || false}`);
        console.log(`     Config:`, profile.config);
      });
    } else {
      console.log('%c❌ No profiles array found or invalid format', 'color: #F44336; font-weight: bold');
    }
    
    console.log('%c📄 Full x-proxy-data:', 'color: #607D8B; font-weight: bold');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('%c❌ No x-proxy-data found in storage!', 'color: #F44336; font-weight: bold');
    
    // Try to help diagnose the issue
    console.log('%c🔍 Looking for any profile-like data...', 'color: #FF5722; font-weight: bold');
    for (const key in allData) {
      if (typeof allData[key] === 'object' && allData[key] !== null) {
        if (allData[key].profiles || allData[key].name || allData[key].config) {
          console.log(`  Found potential profile data in key "${key}":`, allData[key]);
        }
      }
    }
  }
  
  console.log('%c=== END DEBUG ===', 'color: #4CAF50; font-size: 16px; font-weight: bold');
});

// Also check if the background service is running
chrome.runtime.sendMessage({ type: 'GET_PROFILES' }, (response) => {
  if (chrome.runtime.lastError) {
    console.log('%c❌ Background service error:', 'color: #F44336; font-weight: bold', chrome.runtime.lastError);
  } else {
    console.log('%c📡 Background service response:', 'color: #00BCD4; font-weight: bold');
    console.log('Success:', response?.success);
    console.log('Data:', response?.data);
    if (response?.error) {
      console.log('Error:', response.error);
    }
  }
});
