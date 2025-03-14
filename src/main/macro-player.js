/**
 * macro-player.js
 * Handles playback of recorded macros
 */

const { app } = require('electron');
const { createLogger } = require('../../utils/logger');

// Initialize logger
const logger = createLogger('MacroPlayer');

/**
 * Macro Player
 * Plays back recorded macros and manages playback state
 */
const MacroPlayer = {
  /**
   * Dependencies
   * @private
   */
  _dependencies: {
    macroRecorder: null,
    clickSimulator: null,
    keyboardHandler: null,
    targetManager: null
  },
  
  /**
   * Playback state
   * @private
   */
  _playbackState: {
    isPlaying: false,
    currentMacro: null,
    currentStepIndex: 0,
    playbackSpeed: 1.0,
    shouldPause: false,
    shouldStop: false,
    timeoutId: null,
    stepPromises: [],
    listeners: new Map()
  },
  
  /**
   * Initializes the macro player
   * 
   * @param {Object} options - Initialization options
   * @param {Object} options.macroRecorder - Macro recorder module
   * @param {Object} options.clickSimulator - Click simulator module
   * @param {Object} options.keyboardHandler - Keyboard handler module
   * @param {Object} options.targetManager - Target manager module
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    logger.info('Initializing macro player');
    
    // Store dependencies
    this._dependencies = {
      macroRecorder: options.macroRecorder,
      clickSimulator: options.clickSimulator,
      keyboardHandler: options.keyboardHandler,
      targetManager: options.targetManager
    };
    
    // Check for required dependencies
    if (!this._dependencies.clickSimulator) {
      throw new Error('Click simulator is required for macro playback');
    }
    
    if (!this._dependencies.keyboardHandler) {
      throw new Error('Keyboard handler is required for macro playback');
    }
    
    // Set up cancel handler (for Escape key)
    const cancelHandler = () => {
      if (this._playbackState.isPlaying) {
        this.stopPlayback();
      }
    };
    
    if (this._dependencies.keyboardHandler.setCancelHandler) {
      this._dependencies.keyboardHandler.setCancelHandler(cancelHandler);
    }
    
    logger.info('Macro player initialized');
  },
  
  /**
   * Plays a macro
   * 
   * @param {string|Object} macroIdOrObject - Macro ID or macro object to play
   * @param {Object} options - Playback options
   * @param {number} [options.speed=1.0] - Playback speed multiplier
   * @param {boolean} [options.repeat=false] - Whether to repeat the macro
   * @param {number} [options.repeatCount=1] - Number of times to repeat
   * @param {boolean} [options.suppressErrors=false] - Whether to continue on errors
   * @returns {Promise<Object>} - Playback result information
   */
  async playMacro(macroIdOrObject, options = {}) {
    try {
      // Check if already playing
      if (this._playbackState.isPlaying) {
        throw new Error('Already playing a macro');
      }
      
      // Get the macro
      let macro;
      
      if (typeof macroIdOrObject === 'string') {
        // Load by ID
        if (!this._dependencies.macroRecorder) {
          throw new Error('Macro recorder is required to load macros by ID');
        }
        
        macro = await this._dependencies.macroRecorder.getMacro(macroIdOrObject);
        
        if (!macro) {
          throw new Error(`Macro not found with ID: ${macroIdOrObject}`);
        }
      } else if (typeof macroIdOrObject === 'object' && macroIdOrObject !== null) {
        // Use provided macro object
        macro = macroIdOrObject;
      } else {
        throw new Error('Invalid macro: must provide ID or macro object');
      }
      
      // Check if macro has steps
      if (!macro.steps || macro.steps.length === 0) {
        throw new Error('Cannot play a macro with no steps');
      }
      
      logger.info(`Starting playback of macro: ${macro.name}`, { 
        id: macro.id, 
        steps: macro.steps.length 
      });
      
      // Reset playback state
      this._resetPlaybackState();
      
      // Set up playback options
      this._playbackState.isPlaying = true;
      this._playbackState.currentMacro = macro;
      this._playbackState.playbackSpeed = options.speed || 1.0;
      this._playbackState.repeat = options.repeat || false;
      this._playbackState.repeatCount = options.repeatCount || 1;
      this._playbackState.repeatIterations = 0;
      this._playbackState.suppressErrors = options.suppressErrors || false;
      
      // Notify listeners about playback start
      this._notifyListeners('playbackStart', {
        macroId: macro.id,
        macroName: macro.name,
        totalSteps: macro.steps.length
      });
      
      // Start playback
      let result;
      try {
        result = await this._executePlayback();
      } catch (error) {
        // Handle playback error
        logger.error('Error during macro playback', error);
        
        // Notify listeners about error
        this._notifyListeners('playbackError', {
          error: error.message,
          step: this._playbackState.currentStepIndex
        });
        
        throw error;
      } finally {
        // Clean up state
        this._playbackState.isPlaying = false;
        this._playbackState.shouldStop = false;
        this._playbackState.shouldPause = false;
        
        // Clear timeouts
        if (this._playbackState.timeoutId) {
          clearTimeout(this._playbackState.timeoutId);
          this._playbackState.timeoutId = null;
        }
      }
      
      // Notify listeners about playback complete
      this._notifyListeners('playbackComplete', {
        macroId: macro.id,
        macroName: macro.name,
        stepsExecuted: result.stepsExecuted,
        totalSteps: macro.steps.length,
        iterations: result.iterations,
        success: result.success
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to play macro', error);
      
      // Clean up state on error
      this._resetPlaybackState();
      
      throw error;
    }
  },
  
  /**
   * Executes the playback of the current macro
   * 
   * @private
   * @returns {Promise<Object>} - Playback result information
   */
  async _executePlayback() {
    const macro = this._playbackState.currentMacro;
    let iterations = 0;
    let stepsExecuted = 0;
    let result = { success: true };
    
    try {
      // Sort steps by order
      const steps = [...macro.steps].sort((a, b) => a.order - b.order);
      
      do {
        iterations++;
        this._playbackState.repeatIterations = iterations;
        
        // Reset step index for this iteration
        this._playbackState.currentStepIndex = 0;
        
        // Execute each step in order
        for (let i = 0; i < steps.length; i++) {
          // Check if we should stop
          if (this._playbackState.shouldStop) {
            logger.info('Playback stopped by user');
            return {
              success: false,
              stopped: true,
              stepsExecuted,
              iterations
            };
          }
          
          // Check if we should pause
          while (this._playbackState.shouldPause) {
            await this._sleep(100);
            
            // Check if pause turned into stop
            if (this._playbackState.shouldStop) {
              logger.info('Playback stopped while paused');
              return {
                success: false,
                stopped: true,
                stepsExecuted,
                iterations
              };
            }
          }
          
          const step = steps[i];
          this._playbackState.currentStepIndex = i;
          
          // Notify listeners about step start
          this._notifyListeners('stepStart', {
            stepIndex: i,
            totalSteps: steps.length,
            stepType: step.action.type,
            iteration: iterations
          });
          
          // Execute the step
          try {
            await this._executeStep(step);
            stepsExecuted++;
            
            // Notify listeners about step complete
            this._notifyListeners('stepComplete', {
              stepIndex: i,
              totalSteps: steps.length,
              success: true
            });
          } catch (error) {
            logger.error(`Error executing step ${i}`, error);
            
            // Notify listeners about step error
            this._notifyListeners('stepError', {
              stepIndex: i,
              totalSteps: steps.length,
              error: error.message
            });
            
            // Stop if errors shouldn't be suppressed
            if (!this._playbackState.suppressErrors) {
              return {
                success: false,
                error: error.message,
                stepsExecuted,
                iterations
              };
            }
          }
        }
        
        // Notify listeners about iteration complete
        this._notifyListeners('iterationComplete', {
          iteration: iterations,
          totalIterations: this._playbackState.repeatCount
        });
        
      } while (
        this._playbackState.repeat && 
        iterations < this._playbackState.repeatCount &&
        !this._playbackState.shouldStop
      );
      
      return {
        success: true,
        stepsExecuted,
        iterations
      };
    } catch (error) {
      logger.error('Error in playback execution', error);
      return {
        success: false,
        error: error.message,
        stepsExecuted,
        iterations
      };
    }
  },
  
  /**
   * Executes a single macro step
   * 
   * @private
   * @param {Object} step - Macro step to execute
   * @returns {Promise<void>}
   */
  async _executeStep(step) {
    const { action } = step;
    
    logger.debug(`Executing step: ${action.type}`, { stepId: step.id });
    
    switch (action.type) {
      case 'click':
        await this._executeClickAction(action);
        break;
        
      case 'keyboard':
        await this._executeKeyboardAction(action);
        break;
        
      case 'text':
        await this._executeTextAction(action);
        break;
        
      case 'delay':
        await this._executeDelayAction(action);
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  },
  
  /**
   * Executes a click action
   * 
   * @private
   * @param {Object} action - Click action to execute
   * @returns {Promise<void>}
   */
  async _executeClickAction(action) {
    logger.debug(`Executing click action`, action);
    
    const { clickSimulator, targetManager } = this._dependencies;
    
    // If action has a targetId, try to resolve it
    if (action.targetId && targetManager) {
      try {
        const target = await targetManager.getTarget(action.targetId);
        
        if (target) {
          // Get global coordinates for the target
          const screens = await targetManager.getAllScreens();
          const globalCoords = targetManager.screenToGlobalCoordinates(
            target.coordinates,
            screens
          );
          
          // Simulate the click
          await clickSimulator.simulateClick(
            globalCoords.x,
            globalCoords.y,
            {
              clickType: action.clickType || target.clickType,
              clickCount: action.clickCount || target.clickCount
            }
          );
          
          return;
        }
      } catch (error) {
        logger.warn(`Failed to resolve target: ${action.targetId}`, error);
        // Continue with direct click using action coordinates
      }
    }
    
    // Direct click using action coordinates
    await clickSimulator.simulateClick(
      action.x,
      action.y,
      {
        clickType: action.clickType || 'left',
        clickCount: action.clickCount || 1
      }
    );
  },
  
  /**
   * Executes a keyboard action
   * 
   * @private
   * @param {Object} action - Keyboard action to execute
   * @returns {Promise<void>}
   */
  async _executeKeyboardAction(action) {
    logger.debug(`Executing keyboard action`, action);
    
    const { keyboardHandler } = this._dependencies;
    
    // Simulate the keystroke with modifiers
    await keyboardHandler.simulateKeystroke(action.key, {
      shift: action.withShift,
      control: action.withCtrl,
      alt: action.withAlt,
      meta: action.withMeta
    });
  },
  
  /**
   * Executes a text input action
   * 
   * @private
   * @param {Object} action - Text input action to execute
   * @returns {Promise<void>}
   */
  async _executeTextAction(action) {
    logger.debug(`Executing text input action`, { textLength: action.text.length });
    
    const { keyboardHandler } = this._dependencies;
    
    // Simulate typing the text
    await keyboardHandler.simulateTyping(action.text);
  },
  
  /**
   * Executes a delay action
   * 
   * @private
   * @param {Object} action - Delay action to execute
   * @returns {Promise<void>}
   */
  async _executeDelayAction(action) {
    const delay = action.duration;
    const adjustedDelay = Math.round(delay / this._playbackState.playbackSpeed);
    
    logger.debug(`Executing delay action: ${delay}ms (adjusted: ${adjustedDelay}ms)`);
    
    // Return a promise that resolves after the delay
    return new Promise(resolve => {
      this._playbackState.timeoutId = setTimeout(resolve, adjustedDelay);
    });
  },
  
  /**
   * Pauses the current playback
   * 
   * @returns {Promise<boolean>} - Whether the pause was successful
   */
  async pausePlayback() {
    try {
      logger.info('Pausing macro playback');
      
      if (!this._playbackState.isPlaying) {
        logger.warn('Cannot pause: no active playback');
        return false;
      }
      
      if (this._playbackState.shouldPause) {
        logger.warn('Playback is already paused');
        return true;
      }
      
      // Set pause flag
      this._playbackState.shouldPause = true;
      
      // Notify listeners
      this._notifyListeners('playbackPaused', {
        stepIndex: this._playbackState.currentStepIndex,
        macroId: this._playbackState.currentMacro.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to pause playback', error);
      return false;
    }
  },
  
  /**
   * Resumes a paused playback
   * 
   * @returns {Promise<boolean>} - Whether the resume was successful
   */
  async resumePlayback() {
    try {
      logger.info('Resuming macro playback');
      
      if (!this._playbackState.isPlaying) {
        logger.warn('Cannot resume: no active playback');
        return false;
      }
      
      if (!this._playbackState.shouldPause) {
        logger.warn('Playback is not paused');
        return true;
      }
      
      // Clear pause flag
      this._playbackState.shouldPause = false;
      
      // Notify listeners
      this._notifyListeners('playbackResumed', {
        stepIndex: this._playbackState.currentStepIndex,
        macroId: this._playbackState.currentMacro.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to resume playback', error);
      return false;
    }
  },
  
  /**
   * Stops the current playback
   * 
   * @returns {Promise<boolean>} - Whether the stop was successful
   */
  async stopPlayback() {
    try {
      logger.info('Stopping macro playback');
      
      if (!this._playbackState.isPlaying) {
        logger.warn('Cannot stop: no active playback');
        return false;
      }
      
      // Set stop flag
      this._playbackState.shouldStop = true;
      
      // Clear pause flag if set
      this._playbackState.shouldPause = false;
      
      // Clear any active timeout
      if (this._playbackState.timeoutId) {
        clearTimeout(this._playbackState.timeoutId);
        this._playbackState.timeoutId = null;
      }
      
      // Cancel all pending step promises
      this._playbackState.stepPromises.forEach(promise => {
        if (promise.cancel && typeof promise.cancel === 'function') {
          promise.cancel();
        }
      });
      this._playbackState.stepPromises = [];
      
      // Notify listeners
      this._notifyListeners('playbackStopped', {
        stepIndex: this._playbackState.currentStepIndex,
        macroId: this._playbackState.currentMacro.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to stop playback', error);
      
      // Force reset state on error
      this._resetPlaybackState();
      
      return false;
    }
  },
  
  /**
   * Changes the playback speed
   * 
   * @param {number} speed - New playback speed multiplier (0.25-4.0)
   * @returns {boolean} - Whether the speed change was successful
   */
  setPlaybackSpeed(speed) {
    try {
      // Validate speed
      if (typeof speed !== 'number' || speed <= 0) {
        throw new Error('Speed must be a positive number');
      }
      
      // Clamp speed to reasonable range
      const clampedSpeed = Math.min(Math.max(speed, 0.25), 4.0);
      
      logger.info(`Setting playback speed to ${clampedSpeed}x`);
      
      // Update speed
      this._playbackState.playbackSpeed = clampedSpeed;
      
      // Notify listeners if playing
      if (this._playbackState.isPlaying) {
        this._notifyListeners('speedChanged', {
          speed: clampedSpeed,
          macroId: this._playbackState.currentMacro.id
        });
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to set playback speed', error);
      return false;
    }
  },
  
  /**
   * Registers a listener for playback events
   * 
   * @param {string} event - Event type to listen for
   * @param {Function} callback - Callback function
   * @returns {string} - Listener ID for unregistering
   */
  addListener(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    // Generate a unique listener ID
    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create event map if it doesn't exist
    if (!this._playbackState.listeners.has(event)) {
      this._playbackState.listeners.set(event, new Map());
    }
    
    // Add listener
    const eventListeners = this._playbackState.listeners.get(event);
    eventListeners.set(listenerId, callback);
    
    logger.debug(`Added listener for event: ${event}`, { listenerId });
    
    return listenerId;
  },
  
  /**
   * Removes a listener
   * 
   * @param {string} event - Event type
   * @param {string} listenerId - Listener ID to remove
   * @returns {boolean} - Whether the listener was removed
   */
  removeListener(event, listenerId) {
    if (!this._playbackState.listeners.has(event)) {
      return false;
    }
    
    const eventListeners = this._playbackState.listeners.get(event);
    const result = eventListeners.delete(listenerId);
    
    if (result) {
      logger.debug(`Removed listener for event: ${event}`, { listenerId });
    }
    
    return result;
  },
  
  /**
   * Notifies all listeners for an event
   * 
   * @private
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @returns {void}
   */
  _notifyListeners(event, data) {
    if (!this._playbackState.listeners.has(event)) {
      return;
    }
    
    const eventListeners = this._playbackState.listeners.get(event);
    
    // Call each listener with the event data
    eventListeners.forEach((callback, listenerId) => {
      try {
        callback({ ...data, event });
      } catch (error) {
        logger.error(`Error in listener for event: ${event}`, { listenerId, error });
      }
    });
  },
  
  /**
   * Resets the playback state
   * 
   * @private
   * @returns {void}
   */
  _resetPlaybackState() {
    // Clear any active timeout
    if (this._playbackState.timeoutId) {
      clearTimeout(this._playbackState.timeoutId);
    }
    
    // Reset state
    this._playbackState = {
      isPlaying: false,
      currentMacro: null,
      currentStepIndex: 0,
      playbackSpeed: 1.0,
      shouldPause: false,
      shouldStop: false,
      timeoutId: null,
      stepPromises: [],
      listeners: this._playbackState.listeners // Keep listeners
    };
  },
  
  /**
   * Utility sleep function
   * 
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Gets the current playback state
   * 
   * @returns {Object} - Current playback state
   */
  getPlaybackState() {
    const { isPlaying, currentMacro, currentStepIndex, playbackSpeed, shouldPause } = this._playbackState;
    
    return {
      isPlaying,
      isPaused: isPlaying && shouldPause,
      currentMacroId: currentMacro?.id,
      currentMacroName: currentMacro?.name,
      currentStepIndex,
      totalSteps: currentMacro?.steps.length || 0,
      playbackSpeed,
      iteration: this._playbackState.repeatIterations || 0,
      totalIterations: this._playbackState.repeatCount || 1
    };
  }
};

module.exports = MacroPlayer;