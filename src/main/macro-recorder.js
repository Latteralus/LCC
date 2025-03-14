/**
 * macro-recorder.js
 * Handles recording of user actions into macro sequences
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('../../utils/logger');
const { 
  createMacro, 
  createMacroStep, 
  createClickAction, 
  createKeyboardAction, 
  createTextInputAction, 
  createDelayAction 
} = require('../../types/macro-types');

// Initialize logger
const logger = createLogger('MacroRecorder');

/**
 * Macro Recorder
 * Records user actions and manages macro storage
 */
const MacroRecorder = {
  /**
   * Path to the macros storage file
   * @private
   */
  _macrosFilePath: null,
  
  /**
   * In-memory cache of loaded macros
   * @private
   */
  _macros: [],
  
  /**
   * Current recording state
   * @private
   */
  _recordingState: {
    isRecording: false,
    currentMacro: null,
    lastActionTime: 0,
    eventListeners: [],
    targetIds: new Map() // Maps coordinates to target IDs for referencing
  },
  
  /**
   * Dependencies
   * @private
   */
  _dependencies: {
    clickSimulator: null,
    keyboardHandler: null,
    targetManager: null
  },
  
  /**
   * Initializes the macro recorder
   * 
   * @param {Object} options - Initialization options
   * @param {Object} options.clickSimulator - Click simulator module
   * @param {Object} options.keyboardHandler - Keyboard handler module
   * @param {Object} options.targetManager - Target manager module
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    logger.info('Initializing macro recorder');
    
    // Set up macros directory and file path
    const dataDir = path.join(app.getPath('userData'), 'data');
    this._macrosFilePath = path.join(dataDir, 'macros.json');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      logger.info('Creating data directory', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Store dependencies
    this._dependencies = {
      clickSimulator: options.clickSimulator,
      keyboardHandler: options.keyboardHandler,
      targetManager: options.targetManager
    };
    
    // Load macros from storage
    await this.loadMacros();
    
    logger.info('Macro recorder initialized');
  },
  
  /**
   * Loads macros from persistent storage
   * 
   * @returns {Promise<Array>} - The loaded macros
   */
  async loadMacros() {
    try {
      logger.info('Loading macros from storage');
      
      if (!fs.existsSync(this._macrosFilePath)) {
        logger.info('No macros file found, initializing empty array');
        this._macros = [];
        return this._macros;
      }
      
      const fileData = fs.readFileSync(this._macrosFilePath, 'utf-8');
      this._macros = JSON.parse(fileData);
      
      logger.info(`Loaded ${this._macros.length} macros from storage`);
      return this._macros;
    } catch (error) {
      logger.error('Failed to load macros', error);
      this._macros = [];
      return this._macros;
    }
  },
  
  /**
   * Saves macros to persistent storage
   * 
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveMacros() {
    try {
      logger.info(`Saving ${this._macros.length} macros to storage`);
      
      fs.writeFileSync(
        this._macrosFilePath,
        JSON.stringify(this._macros, null, 2),
        'utf-8'
      );
      
      logger.info('Macros saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save macros', error);
      return false;
    }
  },
  
  /**
   * Starts recording a new macro
   * 
   * @param {Object} options - Recording options
   * @param {string} options.name - Name for the new macro
   * @param {string} [options.description] - Optional description
   * @param {string} [options.existingId] - ID of existing macro to update
   * @returns {Promise<Object>} - The created or updated macro object
   */
  async startRecording(options = {}) {
    try {
      if (this._recordingState.isRecording) {
        throw new Error('Already recording a macro');
      }
      
      logger.info('Starting macro recording', { name: options.name });
      
      // Check for existing macro update
      let macro;
      
      if (options.existingId) {
        // Find and update existing macro
        const existingMacroIndex = this._macros.findIndex(m => m.id === options.existingId);
        
        if (existingMacroIndex === -1) {
          logger.warn(`Existing macro not found with ID: ${options.existingId}`);
          // Create new macro instead
          macro = createMacro(options.name, {
            description: options.description || ''
          });
        } else {
          // Update existing macro
          macro = this._macros[existingMacroIndex];
          macro.name = options.name || macro.name;
          macro.description = options.description !== undefined ? options.description : macro.description;
          macro.updatedAt = new Date().toISOString();
          
          // Keep existing steps if not clearing
          if (!options.clearSteps) {
            logger.debug('Keeping existing steps in macro');
          } else {
            logger.debug('Clearing existing steps in macro');
            macro.steps = [];
          }
        }
      } else {
        // Create new macro
        macro = createMacro(options.name, {
          description: options.description || ''
        });
      }
      
      // Update recording state
      this._recordingState.isRecording = true;
      this._recordingState.currentMacro = macro;
      this._recordingState.lastActionTime = Date.now();
      this._recordingState.eventListeners = [];
      this._recordingState.targetIds.clear();
      
      // Set up recording event handlers
      await this._setupRecordingEventHandlers();
      
      logger.info('Macro recording started', { id: macro.id, name: macro.name });
      return macro;
    } catch (error) {
      logger.error('Failed to start macro recording', error);
      throw error;
    }
  },
  
  /**
   * Sets up event handlers for recording user actions
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _setupRecordingEventHandlers() {
    try {
      logger.debug('Setting up recording event handlers');
      
      const { clickSimulator, keyboardHandler } = this._dependencies;
      
      if (!clickSimulator || !keyboardHandler) {
        throw new Error('Missing required dependencies for recording');
      }
      
      // Load existing targets and create mapping for fast lookup
      if (this._dependencies.targetManager) {
        const targets = await this._dependencies.targetManager.getAllTargets();
        
        // Create mapping of coordinates to target IDs
        targets.forEach(target => {
          const key = `${target.coordinates.x},${target.coordinates.y},${target.coordinates.screenId}`;
          this._recordingState.targetIds.set(key, target.id);
        });
        
        logger.debug(`Loaded ${targets.length} targets for recording reference`);
      }
      
      // Set up mouse click handler
      const mouseHandler = (x, y, button, clickCount) => {
        this._recordMouseClick(x, y, button, clickCount);
      };
      
      // Set up key press handler (renamed to avoid shadowing the dependency)
      const keyPressHandler = (key, modifiers) => {
        this._recordKeyPress(key, modifiers);
      };
      
      // Set up text input handler
      const textInputHandler = (text) => {
        this._recordTextInput(text);
      };
      
      // Register handlers with the appropriate modules
      // These would be module-specific API calls
      if (clickSimulator.onSimulatedClick) {
        clickSimulator.onSimulatedClick(mouseHandler);
        this._recordingState.eventListeners.push(() => {
          clickSimulator.offSimulatedClick(mouseHandler);
        });
      }
      
      if (keyboardHandler.onKeyPress) {
        keyboardHandler.onKeyPress(keyPressHandler);
        this._recordingState.eventListeners.push(() => {
          keyboardHandler.offKeyPress(keyPressHandler);
        });
      }
      
      if (keyboardHandler.onTextInput) {
        keyboardHandler.onTextInput(textInputHandler);
        this._recordingState.eventListeners.push(() => {
          keyboardHandler.offTextInput(textInputHandler);
        });
      }
      
      logger.debug('Recording event handlers set up');
    } catch (error) {
      logger.error('Failed to set up recording event handlers', error);
      throw error;
    }
  },
  
  /**
   * Records a mouse click action
   * 
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} button - Mouse button used
   * @param {number} clickCount - Number of clicks
   * @returns {void}
   */
  _recordMouseClick(x, y, button, clickCount) {
    if (!this._recordingState.isRecording || !this._recordingState.currentMacro) {
      return;
    }
    
    logger.debug(`Recording click: ${x}, ${y}, ${button}, ${clickCount}`);
    
    // Get current time for delay calculation
    const now = Date.now();
    
    // Add delay step if needed
    this._addDelayIfNeeded(now);
    
    // Try to find a target that matches these coordinates
    const coord = `${x},${y},0`; // Assuming screen ID 0 for simplicity
    const targetId = this._recordingState.targetIds.get(coord);
    
    // Determine click type
    let clickType = 'left';
    if (button === 'right') {
      clickType = 'right';
    } else if (clickCount === 2) {
      clickType = 'double';
    }
    
    // Create click action
    const clickAction = createClickAction(x, y, {
      targetId,
      clickType,
      clickCount: clickType === 'double' ? 1 : clickCount
    });
    
    // Add to macro steps
    this._addStepToMacro(clickAction);
    
    // Update last action time
    this._recordingState.lastActionTime = now;
  },
  
  /**
   * Records a keyboard key press action
   * 
   * @private
   * @param {string} key - Key that was pressed
   * @param {Object} modifiers - Modifier keys state
   * @returns {void}
   */
  _recordKeyPress(key, modifiers) {
    if (!this._recordingState.isRecording || !this._recordingState.currentMacro) {
      return;
    }
    
    logger.debug(`Recording key press: ${key}`, modifiers);
    
    // Get current time for delay calculation
    const now = Date.now();
    
    // Add delay step if needed
    this._addDelayIfNeeded(now);
    
    // Create keyboard action
    const keyboardAction = createKeyboardAction(key, {
      withShift: modifiers.shift || false,
      withCtrl: modifiers.control || false,
      withAlt: modifiers.alt || false,
      withMeta: modifiers.meta || false
    });
    
    // Add to macro steps
    this._addStepToMacro(keyboardAction);
    
    // Update last action time
    this._recordingState.lastActionTime = now;
  },
  
  /**
   * Records a text input action
   * 
   * @private
   * @param {string} text - Text that was input
   * @returns {void}
   */
  _recordTextInput(text) {
    if (!this._recordingState.isRecording || !this._recordingState.currentMacro) {
      return;
    }
    
    logger.debug(`Recording text input: ${text.length} characters`);
    
    // Get current time for delay calculation
    const now = Date.now();
    
    // Add delay step if needed
    this._addDelayIfNeeded(now);
    
    // Create text input action
    const textAction = createTextInputAction(text);
    
    // Add to macro steps
    this._addStepToMacro(textAction);
    
    // Update last action time
    this._recordingState.lastActionTime = now;
  },
  
  /**
   * Adds a delay step if sufficient time has passed since the last action
   * 
   * @private
   * @param {number} now - Current timestamp
   * @returns {void}
   */
  _addDelayIfNeeded(now) {
    // Calculate time since last action
    const timeSinceLastAction = now - this._recordingState.lastActionTime;
    
    // Only add a delay if it's significant (more than 500ms)
    if (timeSinceLastAction > 500) {
      logger.debug(`Adding delay step: ${timeSinceLastAction}ms`);
      
      // Create delay action
      const delayAction = createDelayAction(timeSinceLastAction);
      
      // Add to macro steps
      this._addStepToMacro(delayAction);
    }
  },
  
  /**
   * Adds a step to the current macro
   * 
   * @private
   * @param {Object} action - Action to add
   * @returns {void}
   */
  _addStepToMacro(action) {
    const macro = this._recordingState.currentMacro;
    if (!macro) return;
    
    // Create a step with the current order
    const stepOrder = macro.steps.length;
    const step = createMacroStep(action, stepOrder);
    
    // Add to macro steps
    macro.steps.push(step);
    
    logger.debug(`Added ${action.type} step to macro`, { stepId: step.id, order: stepOrder });
  },
  
  /**
   * Stops recording the current macro
   * 
   * @returns {Promise<Object>} - The recorded macro
   */
  async stopRecording() {
    try {
      if (!this._recordingState.isRecording) {
        throw new Error('Not currently recording');
      }
      
      logger.info('Stopping macro recording');
      
      const macro = this._recordingState.currentMacro;
      
      if (!macro) {
        throw new Error('No current macro found');
      }
      
      // Clean up recording state and event listeners
      this._recordingState.isRecording = false;
      
      // Remove all event listeners
      this._recordingState.eventListeners.forEach(removeListener => {
        if (typeof removeListener === 'function') {
          removeListener();
        }
      });
      
      // Clear event listeners array
      this._recordingState.eventListeners = [];
      
      // Clear target IDs mapping
      this._recordingState.targetIds.clear();
      
      // Update macro
      macro.updatedAt = new Date().toISOString();
      
      // Update or add macro to the list
      const existingIndex = this._macros.findIndex(m => m.id === macro.id);
      
      if (existingIndex !== -1) {
        this._macros[existingIndex] = macro;
      } else {
        this._macros.push(macro);
      }
      
      // Save macros to storage
      await this.saveMacros();
      
      logger.info('Macro recording stopped', { 
        id: macro.id, 
        name: macro.name,
        steps: macro.steps.length 
      });
      
      return macro;
    } catch (error) {
      logger.error('Failed to stop macro recording', error);
      
      // Clean up state even on error
      this._recordingState.isRecording = false;
      this._recordingState.eventListeners.forEach(removeListener => {
        if (typeof removeListener === 'function') {
          removeListener();
        }
      });
      this._recordingState.eventListeners = [];
      
      throw error;
    }
  },
  
  /**
   * Cancels the current macro recording without saving
   * 
   * @returns {Promise<boolean>} - Whether the cancellation was successful
   */
  async cancelRecording() {
    try {
      if (!this._recordingState.isRecording) {
        logger.warn('Not currently recording, nothing to cancel');
        return true;
      }
      
      logger.info('Canceling macro recording');
      
      // Clean up recording state and event listeners
      this._recordingState.isRecording = false;
      
      // Remove all event listeners
      this._recordingState.eventListeners.forEach(removeListener => {
        if (typeof removeListener === 'function') {
          removeListener();
        }
      });
      
      // Clear event listeners array
      this._recordingState.eventListeners = [];
      
      // Clear target IDs mapping
      this._recordingState.targetIds.clear();
      
      // Clear current macro reference
      this._recordingState.currentMacro = null;
      
      logger.info('Macro recording canceled');
      return true;
    } catch (error) {
      logger.error('Failed to cancel macro recording', error);
      
      // Clean up state even on error
      this._recordingState.isRecording = false;
      this._recordingState.eventListeners = [];
      this._recordingState.currentMacro = null;
      
      return false;
    }
  },
  
  /**
   * Gets all macros
   * 
   * @returns {Promise<Array>} - Array of all macros
   */
  async getAllMacros() {
    try {
      logger.debug('Getting all macros');
      return [...this._macros];
    } catch (error) {
      logger.error('Failed to get all macros', error);
      throw error;
    }
  },
  
  /**
   * Gets a specific macro by ID
   * 
   * @param {string} id - ID of the macro to get
   * @returns {Promise<Object>} - The requested macro
   */
  async getMacro(id) {
    try {
      logger.debug(`Getting macro with ID: ${id}`);
      
      const macro = this._macros.find(m => m.id === id);
      
      if (!macro) {
        logger.warn(`Macro not found with ID: ${id}`);
        return null;
      }
      
      return macro;
    } catch (error) {
      logger.error(`Failed to get macro with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Saves a macro
   * 
   * @param {Object} macroData - Macro data to save
   * @returns {Promise<Object>} - The saved macro
   */
  async saveMacro(macroData) {
    try {
      logger.info('Saving macro', { id: macroData.id, name: macroData.name });
      
      if (!macroData || !macroData.id) {
        throw new Error('Invalid macro data');
      }
      
      // Find existing macro
      const existingIndex = this._macros.findIndex(m => m.id === macroData.id);
      
      // Update timestamp
      macroData.updatedAt = new Date().toISOString();
      
      if (existingIndex !== -1) {
        // Update existing macro
        this._macros[existingIndex] = macroData;
      } else {
        // Add new macro
        this._macros.push(macroData);
      }
      
      // Save to storage
      await this.saveMacros();
      
      logger.info('Macro saved successfully', { id: macroData.id });
      return macroData;
    } catch (error) {
      logger.error('Failed to save macro', error);
      throw error;
    }
  },
  
  /**
   * Deletes a macro
   * 
   * @param {string} id - ID of the macro to delete
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async deleteMacro(id) {
    try {
      logger.info(`Deleting macro with ID: ${id}`);
      
      const macroIndex = this._macros.findIndex(m => m.id === id);
      
      if (macroIndex === -1) {
        logger.warn(`Macro not found with ID: ${id}`);
        return false;
      }
      
      // Remove from array
      this._macros.splice(macroIndex, 1);
      
      // Save to storage
      await this.saveMacros();
      
      logger.info('Macro deleted successfully', { id });
      return true;
    } catch (error) {
      logger.error(`Failed to delete macro with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Clears all macros
   * 
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async clearAllMacros() {
    try {
      logger.info('Clearing all macros');
      
      // Clear macros array
      this._macros = [];
      
      // Save to storage
      await this.saveMacros();
      
      logger.info('All macros cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear all macros', error);
      throw error;
    }
  },
  
  /**
   * Gets the current recording state
   * 
   * @returns {Object} - Current recording state
   */
  getRecordingState() {
    return {
      isRecording: this._recordingState.isRecording,
      currentMacroId: this._recordingState.currentMacro?.id,
      currentMacroName: this._recordingState.currentMacro?.name,
      stepCount: this._recordingState.currentMacro?.steps.length || 0
    };
  },
  
  /**
   * Manually adds an action to the current recording
   * 
   * @param {Object} action - Action to add
   * @returns {Promise<boolean>} - Whether the addition was successful
   */
  async addActionToRecording(action) {
    try {
      if (!this._recordingState.isRecording || !this._recordingState.currentMacro) {
        throw new Error('Not currently recording');
      }
      
      logger.debug(`Manually adding ${action.type} action to recording`);
      
      // Add to macro steps
      this._addStepToMacro(action);
      
      // Update last action time
      this._recordingState.lastActionTime = Date.now();
      
      return true;
    } catch (error) {
      logger.error('Failed to add action to recording', error);
      return false;
    }
  }
};

module.exports = MacroRecorder;
