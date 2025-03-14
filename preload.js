const { contextBridge, ipcRenderer } = require('electron');

/**
 * IPC Channel namespaces for security
 * All valid channels should be listed here to prevent unauthorized access
 */
const validChannels = {
  // Configuration related channels
  config: [
    'config:get',
    'config:set',
    'config:save',
    'config:reset'
  ],
  
  // Target management channels
  target: [
    'target:set',
    'target:get',
    'target:get-all',
    'target:delete',
    'target:clear-all'
  ],
  
  // Macro recording and playback
  macro: [
    'macro:start-recording',
    'macro:stop-recording',
    'macro:play',
    'macro:stop',
    'macro:get-all',
    'macro:save',
    'macro:delete'
  ],
  
  // UI state and events
  ui: [
    'ui:toggle-targeting-mode',
    'ui:targeting-mode-changed',
    'ui:theme-changed'
  ],
  
  // System events
  system: [
    'system:quit',
    'system:minimize',
    'system:get-displays'
  ]
};

// Flatten valid channels for easier validation
const validChannelsList = Object.values(validChannels).flat();

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Send an IPC message to the main process
   * @param {string} channel - The IPC channel to send to
   * @param {any[]} args - Arguments to send with the IPC message
   * @returns {Promise<any>} - Promise that resolves with the response
   */
  send: (channel, ...args) => {
    if (validChannelsList.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },
  
  /**
   * Register a listener for an IPC event from the main process
   * @param {string} channel - The IPC channel to listen on
   * @param {function} callback - The callback function to invoke
   * @returns {function} - A function to remove the event listener
   */
  on: (channel, callback) => {
    if (validChannelsList.includes(channel)) {
      // Convert callback to a wrapper that can be removed later
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the event listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },
  
  /**
   * Register a one-time listener for an IPC event
   * @param {string} channel - The IPC channel to listen on
   * @param {function} callback - The callback function to invoke
   */
  once: (channel, callback) => {
    if (validChannelsList.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
  },
  
  /**
   * Get the list of valid IPC channels
   * Useful for debugging and development
   * @returns {Object} - An object with channel categories
   */
  getChannels: () => validChannels
});

// Expose process versions for compatibility and debugging
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});

// Expose platform information
contextBridge.exposeInMainWorld('platform', {
  type: process.platform
});