/**
 * keyboard-handler.js
 * Manages keyboard shortcuts and keyboard input simulation
 */

const robot = require('robotjs');
const { globalShortcut } = require('electron');
const { debounce } = require('../../utils/event-utils');
const { createLogger } = require('../../utils/logger');
const { isMac, isWindows, isLinux } = require('../../utils/platform-utils');

// Initialize logger
const logger = createLogger('KeyboardHandler');

/**
 * Keyboard Handler
 * Manages global shortcuts and keyboard input simulation
 */
const KeyboardHandler = {
  /**
   * Configuration options
   * @private
   */
  _config: {
    // Trigger key for macros
    triggerKey: '`',
    // Allow modifier keys with trigger
    allowModifiers: true,
    // Debounce time for key presses (ms)
    debounceTime: 100
  },
  
  /**
   * Registered handlers
   * @private
   */
  _handlers: {
    // Handler for trigger key
    onTrigger: null,
    // Handler for macro keys
    onMacroKey: null
  },
  
  /**
   * Registered shortcuts
   * @private
   */
  _registeredShortcuts: [],
  
  /**
   * Flag indicating if keyboard capture is active
   * @private
   */
  _isCapturing: false,
  
  /**
   * Captured key sequence (for macro recording)
   * @private
   */
  _capturedSequence: [],
  
  /**
   * Modifier keys state
   * @private
   */
  _modifiers: {
    shift: false,
    control: false,
    alt: false,
    meta: false
  },
  
  /**
   * Initializes the keyboard handler
   * 
   * @param {Object} options - Initialization options
   * @returns {void}
   */
  initialize(options = {}) {
    logger.info('Initializing keyboard handler');
    
    // Set configuration from options
    if (options.triggerKey !== undefined) {
      this._config.triggerKey = options.triggerKey;
    }
    
    if (options.allowModifiers !== undefined) {
      this._config.allowModifiers = options.allowModifiers;
    }
    
    if (options.debounceTime !== undefined) {
      this._config.debounceTime = options.debounceTime;
    }
    
    // Create debounced trigger handler function
    this._handleTriggerKeyDebounced = debounce(() => {
      logger.debug('Trigger key pressed');
      
      if (this._handlers.onTrigger) {
        this._handlers.onTrigger();
      }
    }, this._config.debounceTime);
    
    // Register default keyboard shortcuts
    this._registerDefaultShortcuts();
    
    logger.info('Keyboard handler initialized');
  },
  
  /**
   * Updates the configuration
   * 
   * @param {Object} config - Updated configuration
   * @returns {void}
   */
  updateConfig(config) {
    logger.info('Updating keyboard handler configuration', config);
    
    let needsReinit = false;
    
    // Check if trigger key changed
    if (config.triggerKey !== undefined && config.triggerKey !== this._config.triggerKey) {
      this._config.triggerKey = config.triggerKey;
      needsReinit = true;
    }
    
    // Check if allow modifiers changed
    if (config.allowModifiers !== undefined && config.allowModifiers !== this._config.allowModifiers) {
      this._config.allowModifiers = config.allowModifiers;
      needsReinit = true;
    }
    
    // Check if debounce time changed
    if (config.debounceTime !== undefined) {
      this._config.debounceTime = config.debounceTime;
      
      // Recreate debounced function with new timing
      this._handleTriggerKeyDebounced = debounce(() => {
        logger.debug('Trigger key pressed');
        
        if (this._handlers.onTrigger) {
          this._handlers.onTrigger();
        }
      }, this._config.debounceTime);
    }
    
    // Re-initialize shortcuts if needed
    if (needsReinit) {
      logger.info('Trigger key or modifiers setting changed, re-initializing shortcuts');
      this.unregisterAll();
      this._registerDefaultShortcuts();
    }
  },
  
  /**
   * Registers default keyboard shortcuts
   * 
   * @private
   * @returns {void}
   */
  _registerDefaultShortcuts() {
    try {
      logger.debug('Registering default keyboard shortcuts');
      
      // Register trigger key shortcut
      this._registerTriggerShortcut();
      
      // Register escape key for canceling operations
      this.registerShortcut('Escape', () => {
        if (this._isCapturing) {
          this.stopCapture();
        }
        
        // Emit cancel event
        if (this._handlers.onCancel) {
          this._handlers.onCancel();
        }
      });
      
      logger.debug('Default keyboard shortcuts registered');
    } catch (error) {
      logger.error('Failed to register default shortcuts', error);
    }
  },
  
  /**
   * Registers the trigger key shortcut
   * 
   * @private
   * @returns {void}
   */
  _registerTriggerShortcut() {
    try {
      const triggerKey = this._config.triggerKey;
      
      // Unregister existing trigger shortcut if any
      this.unregisterShortcut(triggerKey);
      
      if (this._config.allowModifiers) {
        // Register with all modifier combinations
        this._registerModifierCombinations(triggerKey, this._handleTriggerKeyDebounced);
      } else {
        // Register plain trigger key
        this.registerShortcut(triggerKey, this._handleTriggerKeyDebounced);
      }
      
      logger.debug(`Registered trigger key: ${triggerKey} (allowModifiers: ${this._config.allowModifiers})`);
    } catch (error) {
      logger.error('Failed to register trigger shortcut', error);
    }
  },
  
  /**
   * Registers a shortcut with all modifier combinations
   * 
   * @private
   * @param {string} key - Base key
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  _registerModifierCombinations(key, callback) {
    // Register the key by itself
    this.registerShortcut(key, callback);
    
    // Register with each modifier
    this.registerShortcut(`CommandOrControl+${key}`, callback);
    this.registerShortcut(`Shift+${key}`, callback);
    this.registerShortcut(`Alt+${key}`, callback);
    
    // Register with modifier combinations
    this.registerShortcut(`CommandOrControl+Shift+${key}`, callback);
    this.registerShortcut(`CommandOrControl+Alt+${key}`, callback);
    this.registerShortcut(`Shift+Alt+${key}`, callback);
    this.registerShortcut(`CommandOrControl+Shift+Alt+${key}`, callback);
  },
  
  /**
   * Handles trigger key press (created dynamically in initialize)
   * 
   * @private
   */
  _handleTriggerKeyDebounced: null,
  
  /**
   * Registers a global keyboard shortcut
   * 
   * @param {string} accelerator - Electron accelerator string
   * @param {Function} callback - Callback function
   * @returns {boolean} - Whether registration was successful
   */
  registerShortcut(accelerator, callback) {
    try {
      logger.debug(`Registering shortcut: ${accelerator}`);
      
      // Check if already registered
      if (this._registeredShortcuts.includes(accelerator)) {
        this.unregisterShortcut(accelerator);
      }
      
      // Register the shortcut
      const success = globalShortcut.register(accelerator, callback);
      
      if (success) {
        this._registeredShortcuts.push(accelerator);
        logger.debug(`Shortcut registered successfully: ${accelerator}`);
      } else {
        logger.warn(`Failed to register shortcut: ${accelerator}`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Failed to register shortcut: ${accelerator}`, error);
      return false;
    }
  },
  
  /**
   * Unregisters a global keyboard shortcut
   * 
   * @param {string} accelerator - Electron accelerator string
   * @returns {void}
   */
  unregisterShortcut(accelerator) {
    try {
      logger.debug(`Unregistering shortcut: ${accelerator}`);
      
      globalShortcut.unregister(accelerator);
      
      // Remove from registered list
      const index = this._registeredShortcuts.indexOf(accelerator);
      if (index !== -1) {
        this._registeredShortcuts.splice(index, 1);
      }
    } catch (error) {
      logger.error(`Failed to unregister shortcut: ${accelerator}`, error);
    }
  },
  
  /**
   * Unregisters all global keyboard shortcuts
   * 
   * @returns {void}
   */
  unregisterAll() {
    try {
      logger.debug('Unregistering all shortcuts');
      
      globalShortcut.unregisterAll();
      this._registeredShortcuts = [];
    } catch (error) {
      logger.error('Failed to unregister all shortcuts', error);
    }
  },
  
  /**
   * Sets a handler function for the trigger key
   * 
   * @param {Function} handler - Handler function
   * @returns {void}
   */
  setTriggerHandler(handler) {
    this._handlers.onTrigger = handler;
  },
  
  /**
   * Sets a handler function for macro key events
   * 
   * @param {Function} handler - Handler function
   * @returns {void}
   */
  setMacroKeyHandler(handler) {
    this._handlers.onMacroKey = handler;
  },
  
  /**
   * Sets a handler function for cancel events
   * 
   * @param {Function} handler - Handler function
   * @returns {void}
   */
  setCancelHandler(handler) {
    this._handlers.onCancel = handler;
  },
  
  /**
   * Starts keyboard capture for macro recording
   * 
   * @returns {void}
   */
  startCapture() {
    logger.info('Starting keyboard capture');
    
    this._isCapturing = true;
    this._capturedSequence = [];
    this._resetModifiers();
    
    // Could set up additional listeners for key capture here
    // For a full implementation, we might use native hooks for better key capture
  },
  
  /**
   * Stops keyboard capture
   * 
   * @returns {Array} - The captured key sequence
   */
  stopCapture() {
    logger.info('Stopping keyboard capture');
    
    this._isCapturing = false;
    
    // Clean up any capture-specific listeners
    
    return this._capturedSequence;
  },
  
  /**
   * Resets the state of modifier keys
   * 
   * @private
   * @returns {void}
   */
  _resetModifiers() {
    this._modifiers = {
      shift: false,
      control: false,
      alt: false,
      meta: false
    };
  },
  
  /**
   * Simulates a keystroke
   * 
   * @param {string} key - Key to press
   * @param {Object} options - Options for the keystroke
   * @param {boolean} [options.shift=false] - Whether to hold Shift
   * @param {boolean} [options.control=false] - Whether to hold Control
   * @param {boolean} [options.alt=false] - Whether to hold Alt
   * @param {boolean} [options.meta=false] - Whether to hold Meta (Command/Windows)
   * @returns {Promise<void>}
   */
  async simulateKeystroke(key, options = {}) {
    try {
      logger.debug(`Simulating keystroke: ${key}`, options);
      
      // Convert key to robotjs format
      const robotKey = this._convertToRobotKey(key);
      
      // Set modifier keys
      if (options.shift) robot.keyToggle('shift', 'down');
      if (options.control) robot.keyToggle('control', 'down');
      if (options.alt) robot.keyToggle('alt', 'down');
      if (options.meta) robot.keyToggle('command', 'down');
      
      // Press and release the key
      robot.keyTap(robotKey);
      
      // Release modifier keys
      if (options.meta) robot.keyToggle('command', 'up');
      if (options.alt) robot.keyToggle('alt', 'up');
      if (options.control) robot.keyToggle('control', 'up');
      if (options.shift) robot.keyToggle('shift', 'up');
    } catch (error) {
      // Ensure modifiers are released
      try {
        robot.keyToggle('shift', 'up');
        robot.keyToggle('control', 'up');
        robot.keyToggle('alt', 'up');
        robot.keyToggle('command', 'up');
      } catch (e) {
        // Ignore cleanup errors
      }
      
      logger.error(`Failed to simulate keystroke: ${key}`, error);
      throw error;
    }
  },
  
  /**
   * Simulates typing a string
   * 
   * @param {string} text - Text to type
   * @returns {Promise<void>}
   */
  async simulateTyping(text) {
    try {
      logger.debug(`Simulating typing: ${text.length} characters`);
      
      robot.typeString(text);
    } catch (error) {
      logger.error('Failed to simulate typing', error);
      throw error;
    }
  },
  
  /**
   * Converts a key name to the format used by robotjs
   * 
   * @private
   * @param {string} key - Key name
   * @returns {string} - Key in robotjs format
   */
  _convertToRobotKey(key) {
    // Map of special keys to robotjs format
    const keyMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Backspace': 'backspace',
      'Tab': 'tab',
      'Enter': 'enter',
      'Return': 'return',
      'CapsLock': 'capslock',
      'Escape': 'escape',
      'Space': 'space',
      'PageUp': 'pageup',
      'PageDown': 'pagedown',
      'End': 'end',
      'Home': 'home',
      'Insert': 'insert',
      'Delete': 'delete',
      'Command': 'command',
      'Control': 'control',
      'Option': 'alt',
      'Alt': 'alt',
      'Shift': 'shift',
      'Print': 'printscreen',
      'ScrollLock': 'scrolllock',
      'Pause': 'pause'
    };
    
    // Check if it's a special key
    if (keyMap[key]) {
      return keyMap[key];
    }
    
    // Function keys
    if (key.match(/^F(\d+)$/)) {
      const match = key.match(/^F(\d+)$/);
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 24) {
        return `f${num}`;
      }
    }
    
    // For single character keys, use lowercase
    if (key.length === 1) {
      return key.toLowerCase();
    }
    
    // Default: return as is
    return key;
  }
};

module.exports = KeyboardHandler;