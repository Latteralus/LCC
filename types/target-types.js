/**
 * target-types.js
 * Type definitions for targets and screen coordinates
 */

/**
 * @typedef {Object} ScreenInfo
 * @property {number} id - Display identifier
 * @property {number} x - X position of screen origin
 * @property {number} y - Y position of screen origin
 * @property {number} width - Width of the screen in pixels
 * @property {number} height - Height of the screen in pixels
 * @property {boolean} isPrimary - Whether this is the primary screen
 * @property {number} scaleFactor - Display scale factor (for HiDPI/Retina)
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} x - X coordinate relative to screen origin
 * @property {number} y - Y coordinate relative to screen origin
 * @property {number} screenId - ID of the screen these coordinates are on
 */

/**
 * @typedef {Object} Target
 * @property {string} id - Unique identifier for the target
 * @property {string} name - User-friendly name for the target
 * @property {Coordinates} coordinates - Screen coordinates of the target
 * @property {('left'|'right'|'double')} clickType - Type of click to perform
 * @property {number} clickCount - Number of clicks (used for single clicks)
 * @property {string} createdAt - ISO date string of creation time
 * @property {string} updatedAt - ISO date string of last update time
 */

/**
 * Creates normalized coordinates from given values
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} screenId - ID of the screen
 * @returns {Coordinates} - Normalized coordinates object
 */
function createCoordinates(x, y, screenId = 0) {
    return {
      x: Math.round(x),
      y: Math.round(y),
      screenId
    };
  }
  
  /**
   * Converts global coordinates to screen-relative coordinates
   * 
   * @param {number} globalX - Global X coordinate
   * @param {number} globalY - Global Y coordinate
   * @param {ScreenInfo[]} screens - Available screens information
   * @returns {Coordinates} - Screen-relative coordinates
   */
  function globalToScreenCoordinates(globalX, globalY, screens) {
    // Find which screen contains these coordinates
    const screen = screens.find(screen => {
      return globalX >= screen.x && 
             globalX < (screen.x + screen.width) &&
             globalY >= screen.y && 
             globalY < (screen.y + screen.height);
    }) || screens[0]; // Fall back to primary screen if not found
    
    // Convert to screen-relative coordinates
    return createCoordinates(
      globalX - screen.x,
      globalY - screen.y,
      screen.id
    );
  }
  
  /**
   * Converts screen-relative coordinates to global coordinates
   * 
   * @param {Coordinates} coords - Screen-relative coordinates
   * @param {ScreenInfo[]} screens - Available screens information
   * @returns {Object} - Global coordinates {x, y}
   */
  function screenToGlobalCoordinates(coords, screens) {
    // Find the right screen
    const screen = screens.find(s => s.id === coords.screenId) || screens[0];
    
    // Convert to global coordinates
    return {
      x: coords.x + screen.x,
      y: coords.y + screen.y
    };
  }
  
  /**
   * Creates a new target object
   * 
   * @param {string} name - Name of the target
   * @param {Coordinates} coordinates - Screen coordinates
   * @param {Object} options - Additional options
   * @param {('left'|'right'|'double')} [options.clickType='left'] - Click type
   * @param {number} [options.clickCount=1] - Number of clicks
   * @param {string} [options.id] - Optional ID (generated if not provided)
   * @returns {Target} - The target object
   */
  function createTarget(name, coordinates, options = {}) {
    const now = new Date().toISOString();
    
    return {
      id: options.id || generateUniqueId(),
      name,
      coordinates,
      clickType: options.clickType || 'left',
      clickCount: options.clickCount || 1,
      createdAt: now,
      updatedAt: now
    };
  }
  
  /**
   * Helper function to generate a unique ID
   * 
   * @returns {string} - A unique ID string
   */
  function generateUniqueId() {
    // Simple implementation - in real code, use UUID library
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Export the types and helper functions
  module.exports = {
    createCoordinates,
    globalToScreenCoordinates,
    screenToGlobalCoordinates,
    createTarget
  };