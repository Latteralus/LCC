/**
 * ipc-types.js
 * Definitions for IPC communication channels and message formats
 */

/**
 * Namespace for config-related IPC channels
 * @type {Object}
 */
const CONFIG_CHANNELS = {
    GET: 'config:get',        // Get config or specific config value
    SET: 'config:set',        // Set config values
    SAVE: 'config:save',      // Save config to disk
    RESET: 'config:reset'     // Reset to default config
  };
  
  /**
   * Namespace for target-related IPC channels
   * @type {Object}
   */
  const TARGET_CHANNELS = {
    SET: 'target:set',         // Create or update a target
    GET: 'target:get',         // Get a specific target
    GET_ALL: 'target:get-all', // Get all targets
    DELETE: 'target:delete',   // Delete a target
    CLEAR_ALL: 'target:clear-all' // Clear all targets
  };
  
  /**
   * Namespace for macro-related IPC channels
   * @type {Object}
   */
  const MACRO_CHANNELS = {
    START_RECORDING: 'macro:start-recording', // Start recording a new macro
    STOP_RECORDING: 'macro:stop-recording',   // Stop recording the current macro
    PLAY: 'macro:play',                       // Play a specific macro
    STOP: 'macro:stop',                       // Stop the currently playing macro
    GET_ALL: 'macro:get-all',                 // Get all macros
    SAVE: 'macro:save',                       // Save a macro
    DELETE: 'macro:delete'                    // Delete a macro
  };
  
  /**
   * Namespace for UI-related IPC channels
   * @type {Object}
   */
  const UI_CHANNELS = {
    TOGGLE_TARGETING_MODE: 'ui:toggle-targeting-mode', // Toggle targeting mode
    TARGETING_MODE_CHANGED: 'ui:targeting-mode-changed', // Targeting mode state changed
    THEME_CHANGED: 'ui:theme-changed' // Theme has been changed
  };
  
  /**
   * Namespace for system-related IPC channels
   * @type {Object}
   */
  const SYSTEM_CHANNELS = {
    QUIT: 'system:quit',                 // Quit the application
    MINIMIZE: 'system:minimize',         // Minimize to tray
    GET_DISPLAYS: 'system:get-displays'  // Get display information
  };
  
  /**
   * @typedef {Object} IpcResponse
   * @property {boolean} success - Whether the operation was successful
   * @property {*} [data] - The response data (if successful)
   * @property {string} [error] - Error message (if not successful)
   */
  
  /**
   * Creates a successful IPC response
   * 
   * @param {*} data - The response data
   * @returns {IpcResponse} - A successful response object
   */
  function successResponse(data) {
    return {
      success: true,
      data
    };
  }
  
  /**
   * Creates an error IPC response
   * 
   * @param {string} message - The error message
   * @returns {IpcResponse} - An error response object
   */
  function errorResponse(message) {
    return {
      success: false,
      error: message
    };
  }
  
  // Export all channel definitions and helper functions
  module.exports = {
    CONFIG_CHANNELS,
    TARGET_CHANNELS,
    MACRO_CHANNELS,
    UI_CHANNELS,
    SYSTEM_CHANNELS,
    successResponse,
    errorResponse
  };