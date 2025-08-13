// X-Proxy Background Service Worker
// Simple background script for proxy management

console.log('X-Proxy background service worker loaded');

// Simple proxy management
let activeProfile = null;

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('X-Proxy installed');
});

// Handle messages from popup and options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Simple message handling for basic proxy functionality
  sendResponse({ success: true });
});