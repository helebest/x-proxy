// Fix storage script - run this to migrate data to correct format
// Run in Chrome extension console if profiles are not showing

console.clear();
console.log('%c=== X-PROXY STORAGE FIX ===', 'color: #4CAF50; font-size: 16px; font-weight: bold');

const STORAGE_KEY = 'x-proxy-data';

// First, get all current data
chrome.storage.local.get(null, async (allData) => {
  console.log('Current storage keys:', Object.keys(allData));
  
  // Initialize proper structure
  let fixedData = {
    version: 1,
    profiles: [],
    activeProfileId: undefined,
    settings: {
      showNotifications: true,
      testOnConnect: false,
      theme: 'auto'
    }
  };
  
  // Check if we already have x-proxy-data
  if (allData[STORAGE_KEY]) {
    console.log('Found existing x-proxy-data');
    fixedData = allData[STORAGE_KEY];
    
    // Ensure it has the correct structure
    if (!fixedData.version) fixedData.version = 1;
    if (!Array.isArray(fixedData.profiles)) fixedData.profiles = [];
    if (!fixedData.settings) fixedData.settings = { showNotifications: true, testOnConnect: false, theme: 'auto' };
  }
  
  // Check for legacy profiles key
  if (allData.profiles && Array.isArray(allData.profiles)) {
    console.log(`Found ${allData.profiles.length} profiles in legacy location`);
    
    // Migrate legacy profiles
    allData.profiles.forEach(profile => {
      // Check if profile already exists
      const exists = fixedData.profiles.some(p => p.id === profile.id || p.name === profile.name);
      if (!exists) {
        console.log(`Migrating profile: ${profile.name}`);
        
        // Ensure proper structure
        const migratedProfile = {
          id: profile.id || `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: profile.name || 'Unnamed Profile',
          description: profile.description || '',
          color: profile.color || '#4CAF50',
          isActive: profile.isActive || false,
          isDefault: profile.isDefault || false,
          config: profile.config || {
            type: 'http',
            host: '',
            port: 8080,
            bypassList: []
          },
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updatedAt || new Date().toISOString(),
          tags: profile.tags || []
        };
        
        fixedData.profiles.push(migratedProfile);
      }
    });
    
    // Remove legacy profiles key
    chrome.storage.local.remove('profiles', () => {
      console.log('Removed legacy profiles key');
    });
  }
  
  // Look for other potential profile data
  for (const key in allData) {
    if (key !== STORAGE_KEY && key !== 'profiles' && typeof allData[key] === 'object' && allData[key] !== null) {
      if (allData[key].name && allData[key].config) {
        console.log(`Found potential profile in key "${key}"`);
        const profile = allData[key];
        const exists = fixedData.profiles.some(p => p.id === profile.id || p.name === profile.name);
        if (!exists) {
          fixedData.profiles.push({
            id: profile.id || `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: profile.name,
            description: profile.description || '',
            color: profile.color || '#4CAF50',
            isActive: profile.isActive || false,
            isDefault: profile.isDefault || false,
            config: profile.config,
            createdAt: profile.createdAt || new Date().toISOString(),
            updatedAt: profile.updatedAt || new Date().toISOString(),
            tags: profile.tags || []
          });
        }
      }
    }
  }
  
  // Save the fixed data
  chrome.storage.local.set({ [STORAGE_KEY]: fixedData }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to save fixed data:', chrome.runtime.lastError);
    } else {
      console.log('%c✅ Storage fixed successfully!', 'color: #4CAF50; font-weight: bold');
      console.log(`Total profiles: ${fixedData.profiles.length}`);
      console.log('Fixed data:', fixedData);
      
      // Notify background service to reload
      chrome.runtime.sendMessage({ type: 'GET_PROFILES' }, (response) => {
        if (response && response.success) {
          console.log('Background service acknowledged');
          console.log('Profiles from background:', response.data);
        }
      });
      
      console.log('%c🔄 Please close and reopen the popup to see changes', 'color: #2196F3; font-weight: bold');
    }
  });
});
