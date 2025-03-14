/**
 * ipc-renderer.js
 * Handles IPC communication from the renderer process
 */

/**
 * IpcRenderer
 * Wrapper for the contextBridge-exposed API
 */
const IpcRenderer = {
    /**
     * Event listeners registry for cleanup
     * @private
     */
    _listeners: new Map(),
    
    /**
     * Send a message to the main process and get a response
     * 
     * @param {string} channel - The channel to send the message on
     * @param {Object} [args] - Arguments to send with the message
     * @returns {Promise<Object>} - Response from the main process
     */
    async send(channel, ...args) {
      try {
        console.log(`Sending IPC message: ${channel}`, args);
        
        // Send through the preload script's exposed API
        const response = await window.api.send(channel, ...args);
        
        console.log(`Received IPC response: ${channel}`, response);
        return response;
      } catch (error) {
        console.error(`Error sending IPC message: ${channel}`, error);
        throw error;
      }
    },
    
    /**
     * Register a listener for events from the main process
     * 
     * @param {string} channel - The channel to listen on
     * @param {Function} callback - The callback function to invoke
     * @returns {Function} - A function to remove the event listener
     */
    on(channel, callback) {
      try {
        console.log(`Registering IPC listener: ${channel}`);
        
        // Register through the preload script's exposed API
        const subscription = (event, ...args) => {
          console.log(`Received IPC event: ${channel}`, args);
          callback(...args);
        };
        
        const removeListener = window.api.on(channel, subscription);
        
        // Store the remove function for later cleanup
        this._listeners.set(callback, { channel, removeListener });
        
        return () => this.off(channel, callback);
      } catch (error) {
        console.error(`Error registering IPC listener: ${channel}`, error);
        throw error;
      }
    },
    
    /**
     * Remove a previously registered listener
     * 
     * @param {string} channel - The channel the listener was registered on
     * @param {Function} callback - The callback function to remove
     */
    off(channel, callback) {
      try {
        console.log(`Removing IPC listener: ${channel}`);
        
        const listener = this._listeners.get(callback);
        
        if (listener && listener.channel === channel) {
          listener.removeListener();
          this._listeners.delete(callback);
        }
      } catch (error) {
        console.error(`Error removing IPC listener: ${channel}`, error);
      }
    },
    
    /**
     * Register a one-time listener for an event
     * 
     * @param {string} channel - The channel to listen on
     * @param {Function} callback - Function to call when an event is received
     */
    once(channel, callback) {
      try {
        console.log(`Registering one-time IPC listener: ${channel}`);
        
        // Register through the preload script's exposed API
        window.api.once(channel, (...args) => {
          console.log(`Received one-time IPC event: ${channel}`, args);
          callback(...args);
        });
      } catch (error) {
        console.error(`Error registering one-time IPC listener: ${channel}`, error);
        throw error;
      }
    },
    
    /**
     * Remove all listeners for a channel or all channels
     * 
     * @param {string} [channel] - Optional channel to clear listeners for
     */
    removeAllListeners(channel) {
      try {
        if (channel) {
          console.log(`Removing all listeners for channel: ${channel}`);
          
          // Remove listeners for the specified channel
          for (const [callback, listener] of this._listeners.entries()) {
            if (listener.channel === channel) {
              listener.removeListener();
              this._listeners.delete(callback);
            }
          }
        } else {
          console.log('Removing all IPC listeners');
          
          // Remove all listeners
          for (const [_, listener] of this._listeners.entries()) {
            listener.removeListener();
          }
          
          this._listeners.clear();
        }
      } catch (error) {
        console.error(`Error removing IPC listeners`, error);
      }
    },
    
    /**
     * Get available IPC channels (for debugging)
     * 
     * @returns {Object} - Available IPC channels
     */
    getChannels() {
      return window.api.getChannels();
    }
  };
  
  /**
   * Config-specific IPC helpers
   */
  const ConfigIpc = {
    /**
     * Get configuration or a specific configuration value
     * 
     * @param {string} [path] - Optional dot notation path to a specific setting
     * @param {*} [defaultValue] - Default value if the path doesn't exist
     * @returns {Promise<Object>} - The requested configuration
     */
    async getConfig(path, defaultValue) {
      const response = await IpcRenderer.send('config:get', { path, defaultValue });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get configuration');
      }
      
      return response.data;
    },
    
    /**
     * Set a configuration value
     * 
     * @param {string|Object} pathOrConfig - Dot notation path or entire config object
     * @param {*} [value] - Value to set (only if path is a string)
     * @returns {Promise<Object>} - Result of the operation
     */
    async setConfig(pathOrConfig, value) {
      let args;
      
      if (typeof pathOrConfig === 'string') {
        // Setting a specific path
        args = { path: pathOrConfig, value };
      } else if (typeof pathOrConfig === 'object') {
        // Setting entire config
        args = { value: pathOrConfig };
      } else {
        throw new Error('Invalid arguments for setConfig');
      }
      
      const response = await IpcRenderer.send('config:set', args);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set configuration');
      }
      
      return response.data;
    },
    
    /**
     * Save the current configuration
     * 
     * @returns {Promise<Object>} - Result of the operation
     */
    async saveConfig() {
      const response = await IpcRenderer.send('config:save');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save configuration');
      }
      
      return response.data;
    },
    
    /**
     * Reset the configuration to defaults
     * 
     * @returns {Promise<Object>} - The default configuration
     */
    async resetConfig() {
      const response = await IpcRenderer.send('config:reset');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to reset configuration');
      }
      
      return response.data;
    }
  };
  
  /**
   * Target-specific IPC helpers
   */
  const TargetIpc = {
    /**
     * Create or update a target
     * 
     * @param {Object} targetData - Target data to save
     * @returns {Promise<Object>} - The saved target
     */
    async setTarget(targetData) {
      const response = await IpcRenderer.send('target:set', targetData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save target');
      }
      
      return response.data;
    },
    
    /**
     * Get a specific target by ID
     * 
     * @param {string} targetId - ID of the target to get
     * @returns {Promise<Object>} - The requested target
     */
    async getTarget(targetId) {
      const response = await IpcRenderer.send('target:get', { targetId });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get target');
      }
      
      return response.data;
    },
    
    /**
     * Get all targets
     * 
     * @returns {Promise<Array>} - Array of all targets
     */
    async getAllTargets() {
      const response = await IpcRenderer.send('target:get-all');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get targets');
      }
      
      return response.data;
    },
    
    /**
     * Delete a target
     * 
     * @param {string} targetId - ID of the target to delete
     * @returns {Promise<Object>} - Result of the operation
     */
    async deleteTarget(targetId) {
      const response = await IpcRenderer.send('target:delete', { targetId });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete target');
      }
      
      return response.data;
    },
    
    /**
     * Clear all targets
     * 
     * @returns {Promise<Object>} - Result of the operation
     */
    async clearAllTargets() {
      const response = await IpcRenderer.send('target:clear-all');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to clear targets');
      }
      
      return response.data;
    },
    
    /**
     * Test a target (simulate a click)
     * 
     * @param {string} targetId - ID of the target to test
     * @returns {Promise<Object>} - Result of the operation
     */
    async testTarget(targetId) {
      const response = await IpcRenderer.send('target:test', { targetId });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to test target');
      }
      
      return response.data;
    }
  };
  
  /**
   * Macro-specific IPC helpers
   */
  const MacroIpc = {
    /**
     * Start recording a new macro
     * 
     * @param {Object} options - Recording options
     * @returns {Promise<Object>} - Result of the operation
     */
    async startRecording(options = {}) {
      const response = await IpcRenderer.send('macro:start-recording', options);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to start recording');
      }
      
      return response.data;
    },
    
    /**
     * Stop recording the current macro
     * 
     * @returns {Promise<Object>} - The recorded macro
     */
    async stopRecording() {
      const response = await IpcRenderer.send('macro:stop-recording');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to stop recording');
      }
      
      return response.data;
    },
    
    /**
     * Cancel the current recording
     * 
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async cancelRecording() {
      const response = await IpcRenderer.send('macro:cancel-recording');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel recording');
      }
      
      return response.data.cancelled;
    },
    
    /**
     * Get the current recording state
     * 
     * @returns {Promise<Object>} - Current recording state
     */
    async getRecordingState() {
      const response = await IpcRenderer.send('macro:get-recording-state');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get recording state');
      }
      
      return response.data;
    },
    
    /**
     * Get a specific macro by ID
     * 
     * @param {string} macroId - ID of the macro to retrieve
     * @returns {Promise<Object>} - The macro
     */
    async getMacro(macroId) {
      const response = await IpcRenderer.send('macro:get', { macroId });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get macro');
      }
      
      return response.data;
    },
    
    /**
     * Get all macros
     * 
     * @returns {Promise<Array>} - Array of all macros
     */
    async getAllMacros() {
      const response = await IpcRenderer.send('macro:get-all');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get macros');
      }
      
      return response.data;
    },
    
    /**
     * Save a macro
     * 
     * @param {Object} macroData - Macro data to save
     * @returns {Promise<Object>} - The saved macro
     */
    async saveMacro(macroData) {
      const response = await IpcRenderer.send('macro:save', macroData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save macro');
      }
      
      return response.data;
    },
    
    /**
     * Delete a macro
     * 
     * @param {string} macroId - ID of the macro to delete
     * @returns {Promise<Object>} - Result of the operation
     */
    async deleteMacro(macroId) {
      const response = await IpcRenderer.send('macro:delete', { macroId });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete macro');
      }
      
      return response.data;
    },
    
    /**
     * Clear all macros
     * 
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async clearAllMacros() {
      const response = await IpcRenderer.send('macro:clear-all');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to clear all macros');
      }
      
      return response.data.cleared;
    },
    
    /**
     * Add an action to the current recording
     * 
     * @param {Object} action - Action to add
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async addActionToRecording(action) {
      const response = await IpcRenderer.send('macro:add-action', { action });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to add action to recording');
      }
      
      return response.data.added;
    },
    
    /**
     * Play a specific macro
     * 
     * @param {string} macroId - ID of the macro to play
     * @param {Object} options - Playback options
     * @param {number} [options.speed=1.0] - Playback speed multiplier
     * @param {boolean} [options.repeat=false] - Whether to repeat the macro
     * @param {number} [options.repeatCount=1] - Number of times to repeat
     * @param {boolean} [options.suppressErrors=false] - Whether to continue on errors
     * @returns {Promise<Object>} - Result of the operation
     */
    async playMacro(macroId, options = {}) {
      const response = await IpcRenderer.send('macro:play', { 
        macroId,
        speed: options.speed,
        repeat: options.repeat,
        repeatCount: options.repeatCount,
        suppressErrors: options.suppressErrors
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to play macro');
      }
      
      return response.data;
    },
    
    /**
     * Stop the currently playing macro
     * 
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async stopPlayback() {
      const response = await IpcRenderer.send('macro:stop');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to stop macro playback');
      }
      
      return response.data.stopped;
    },
    
    /**
     * Pause the currently playing macro
     * 
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async pausePlayback() {
      const response = await IpcRenderer.send('macro:pause');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to pause macro playback');
      }
      
      return response.data.paused;
    },
    
    /**
     * Resume the currently paused macro
     * 
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async resumePlayback() {
      const response = await IpcRenderer.send('macro:resume');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to resume macro playback');
      }
      
      return response.data.resumed;
    },
    
    /**
     * Set the playback speed
     * 
     * @param {number} speed - Playback speed multiplier
     * @returns {Promise<boolean>} - Whether the operation was successful
     */
    async setPlaybackSpeed(speed) {
      const response = await IpcRenderer.send('macro:set-speed', { speed });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set playback speed');
      }
      
      return response.data.updated;
    },
    
    /**
     * Get the current playback state
     * 
     * @returns {Promise<Object>} - Current playback state
     */
    async getPlaybackState() {
      const response = await IpcRenderer.send('macro:get-playback-state');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get playback state');
      }
      
      return response.data;
    }
  };
  
  /**
   * System-specific IPC helpers
   */
  const SystemIpc = {
    /**
     * Quit the application
     * 
     * @returns {Promise<Object>} - Result of the operation
     */
    async quit() {
      return await IpcRenderer.send('system:quit');
    },
    
    /**
     * Minimize the window
     * 
     * @returns {Promise<Object>} - Result of the operation
     */
    async minimize() {
      return await IpcRenderer.send('system:minimize');
    },
    
    /**
     * Get information about all displays
     * 
     * @returns {Promise<Array>} - Array of display information
     */
    async getDisplays() {
      const response = await IpcRenderer.send('system:get-displays');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get display information');
      }
      
      return response.data;
    }
  };
  
  // Export all IPC modules
  export {
    IpcRenderer,
    ConfigIpc,
    TargetIpc,
    MacroIpc,
    SystemIpc
  };
  
  // Default export
  export default IpcRenderer;