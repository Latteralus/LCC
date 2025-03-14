/**
 * macro-types.js
 * Type definitions for macros and action sequences
 */

/**
 * @typedef {Object} ClickAction
 * @property {'click'} type - The action type
 * @property {number} x - X coordinate of the click
 * @property {number} y - Y coordinate of the click
 * @property {string} targetId - Optional ID of the associated target
 * @property {('left'|'right'|'double')} clickType - Type of click to perform
 * @property {number} clickCount - Number of clicks (used for single clicks)
 * @property {number} screenId - ID of the screen where the click happens
 */

/**
 * @typedef {Object} KeyboardAction
 * @property {'keyboard'} type - The action type
 * @property {string} key - Key to simulate
 * @property {boolean} withShift - Whether to hold Shift while pressing the key
 * @property {boolean} withCtrl - Whether to hold Ctrl while pressing the key
 * @property {boolean} withAlt - Whether to hold Alt while pressing the key
 * @property {boolean} withMeta - Whether to hold Meta (Command/Windows) while pressing the key
 */

/**
 * @typedef {Object} TextInputAction
 * @property {'text'} type - The action type
 * @property {string} text - Text to input
 */

/**
 * @typedef {Object} DelayAction
 * @property {'delay'} type - The action type
 * @property {number} duration - Duration of the delay in milliseconds
 */

/**
 * @typedef {ClickAction|KeyboardAction|TextInputAction|DelayAction} MacroAction
 * Any action that can be part of a macro
 */

/**
 * @typedef {Object} MacroStep
 * @property {string} id - Unique identifier for the step
 * @property {MacroAction} action - The action to perform
 * @property {number} order - Order of the step in the sequence
 */

/**
 * @typedef {Object} Macro
 * @property {string} id - Unique identifier for the macro
 * @property {string} name - Display name of the macro
 * @property {string} description - Optional description
 * @property {MacroStep[]} steps - Ordered steps of the macro
 * @property {string} createdAt - ISO date string of creation time
 * @property {string} updatedAt - ISO date string of last update time
 */

/**
 * Creates a new click action object
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} options - Additional options
 * @param {string} [options.targetId] - ID of associated target
 * @param {('left'|'right'|'double')} [options.clickType='left'] - Type of click
 * @param {number} [options.clickCount=1] - Number of clicks
 * @param {number} [options.screenId=0] - ID of the screen
 * @returns {ClickAction} - The click action object
 */
function createClickAction(x, y, options = {}) {
    return {
      type: 'click',
      x,
      y,
      targetId: options.targetId || null,
      clickType: options.clickType || 'left',
      clickCount: options.clickCount || 1,
      screenId: options.screenId || 0
    };
  }
  
  /**
   * Creates a new keyboard action object
   * 
   * @param {string} key - Key to simulate
   * @param {Object} options - Additional options
   * @param {boolean} [options.withShift=false] - Hold Shift
   * @param {boolean} [options.withCtrl=false] - Hold Ctrl
   * @param {boolean} [options.withAlt=false] - Hold Alt
   * @param {boolean} [options.withMeta=false] - Hold Meta
   * @returns {KeyboardAction} - The keyboard action object
   */
  function createKeyboardAction(key, options = {}) {
    return {
      type: 'keyboard',
      key,
      withShift: options.withShift || false,
      withCtrl: options.withCtrl || false,
      withAlt: options.withAlt || false,
      withMeta: options.withMeta || false
    };
  }
  
  /**
   * Creates a new text input action object
   * 
   * @param {string} text - Text to input
   * @returns {TextInputAction} - The text input action object
   */
  function createTextInputAction(text) {
    return {
      type: 'text',
      text
    };
  }
  
  /**
   * Creates a new delay action object
   * 
   * @param {number} duration - Duration in milliseconds
   * @returns {DelayAction} - The delay action object
   */
  function createDelayAction(duration) {
    return {
      type: 'delay',
      duration
    };
  }
  
  /**
   * Creates a new macro step
   * 
   * @param {MacroAction} action - The action to perform
   * @param {number} order - Order in the sequence
   * @param {string} [id] - Optional ID (generated if not provided)
   * @returns {MacroStep} - The macro step object
   */
  function createMacroStep(action, order, id = null) {
    return {
      id: id || generateUniqueId(),
      action,
      order
    };
  }
  
  /**
   * Creates a new macro object
   * 
   * @param {string} name - Name of the macro
   * @param {Object} options - Additional options
   * @param {string} [options.description] - Optional description
   * @param {MacroStep[]} [options.steps=[]] - Initial steps
   * @param {string} [options.id] - Optional ID (generated if not provided)
   * @returns {Macro} - The macro object
   */
  function createMacro(name, options = {}) {
    const now = new Date().toISOString();
    
    return {
      id: options.id || generateUniqueId(),
      name,
      description: options.description || '',
      steps: options.steps || [],
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
    createClickAction,
    createKeyboardAction,
    createTextInputAction,
    createDelayAction,
    createMacroStep,
    createMacro
  };