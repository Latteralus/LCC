/**
 * ipc-main-handler.js
 * Sets up IPC (Inter-Process Communication) handlers for the main process
 */

const { ipcMain } = require('electron');
const { 
  CONFIG_CHANNELS, 
  TARGET_CHANNELS, 
  MACRO_CHANNELS, 
  UI_CHANNELS, 
  SYSTEM_CHANNELS,
  successResponse,
  errorResponse
} = require('../../types/ipc-types');
const { createLogger } = require('../../utils/logger');

// Initialize logger
const logger = createLogger('IpcMainHandler');

/**
 * IPC Main Handler
 * Manages IPC communication in the main process
 */
const IpcMainHandler = {
  /**
   * References to module handlers
   * @private
   */
  _handlers: {
    configManager: null,
    targetManager: null,
    macroRecorder: null,
    macroPlayer: null,
    keyboardHandler: null
  },
  
  /**
   * Initializes the IPC handler with necessary module references
   * 
   * @param {Object} handlers - Object containing module references
   * @returns {void}
   */
  initialize(handlers) {
    logger.info('Initializing IPC main handler');
    
    // Store module references
    this._handlers = { ...this._handlers, ...handlers };
    
    // Register all IPC handlers
    this._registerConfigHandlers();
    this._registerTargetHandlers();
    this._registerMacroHandlers();
    this._registerUIHandlers();
    this._registerSystemHandlers();
    
    logger.info('IPC main handler initialized');
  },
  
  /**
   * Registers configuration-related IPC handlers
   * 
   * @private
   * @returns {void}
   */
  _registerConfigHandlers() {
    const { configManager } = this._handlers;
    
    if (!configManager) {
      logger.warn('Config manager not provided, skipping config handlers');
      return;
    }
    
    // Get config or specific config value
    ipcMain.handle(CONFIG_CHANNELS.GET, async (event, args) => {
      try {
        logger.debug('Handling config:get', args);
        
        const path = args && args.path;
        const defaultValue = args && args.defaultValue;
        
        const configValue = configManager.get(path, defaultValue);
        return successResponse(configValue);
      } catch (error) {
        logger.error('Error handling config:get', error);
        return errorResponse(error.message);
      }
    });
    
    // Set config values
    ipcMain.handle(CONFIG_CHANNELS.SET, async (event, args) => {
      try {
        logger.debug('Handling config:set', args);
        
        if (!args) {
          throw new Error('No arguments provided for config:set');
        }
        
        const path = args.path;
        const value = args.value;
        
        // Handle different formats
        let success;
        if (path && value !== undefined) {
          // Setting a specific path
          success = configManager.set(path, value);
        } else if (!path && args.value && typeof args.value === 'object') {
          // Setting entire config
          success = configManager.set('', args.value);
        } else {
          throw new Error('Invalid arguments for config:set');
        }
        
        if (success) {
          // Save after successful set
          await configManager.save();
          return successResponse({ updated: true });
        } else {
          return errorResponse('Failed to update configuration');
        }
      } catch (error) {
        logger.error('Error handling config:set', error);
        return errorResponse(error.message);
      }
    });
    
    // Save config
    ipcMain.handle(CONFIG_CHANNELS.SAVE, async () => {
      try {
        logger.debug('Handling config:save');
        
        const success = await configManager.save();
        
        if (success) {
          return successResponse({ saved: true });
        } else {
          return errorResponse('Failed to save configuration');
        }
      } catch (error) {
        logger.error('Error handling config:save', error);
        return errorResponse(error.message);
      }
    });
    
    // Reset to default config
    ipcMain.handle(CONFIG_CHANNELS.RESET, async () => {
      try {
        logger.debug('Handling config:reset');
        
        const defaultConfig = configManager.reset();
        await configManager.save();
        
        return successResponse(defaultConfig);
      } catch (error) {
        logger.error('Error handling config:reset', error);
        return errorResponse(error.message);
      }
    });
  },
  
  /**
   * Registers target-related IPC handlers
   * 
   * @private
   * @returns {void}
   */
  _registerTargetHandlers() {
    const { targetManager } = this._handlers;
    
    if (!targetManager) {
      logger.warn('Target manager not provided, skipping target handlers');
      return;
    }
    
    // Create or update a target
    ipcMain.handle(TARGET_CHANNELS.SET, async (event, args) => {
      try {
        logger.debug('Handling target:set', args);
        
        if (!args) {
          throw new Error('No arguments provided for target:set');
        }
        
        let result;
        
        if (args.id) {
          // Update existing target
          result = await targetManager.updateTarget(args.id, args);
        } else {
          // Create new target
          result = await targetManager.createTarget(args);
        }
        
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling target:set', error);
        return errorResponse(error.message);
      }
    });
    
    // Get a specific target
    ipcMain.handle(TARGET_CHANNELS.GET, async (event, args) => {
      try {
        logger.debug('Handling target:get', args);
        
        if (!args || !args.targetId) {
          throw new Error('Target ID is required');
        }
        
        const target = await targetManager.getTarget(args.targetId);
        
        if (!target) {
          return errorResponse('Target not found');
        }
        
        return successResponse(target);
      } catch (error) {
        logger.error('Error handling target:get', error);
        return errorResponse(error.message);
      }
    });
    
    // Get all targets
    ipcMain.handle(TARGET_CHANNELS.GET_ALL, async () => {
      try {
        logger.debug('Handling target:get-all');
        
        const targets = await targetManager.getAllTargets();
        return successResponse(targets);
      } catch (error) {
        logger.error('Error handling target:get-all', error);
        return errorResponse(error.message);
      }
    });
    
    // Delete a target
    ipcMain.handle(TARGET_CHANNELS.DELETE, async (event, args) => {
      try {
        logger.debug('Handling target:delete', args);
        
        if (!args || !args.targetId) {
          throw new Error('Target ID is required');
        }
        
        const success = await targetManager.deleteTarget(args.targetId);
        
        if (!success) {
          return errorResponse('Failed to delete target');
        }
        
        return successResponse({ deleted: true });
      } catch (error) {
        logger.error('Error handling target:delete', error);
        return errorResponse(error.message);
      }
    });
    
    // Clear all targets
    ipcMain.handle(TARGET_CHANNELS.CLEAR_ALL, async () => {
      try {
        logger.debug('Handling target:clear-all');
        
        const success = await targetManager.clearAllTargets();
        
        if (!success) {
          return errorResponse('Failed to clear targets');
        }
        
        return successResponse({ cleared: true });
      } catch (error) {
        logger.error('Error handling target:clear-all', error);
        return errorResponse(error.message);
      }
    });
    
    // Test a target (simulate a click)
    ipcMain.handle('target:test', async (event, args) => {
      try {
        logger.debug('Handling target:test', args);
        
        if (!args || !args.targetId) {
          throw new Error('Target ID is required');
        }
        
        const success = await targetManager.testTarget(args.targetId);
        
        if (!success) {
          return errorResponse('Failed to test target');
        }
        
        return successResponse({ tested: true });
      } catch (error) {
        logger.error('Error handling target:test', error);
        return errorResponse(error.message);
      }
    });
  },
  
  /**
   * Registers macro-related IPC handlers
   * 
   * @private
   * @returns {void}
   */
  _registerMacroHandlers() {
    const { macroRecorder, macroPlayer } = this._handlers;
    
    if (!macroRecorder) {
      logger.warn('Macro recorder not provided, skipping macro recording handlers');
      return;
    }
    
    // Start recording a new macro
    ipcMain.handle(MACRO_CHANNELS.START_RECORDING, async (event, args) => {
      try {
        logger.debug('Handling macro:start-recording', args);
        
        const result = await macroRecorder.startRecording(args);
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling macro:start-recording', error);
        return errorResponse(error.message);
      }
    });
    
    // Stop recording the current macro
    ipcMain.handle(MACRO_CHANNELS.STOP_RECORDING, async () => {
      try {
        logger.debug('Handling macro:stop-recording');
        
        const result = await macroRecorder.stopRecording();
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling macro:stop-recording', error);
        return errorResponse(error.message);
      }
    });
    
    // Play a specific macro
    ipcMain.handle(MACRO_CHANNELS.PLAY, async (event, args) => {
      try {
        logger.debug('Handling macro:play', args);
        
        if (!args || !args.macroId) {
          throw new Error('Macro ID is required');
        }
        
        if (!macroPlayer) {
          throw new Error('Macro player not initialized');
        }
        
        const result = await macroPlayer.playMacro(args.macroId);
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling macro:play', error);
        return errorResponse(error.message);
      }
    });
    
    // Stop the currently playing macro
    ipcMain.handle(MACRO_CHANNELS.STOP, async () => {
      try {
        logger.debug('Handling macro:stop');
        
        if (!macroPlayer) {
          throw new Error('Macro player not initialized');
        }
        
        const result = await macroPlayer.stopPlayback();
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling macro:stop', error);
        return errorResponse(error.message);
      }
    });
    
    // Get all macros
    ipcMain.handle(MACRO_CHANNELS.GET_ALL, async () => {
      try {
        logger.debug('Handling macro:get-all');
        
        const macros = await macroRecorder.getAllMacros();
        return successResponse(macros);
      } catch (error) {
        logger.error('Error handling macro:get-all', error);
        return errorResponse(error.message);
      }
    });
    
    // Save a macro
    ipcMain.handle(MACRO_CHANNELS.SAVE, async (event, args) => {
      try {
        logger.debug('Handling macro:save', args);
        
        if (!args) {
          throw new Error('No macro data provided');
        }
        
        const result = await macroRecorder.saveMacro(args);
        return successResponse(result);
      } catch (error) {
        logger.error('Error handling macro:save', error);
        return errorResponse(error.message);
      }
    });
    
    // Delete a macro
    ipcMain.handle(MACRO_CHANNELS.DELETE, async (event, args) => {
      try {
        logger.debug('Handling macro:delete', args);
        
        if (!args || !args.macroId) {
          throw new Error('Macro ID is required');
        }
        
        const success = await macroRecorder.deleteMacro(args.macroId);
        
        if (!success) {
          return errorResponse('Failed to delete macro');
        }
        
        return successResponse({ deleted: true });
      } catch (error) {
        logger.error('Error handling macro:delete', error);
        return errorResponse(error.message);
      }
    });
  },
  
  /**
   * Registers UI-related IPC handlers
   * 
   * @private
   * @returns {void}
   */
  _registerUIHandlers() {
    // Toggle targeting mode
    ipcMain.handle(UI_CHANNELS.TOGGLE_TARGETING_MODE, async (event, args) => {
      try {
        logger.debug('Handling ui:toggle-targeting-mode', args);
        
        // This would normally interact with a targeting mode manager
        // For now, we'll just echo back the toggle state
        const isEnabled = args && args.enabled;
        
        // Notify all windows about the state change
        event.sender.send(UI_CHANNELS.TARGETING_MODE_CHANGED, { enabled: isEnabled });
        
        return successResponse({ enabled: isEnabled });
      } catch (error) {
        logger.error('Error handling ui:toggle-targeting-mode', error);
        return errorResponse(error.message);
      }
    });
  },
  
  /**
   * Registers system-related IPC handlers
   * 
   * @private
   * @returns {void}
   */
  _registerSystemHandlers() {
    const { app } = require('electron');
    
    // Quit application
    ipcMain.handle(SYSTEM_CHANNELS.QUIT, () => {
      try {
        logger.info('Handling system:quit');
        app.quit();
        return successResponse({ quitting: true });
      } catch (error) {
        logger.error('Error handling system:quit', error);
        return errorResponse(error.message);
      }
    });
    
    // Minimize window
    ipcMain.handle(SYSTEM_CHANNELS.MINIMIZE, (event) => {
      try {
        logger.debug('Handling system:minimize');
        
        const win = event.sender.getOwnerBrowserWindow();
        if (win) {
          win.minimize();
          return successResponse({ minimized: true });
        } else {
          return errorResponse('Window not found');
        }
      } catch (error) {
        logger.error('Error handling system:minimize', error);
        return errorResponse(error.message);
      }
    });
    
    // Get display information
    ipcMain.handle(SYSTEM_CHANNELS.GET_DISPLAYS, () => {
      try {
        logger.debug('Handling system:get-displays');
        
        const { screen } = require('electron');
        const displays = screen.getAllDisplays().map(display => ({
          id: display.id,
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
          isPrimary: display.id === screen.getPrimaryDisplay().id,
          scaleFactor: display.scaleFactor
        }));
        
        return successResponse(displays);
      } catch (error) {
        logger.error('Error handling system:get-displays', error);
        return errorResponse(error.message);
      }
    });
  }
};

module.exports = IpcMainHandler;