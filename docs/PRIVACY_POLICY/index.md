# Privacy Policy for X-Proxy Chrome Extension

**Last updated: August 21, 2025**

## Overview

X-Proxy ("we," "our," or "us") respects your privacy and is committed to protecting your personal information. This privacy policy explains how our Chrome extension collects, uses, stores, and protects your information when you use the X-Proxy extension.

## Information We Collect

### Proxy Configuration Data
X-Proxy collects and stores the following information that you provide:

- **Proxy Server Details**: Server addresses (hostnames/IP addresses), port numbers, and authentication credentials (usernames and passwords) for your proxy configurations
- **Profile Information**: Names and descriptions you assign to your proxy profiles for organization purposes
- **Connection Settings**: Proxy types (HTTP, HTTPS, SOCKS5) and related configuration parameters

### Application Preferences
- **User Interface Settings**: Theme preferences, layout choices, and other customization options
- **Extension State**: Currently active proxy profile and connection status
- **Usage Preferences**: Settings related to automatic connection, profile organization, and other user-defined preferences

## How We Use Your Information

X-Proxy uses your information solely to provide the core functionality of the extension:

- **Proxy Management**: To configure, activate, and manage your proxy connections through Chrome's proxy API
- **Profile Storage**: To save and organize your proxy configurations for future use
- **State Management**: To remember your active proxy settings and preferences across browser sessions
- **User Interface**: To display your proxy profiles and current connection status

## Data Storage and Security

### Local Storage Only
- **All data is stored locally** on your device using Chrome's secure storage API (`chrome.storage.local`)
- **No data transmission**: Your proxy configurations, credentials, and preferences are never transmitted to external servers, third parties, or our systems
- **Device-specific**: Your data remains on your local device and is not synchronized across devices unless you explicitly use Chrome's sync feature

### Security Measures
- **Chrome's Security**: Data is protected using Chrome's built-in storage security mechanisms
- **No External Access**: The extension does not communicate with external servers or APIs for data storage  
- **Local Storage Only**: Data stored in chrome.storage.local

### Important Security Considerations
- **Proxy Credentials**: Authentication credentials (usernames/passwords) are stored in plaintext in local browser storage. Users should:
  - Use unique, strong passwords for proxy authentication
  - Regularly rotate proxy credentials
  - Avoid using personal/primary account passwords
  
- **Browser Sync Risk**: If Chrome sync is enabled, extension data may be synchronized across your Google-linked devices and stored on Google's servers
  
- **Local Access**: Other extensions with storage permissions or local malware could potentially access stored proxy configurations
  
- **Device Security**: On shared or compromised devices, proxy configurations may be accessible to other users
  
### User Security Recommendations
- Use the extension only on trusted, secure devices
- Enable device-level disk encryption for additional protection
- Consider disabling Chrome sync for sensitive proxy configurations
- Regularly review and clean stored proxy profiles
- Log out of shared devices and clear browser data when necessary

## Permissions Explanation

X-Proxy requests the following permissions, which are essential for its functionality:

### "proxy" Permission
- **Purpose**: Required to modify Chrome's proxy settings and route your internet traffic through the configured proxy servers
- **Usage**: Activated only when you select a proxy profile; automatically disabled when you choose "System Proxy"

### "storage" Permission
- **Purpose**: Required to save your proxy profiles, preferences, and settings locally on your device
- **Usage**: Used to persist your configurations between browser sessions

### Host Permissions ("<all_urls>")
- **Purpose**: Required to apply proxy settings to all websites you visit
- **Usage**: Necessary for the proxy to function across all web traffic as intended
- **Note**: This permission does not allow the extension to access, read, or modify website content

## Data Sharing and Disclosure

**We do not share your information.** Specifically:

- **No Third-Party Sharing**: Your proxy configurations and personal data are never shared with third parties
- **No Analytics**: We do not collect usage analytics or telemetry data
- **No Advertising**: We do not use your data for advertising purposes
- **No External Transmission**: All data remains on your local device

## Your Rights and Control

You have complete control over your data:

- **View Data**: You can view all stored data through the extension's options page
- **Modify Data**: You can edit or update any proxy profiles and settings at any time
- **Delete Data**: You can delete individual profiles or clear all extension data
- **Export Data**: You can manually export your configurations if needed
- **Complete Removal**: Uninstalling the extension will remove all stored data from your device

## Changes to Proxy Settings

When you use X-Proxy:

- **Temporary Changes**: Proxy settings only affect your current browser session
- **Manual Control**: You must manually activate proxy profiles; the extension does not automatically change your proxy settings
- **Easy Restoration**: You can return to your original internet connection by selecting "System Proxy"

## Data Retention

- **User-Controlled**: Data is retained only as long as you keep the extension installed
- **No Automatic Deletion**: Your configurations persist until you manually delete them or uninstall the extension
- **Complete Removal**: Uninstalling the extension removes all associated data from your device

## Third-Party Services

X-Proxy does not integrate with or send data to any third-party services. The extension operates entirely locally on your device.

## Contact Information

If you have questions about this privacy policy or the X-Proxy extension, you can:

- **Report Issues**: [GitHub Issues](https://github.com/helebest/x-proxy/issues)
- **View Source Code**: [GitHub Repository](https://github.com/helebest/x-proxy)

## Policy Updates

We may update this privacy policy to reflect changes in our practices or for legal, operational, or regulatory reasons. Updates will be posted with a new "Last updated" date. Continued use of the extension after updates constitutes acceptance of the revised policy.

## Compliance

This privacy policy complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) requirements
- California Consumer Privacy Act (CCPA) guidelines

---

**Summary**: X-Proxy is designed with privacy in mind. All your proxy configurations and settings are stored locally on your device and are never transmitted to external servers. The extension only uses the minimum permissions necessary to provide proxy switching functionality, and you maintain complete control over your data at all times.