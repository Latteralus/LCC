/**
 * platform-utils.js
 * Platform-specific utilities for handling different operating systems
 */

const os = require('os');
const { execSync } = require('child_process');
const { app } = require('electron');

/**
 * Platform types
 * @type {Object}
 */
const PLATFORMS = {
  WINDOWS: 'win32',
  MAC: 'darwin',
  LINUX: 'linux'
};

/**
 * Get the current platform
 * @returns {string} - Current platform identifier
 */
function getCurrentPlatform() {
  return process.platform;
}

/**
 * Check if running on Windows
 * @returns {boolean} - True if running on Windows
 */
function isWindows() {
  return process.platform === PLATFORMS.WINDOWS;
}

/**
 * Check if running on macOS
 * @returns {boolean} - True if running on macOS
 */
function isMac() {
  return process.platform === PLATFORMS.MAC;
}

/**
 * Check if running on Linux
 * @returns {boolean} - True if running on Linux
 */
function isLinux() {
  return process.platform === PLATFORMS.LINUX;
}

/**
 * Check if the app is running in development mode
 * @returns {boolean} - True if in development mode
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development' || process.defaultApp;
}

/**
 * Get system information
 * @returns {Object} - System information
 */
function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    osVersion: os.release(),
    osName: getOSName(),
    cpuCores: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };
}

/**
 * Get OS name with version
 * @returns {string} - OS name with version
 */
function getOSName() {
  const platform = process.platform;
  let osName = '';

  if (platform === PLATFORMS.WINDOWS) {
    osName = getWindowsVersion();
  } else if (platform === PLATFORMS.MAC) {
    osName = getMacOSVersion();
  } else if (platform === PLATFORMS.LINUX) {
    osName = getLinuxDistribution();
  } else {
    osName = `Unknown (${platform})`;
  }

  return osName;
}

/**
 * Get Windows version from the release string
 * @returns {string} - Windows version name
 */
function getWindowsVersion() {
  const release = os.release();
  
  if (release.startsWith('10.0')) {
    // This covers both Windows 10 and Windows 11
    // We need to look at build number to differentiate
    const buildNumber = parseInt(release.split('.')[2], 10);
    
    if (buildNumber >= 22000) {
      return 'Windows 11';
    } else {
      return 'Windows 10';
    }
  } else if (release.startsWith('6.3')) {
    return 'Windows 8.1';
  } else if (release.startsWith('6.2')) {
    return 'Windows 8';
  } else if (release.startsWith('6.1')) {
    return 'Windows 7';
  } else {
    return `Windows (${release})`;
  }
}

/**
 * Get macOS version name
 * @returns {string} - macOS version name
 */
function getMacOSVersion() {
  try {
    // Execute the sw_vers command to get macOS version information
    const macVersion = execSync('sw_vers -productVersion').toString().trim();
    let macName = 'macOS';
    
    // Map version numbers to macOS names
    const versionMap = {
      '10.15': 'Catalina',
      '11': 'Big Sur',
      '12': 'Monterey',
      '13': 'Ventura',
      '14': 'Sonoma'
    };
    
    // Check if the version is in our map
    const majorMinor = macVersion.split('.').slice(0, 2).join('.');
    const majorOnly = macVersion.split('.')[0];
    
    if (versionMap[majorMinor]) {
      macName += ` ${versionMap[majorMinor]}`;
    } else if (versionMap[majorOnly]) {
      macName += ` ${versionMap[majorOnly]}`;
    }
    
    return `${macName} ${macVersion}`;
  } catch (error) {
    return `macOS (${os.release()})`;
  }
}

/**
 * Get Linux distribution name
 * @returns {string} - Linux distribution name
 */
function getLinuxDistribution() {
  try {
    // Try to get distribution from lsb_release
    const distro = execSync('lsb_release -ds 2>/dev/null').toString().trim();
    if (distro) {
      return distro;
    }
  } catch (e) {
    // lsb_release not available
  }
  
  try {
    // Try to get from /etc/os-release
    const release = execSync('cat /etc/os-release 2>/dev/null').toString();
    const match = release.match(/PRETTY_NAME="([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    // os-release not available
  }
  
  return `Linux (${os.release()})`;
}

/**
 * Check if the app has accessibility permissions (for macOS)
 * @returns {boolean} - True if accessibility permissions are granted
 */
function checkAccessibilityPermissions() {
  if (process.platform === PLATFORMS.MAC) {
    try {
      // Try to execute a command that requires accessibility permissions
      const result = execSync('osascript -e "tell application \\"System Events\\" to get name of first process"').toString().trim();
      return true;
    } catch (error) {
      return false;
    }
  } else if (process.platform === PLATFORMS.WINDOWS) {
    // Windows doesn't have the same accessibility permission model
    return true;
  } else {
    // Unsupported platform
    return false;
  }
}

/**
 * Open the system preferences to the accessibility pane (macOS only)
 */
function openAccessibilityPreferences() {
  if (process.platform === PLATFORMS.MAC) {
    try {
      execSync('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
    } catch (error) {
      console.error('Failed to open accessibility preferences:', error);
    }
  }
}

/**
 * Create a platform-specific configuration object
 * @returns {Object} - Platform-specific configuration
 */
function getPlatformConfig() {
  if (isWindows()) {
    return {
      appDataPath: app.getPath('userData'),
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
      pathSeparator: '\\',
      lineEnding: '\r\n',
      mouseClickLib: 'robotjs',
      runOnStartup: {
        enabled: false,
        registryKey: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        appName: app.getName()
      },
      requiresAccessibilityPermissions: false
    };
  } else if (isMac()) {
    return {
      appDataPath: app.getPath('userData'),
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
      pathSeparator: '/',
      lineEnding: '\n',
      mouseClickLib: 'robotjs',
      runOnStartup: {
        enabled: false,
        path: `${os.homedir()}/Library/LaunchAgents/${app.getName()}.plist`
      },
      requiresAccessibilityPermissions: true
    };
  } else {
    // Linux or other platforms (not officially supported)
    return {
      appDataPath: app.getPath('userData'),
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
      pathSeparator: '/',
      lineEnding: '\n',
      mouseClickLib: 'robotjs',
      runOnStartup: {
        enabled: false,
        path: `${os.homedir()}/.config/autostart/${app.getName()}.desktop`
      },
      requiresAccessibilityPermissions: false
    };
  }
}

/**
 * Get the appropriate command for the current platform
 * @param {Object} commands - Object with platform-specific commands
 * @returns {*} - The command for the current platform
 */
function getPlatformCommand(commands) {
  if (isWindows() && commands.windows) {
    return commands.windows;
  } else if (isMac() && commands.mac) {
    return commands.mac;
  } else if (isLinux() && commands.linux) {
    return commands.linux;
  } else if (commands.default) {
    return commands.default;
  }
  
  return null;
}

/**
 * Execute a platform-specific function
 * @param {Object} functions - Object with platform-specific functions
 * @param {Array} args - Arguments to pass to the function
 * @returns {*} - Result of the function execution
 */
function executePlatformFunction(functions, ...args) {
  if (isWindows() && typeof functions.windows === 'function') {
    return functions.windows(...args);
  } else if (isMac() && typeof functions.mac === 'function') {
    return functions.mac(...args);
  } else if (isLinux() && typeof functions.linux === 'function') {
    return functions.linux(...args);
  } else if (typeof functions.default === 'function') {
    return functions.default(...args);
  }
  
  throw new Error('No compatible platform function found');
}

// Export the utility functions
module.exports = {
  PLATFORMS,
  getCurrentPlatform,
  isWindows,
  isMac,
  isLinux,
  isDevelopment,
  getSystemInfo,
  getOSName,
  checkAccessibilityPermissions,
  openAccessibilityPreferences,
  getPlatformConfig,
  getPlatformCommand,
  executePlatformFunction
};