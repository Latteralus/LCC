/**
 * macro-ui.js
 * Handles macro-specific UI interactions and DOM manipulation
 */

import { MacroIpc, IpcRenderer } from './ipc-renderer.js';

/**
 * Macro UI Controller
 * Manages UI elements related to macros
 */
const MacroUI = {
  /**
   * Macro state
   * @private
   */
  _state: {
    macros: [],
    currentMacro: null,
    isRecording: false,
    isPlaying: false,
    isPaused: false,
    recordingUpdateInterval: null,
    playbackUpdateInterval: null
  },
  
  /**
   * DOM elements
   * @private
   */
  _elements: {
    recordMacroButton: null,
    stopRecordingButton: null,
    macrosList: null,
    noMacrosMessage: null,
    cancelButton: null
  },
  
  /**
   * Initializes the macro UI controller
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing macro UI controller');
    
    // Cache DOM elements
    this._cacheElements();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Load macros
    await this._loadMacros();
    
    console.log('Macro UI controller initialized');
  },
  
  /**
   * Caches frequently used DOM elements
   * 
   * @private
   * @returns {void}
   */
  _cacheElements() {
    this._elements.recordMacroButton = document.getElementById('record-macro');
    this._elements.stopRecordingButton = document.getElementById('stop-recording');
    this._elements.macrosList = document.getElementById('macros-list');
    this._elements.noMacrosMessage = document.querySelector('.no-macros-message');
    this._elements.cancelButton = document.getElementById('cancel-button');
  },
  
  /**
   * Sets up UI event listeners
   * 
   * @private
   * @returns {void}
   */
  _setupEventListeners() {
    // Record macro button
    if (this._elements.recordMacroButton) {
      this._elements.recordMacroButton.addEventListener('click', () => this.startRecording());
    }
    
    // Stop recording button
    if (this._elements.stopRecordingButton) {
      this._elements.stopRecordingButton.addEventListener('click', () => this.stopRecording());
    }
    
    // Cancel button
    if (this._elements.cancelButton) {
      this._elements.cancelButton.addEventListener('click', () => {
        if (this._state.isPlaying) {
          this.stopPlayback();
        }
        if (this._state.isRecording) {
          this.cancelRecording();
        }
      });
    }
    
    // Keyboard events
    document.addEventListener('keydown', event => {
      // Escape key to cancel recording/playback
      if (event.key === 'Escape') {
        if (this._state.isPlaying) {
          this.stopPlayback();
          event.preventDefault();
        }
        if (this._state.isRecording) {
          // Confirm before canceling recording
          if (confirm('Cancel macro recording? All recorded steps will be lost.')) {
            this.cancelRecording();
          }
          event.preventDefault();
        }
      }
      
      // Space key to pause/resume playback
      if (event.key === ' ' && this._state.isPlaying) {
        if (this._state.isPaused) {
          this.resumePlayback();
        } else {
          this.pausePlayback();
        }
        event.preventDefault();
      }
      
      // Speed adjustment keys (+ and - keys)
      if (this._state.isPlaying) {
        if (event.key === '+' || event.key === '=') {
          // Increase speed by 0.25x
          const state = this.getPlaybackState();
          const newSpeed = Math.min(state.playbackSpeed + 0.25, 4.0);
          this.setPlaybackSpeed(newSpeed);
          event.preventDefault();
        } else if (event.key === '-' || event.key === '_') {
          // Decrease speed by 0.25x
          const state = this.getPlaybackState();
          const newSpeed = Math.max(state.playbackSpeed - 0.25, 0.25);
          this.setPlaybackSpeed(newSpeed);
          event.preventDefault();
        }
      }
    });
    
    // Add IPC listeners for playback events
    IpcRenderer.on('macro:playback-progress', (data) => {
      if (data && data.stepIndex !== undefined) {
        // Update playback UI
        this._updatePlaybackIndicator({
          currentStepIndex: data.stepIndex,
          totalSteps: data.totalSteps,
          isPaused: this._state.isPaused,
          playbackSpeed: data.speed || 1.0
        });
      }
    });
  },
  
  /**
   * Loads macros from storage
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadMacros() {
    try {
      const macros = await MacroIpc.getAllMacros();
      this._state.macros = macros;
      
      // Update the UI
      this.updateMacrosList();
      
      console.log('Macros loaded', macros);
    } catch (error) {
      console.error('Failed to load macros', error);
      window.UIController.showError('Macro Error', 'Failed to load macros');
    }
  },
  
  /**
   * Updates the macros list in the UI
   * 
   * @returns {void}
   */
  updateMacrosList() {
    const macros = this._state.macros;
    
    if (!this._elements.macrosList || !this._elements.noMacrosMessage) {
      console.warn('Macro list elements not found');
      return;
    }
    
    if (macros.length === 0) {
      this._elements.macrosList.innerHTML = '';
      this._elements.noMacrosMessage.classList.remove('hidden');
      return;
    }
    
    this._elements.noMacrosMessage.classList.add('hidden');
    
    // Generate HTML for each macro
    const macrosHTML = macros.map(macro => `
      <li class="macro-item" data-macro-id="${macro.id}">
        <div class="macro-item__info">
          <span class="macro-item__name">${macro.name}</span>
          <span class="macro-item__details">${macro.steps.length} step${macro.steps.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="macro-item__actions">
          <button class="action-button action-button--primary macro-play-button" title="Play Macro">▶</button>
          <button class="action-button macro-edit-button" title="Edit Macro">✏️</button>
          <button class="action-button action-button--danger macro-delete-button" title="Delete Macro">🗑️</button>
        </div>
      </li>
    `).join('');
    
    this._elements.macrosList.innerHTML = macrosHTML;
    
    // Add event listeners to the new macro elements
    this._addMacroItemEventListeners();
  },
  
  /**
   * Adds event listeners to macro list items
   * 
   * @private
   * @returns {void}
   */
  _addMacroItemEventListeners() {
    // Play buttons
    document.querySelectorAll('.macro-play-button').forEach(button => {
      button.addEventListener('click', event => this._handleMacroPlay(event));
    });
    
    // Edit buttons
    document.querySelectorAll('.macro-edit-button').forEach(button => {
      button.addEventListener('click', event => this._handleMacroEdit(event));
    });
    
    // Delete buttons
    document.querySelectorAll('.macro-delete-button').forEach(button => {
      button.addEventListener('click', event => this._handleMacroDelete(event));
    });
  },
  
  /**
   * Handles macro play button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleMacroPlay(event) {
    const macroId = event.target.closest('.macro-item').dataset.macroId;
    
    try {
      // Start playback
      await this.playMacro(macroId);
    } catch (error) {
      console.error('Error playing macro:', error);
      window.UIController.updateStatus('Error playing macro', true);
    }
  },
  
  /**
   * Handles macro edit button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleMacroEdit(event) {
    const macroId = event.target.closest('.macro-item').dataset.macroId;
    
    try {
      // Get the macro
      const macro = await MacroIpc.getMacro(macroId);
      
      // Set as current macro for editing
      this._state.currentMacro = macro;
      
      // Open edit modal
      this.openEditModal(macroId);
    } catch (error) {
      console.error('Error getting macro for edit:', error);
      window.UIController.showError('Macro Error', 'Failed to edit macro');
    }
  },
  
  /**
   * Handles macro delete button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleMacroDelete(event) {
    const macroItem = event.target.closest('.macro-item');
    const macroId = macroItem.dataset.macroId;
    const macroName = macroItem.querySelector('.macro-item__name').textContent;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the macro "${macroName}"?`)) {
      return;
    }
    
    try {
      window.UIController.updateStatus('Deleting macro...');
      
      // Send delete request
      await MacroIpc.deleteMacro(macroId);
      
      // Remove from state
      this._state.macros = this._state.macros.filter(m => m.id !== macroId);
      
      // Update UI
      this.updateMacrosList();
      
      window.UIController.updateStatus('Macro deleted successfully');
    } catch (error) {
      console.error('Error deleting macro:', error);
      window.UIController.updateStatus('Error deleting macro', true);
    }
  },
  
  /**
   * Opens the edit modal for a macro
   * 
   * @param {string} macroId - ID of the macro to edit
   * @returns {Promise<void>}
   */
  async openEditModal(macroId) {
    try {
      // In a full implementation, this would open a modal dialog
      // For now, we'll just use prompt/alert for simplicity
      
      const macro = this._state.currentMacro || await MacroIpc.getMacro(macroId);
      
      if (!macro) {
        throw new Error('Macro not found');
      }
      
      // Get new name
      const newName = prompt('Enter new name for macro:', macro.name);
      
      if (newName === null) {
        // User canceled
        return;
      }
      
      if (newName.trim() === '') {
        alert('Name cannot be empty');
        return;
      }
      
      // Get new description
      const newDescription = prompt('Enter description for macro (optional):', macro.description || '');
      
      // Update the macro
      const updatedMacro = {
        ...macro,
        name: newName,
        description: newDescription !== null ? newDescription : macro.description
      };
      
      window.UIController.updateStatus('Updating macro...');
      
      await MacroIpc.saveMacro(updatedMacro);
      
      // Update state
      const macroIndex = this._state.macros.findIndex(m => m.id === macroId);
      if (macroIndex !== -1) {
        this._state.macros[macroIndex] = updatedMacro;
      }
      
      // Update UI
      this.updateMacrosList();
      
      window.UIController.updateStatus('Macro updated successfully');
    } catch (error) {
      console.error('Error editing macro:', error);
      window.UIController.showError('Macro Error', 'Failed to update macro');
    }
  },
  
  /**
   * Starts recording a new macro
   * 
   * @returns {Promise<void>}
   */
  async startRecording() {
    if (this._state.isRecording) {
      return;
    }
    
    try {
      console.log('Starting macro recording');
      
      // Get macro name
      const name = prompt('Enter a name for this macro:');
      
      if (!name || name.trim() === '') {
        window.UIController.updateStatus('Macro recording canceled');
        return;
      }
      
      // Get optional description
      const description = prompt('Enter an optional description for this macro:', '');
      
      window.UIController.updateStatus('Starting macro recording...');
      
      // Start recording via IPC
      const recordingOptions = { 
        name,
        description: description || ''
      };
      
      const macro = await MacroIpc.startRecording(recordingOptions);
      
      // Store the current macro
      this._state.currentMacro = macro;
      
      // Update state
      this._state.isRecording = true;
      
      // Update UI
      if (this._elements.recordMacroButton) {
        this._elements.recordMacroButton.disabled = true;
      }
      
      if (this._elements.stopRecordingButton) {
        this._elements.stopRecordingButton.disabled = false;
      }
      
      // Show recording indicator
      this._showRecordingIndicator();
      
      window.UIController.updateStatus('Recording macro...');
      
      // Start periodic updates of recording state
      this._startRecordingStateUpdates();
    } catch (error) {
      console.error('Failed to start macro recording', error);
      window.UIController.showError('Recording Error', 'Failed to start macro recording');
    }
  },
  
  /**
   * Shows the recording indicator
   * 
   * @private
   * @returns {void}
   */
  _showRecordingIndicator() {
    // Create recording indicator if it doesn't exist
    if (!document.getElementById('recording-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'recording-indicator';
      indicator.className = 'recording-indicator';
      indicator.innerHTML = `
        <div class="recording-indicator__dot"></div>
        <span class="recording-indicator__text">Recording</span>
        <span class="recording-indicator__steps">0 steps</span>
      `;
      document.body.appendChild(indicator);
      
      // Add pulse animation to the dot
      const style = document.createElement('style');
      style.textContent = `
        .recording-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 9900;
          font-size: 14px;
        }
        .recording-indicator__dot {
          width: 12px;
          height: 12px;
          background-color: #ff3b30;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        .recording-indicator__steps {
          font-size: 12px;
          opacity: 0.8;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    } else {
      // Show existing indicator
      document.getElementById('recording-indicator').classList.remove('hidden');
    }
  },
  
  /**
   * Hides the recording indicator
   * 
   * @private
   * @returns {void}
   */
  _hideRecordingIndicator() {
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  },
  
  /**
   * Updates the recording indicator with current info
   * 
   * @private
   * @param {number} stepCount - Number of steps recorded
   * @returns {void}
   */
  _updateRecordingIndicator(stepCount) {
    const stepsElement = document.querySelector('.recording-indicator__steps');
    if (stepsElement) {
      stepsElement.textContent = `${stepCount} step${stepCount !== 1 ? 's' : ''}`;
    }
  },
  
  /**
   * Starts periodic updates of recording state
   * 
   * @private
   * @returns {void}
   */
  _startRecordingStateUpdates() {
    // Clear any existing interval
    if (this._recordingUpdateInterval) {
      clearInterval(this._recordingUpdateInterval);
    }
    
    // Update every 1 second
    this._recordingUpdateInterval = setInterval(async () => {
      try {
        if (!this._state.isRecording) {
          clearInterval(this._recordingUpdateInterval);
          return;
        }
        
        const state = await MacroIpc.getRecordingState();
        
        // Update UI with recording state
        this._updateRecordingIndicator(state.stepCount);
      } catch (error) {
        console.error('Error getting recording state', error);
      }
    }, 1000);
  },
  
  /**
   * Stops periodic updates of recording state
   * 
   * @private
   * @returns {void}
   */
  _stopRecordingStateUpdates() {
    if (this._recordingUpdateInterval) {
      clearInterval(this._recordingUpdateInterval);
      this._recordingUpdateInterval = null;
    }
  },
  
  /**
   * Stops recording the current macro
   * 
   * @returns {Promise<void>}
   */
  async stopRecording() {
    if (!this._state.isRecording) {
      return;
    }
    
    try {
      console.log('Stopping macro recording');
      
      window.UIController.updateStatus('Stopping macro recording...');
      
      // Stop recording via IPC
      const recordedMacro = await MacroIpc.stopRecording();
      
      // Update state
      this._state.isRecording = false;
      this._state.currentMacro = recordedMacro;
      
      // Add to macros list if not already there
      const existingIndex = this._state.macros.findIndex(m => m.id === recordedMacro.id);
      if (existingIndex === -1) {
        this._state.macros.push(recordedMacro);
      } else {
        this._state.macros[existingIndex] = recordedMacro;
      }
      
      // Update UI
      if (this._elements.recordMacroButton) {
        this._elements.recordMacroButton.disabled = false;
      }
      
      if (this._elements.stopRecordingButton) {
        this._elements.stopRecordingButton.disabled = true;
      }
      
      // Hide recording indicator
      this._hideRecordingIndicator();
      
      // Stop state updates
      this._stopRecordingStateUpdates();
      
      // Update macros list
      this.updateMacrosList();
      
      // Show steps summary
      const stepCount = recordedMacro.steps.length;
      window.UIController.updateStatus(`Macro recording completed with ${stepCount} step${stepCount !== 1 ? 's' : ''}`);
      
      // Show success message with option to edit
      if (stepCount > 0) {
        const editNow = confirm(`Successfully recorded macro "${recordedMacro.name}" with ${stepCount} steps. Would you like to edit it now?`);
        if (editNow) {
          this.openEditModal(recordedMacro.id);
        }
      } else {
        // Alert if no steps were recorded
        alert('No actions were recorded. Please try again and perform some actions during recording.');
      }
    } catch (error) {
      console.error('Failed to stop macro recording', error);
      window.UIController.showError('Recording Error', 'Failed to stop macro recording');
      
      // Reset state
      this._state.isRecording = false;
      
      // Hide recording indicator
      this._hideRecordingIndicator();
      
      // Stop state updates
      this._stopRecordingStateUpdates();
      
      // Update UI
      if (this._elements.recordMacroButton) {
        this._elements.recordMacroButton.disabled = false;
      }
      
      if (this._elements.stopRecordingButton) {
        this._elements.stopRecordingButton.disabled = true;
      }
    }
  },
  
  /**
   * Cancels the current macro recording without saving
   * 
   * @returns {Promise<void>}
   */
  async cancelRecording() {
    if (!this._state.isRecording) {
      return;
    }
    
    try {
      console.log('Canceling macro recording');
      
      // Confirm cancellation
      const confirmed = confirm('Are you sure you want to cancel recording? All recorded actions will be lost.');
      if (!confirmed) {
        return;
      }
      
      window.UIController.updateStatus('Canceling macro recording...');
      
      // Cancel recording via IPC
      await MacroIpc.cancelRecording();
      
      // Update state
      this._state.isRecording = false;
      this._state.currentMacro = null;
      
      // Update UI
      if (this._elements.recordMacroButton) {
        this._elements.recordMacroButton.disabled = false;
      }
      
      if (this._elements.stopRecordingButton) {
        this._elements.stopRecordingButton.disabled = true;
      }
      
      // Hide recording indicator
      this._hideRecordingIndicator();
      
      // Stop state updates
      this._stopRecordingStateUpdates();
      
      window.UIController.updateStatus('Macro recording canceled');
    } catch (error) {
      console.error('Failed to cancel macro recording', error);
      window.UIController.showError('Recording Error', 'Failed to cancel macro recording');
    }
  },
  
  /**
   * Shows the playback progress indicator
   * 
   * @private
   * @param {Object} macroInfo - Macro information for display
   * @returns {void}
   */
  _showPlaybackIndicator(macroInfo) {
    // Create playback indicator if it doesn't exist
    if (!document.getElementById('playback-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'playback-indicator';
      indicator.className = 'playback-indicator';
      indicator.innerHTML = `
        <div class="playback-indicator__icon">▶️</div>
        <div class="playback-indicator__info">
          <div class="playback-indicator__title">${macroInfo.name || 'Playing Macro'}</div>
          <div class="playback-indicator__progress">
            <div class="playback-indicator__progress-bar" style="width: 0%"></div>
          </div>
          <div class="playback-indicator__stats">
            <span class="playback-indicator__step">Step 0/${macroInfo.totalSteps || '?'}</span>
            <span class="playback-indicator__speed">1.0x</span>
          </div>
        </div>
        <div class="playback-indicator__controls">
          <button class="playback-indicator__pause-btn">⏸️</button>
          <button class="playback-indicator__stop-btn">⏹️</button>
        </div>
      `;
      document.body.appendChild(indicator);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .playback-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 9900;
          font-size: 14px;
          min-width: 300px;
        }
        .playback-indicator__info {
          flex: 1;
        }
        .playback-indicator__title {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .playback-indicator__progress {
          height: 8px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .playback-indicator__progress-bar {
          height: 100%;
          background-color: #2563eb;
          transition: width 0.3s ease;
        }
        .playback-indicator__stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          opacity: 0.8;
        }
        .playback-indicator__controls {
          display: flex;
          gap: 8px;
        }
        .playback-indicator__controls button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
      
      // Add event listeners to control buttons
      const pauseBtn = indicator.querySelector('.playback-indicator__pause-btn');
      const stopBtn = indicator.querySelector('.playback-indicator__stop-btn');
      
      pauseBtn.addEventListener('click', async () => {
        // If playing, pause. If paused, resume.
        if (this._state.isPaused) {
          await this.resumePlayback();
        } else {
          await this.pausePlayback();
        }
      });
      
      stopBtn.addEventListener('click', async () => {
        await this.stopPlayback();
      });
    } else {
      // Update existing indicator
      const indicator = document.getElementById('playback-indicator');
      indicator.classList.remove('hidden');
      
      // Update info
      const title = indicator.querySelector('.playback-indicator__title');
      const step = indicator.querySelector('.playback-indicator__step');
      const progressBar = indicator.querySelector('.playback-indicator__progress-bar');
      
      if (title) title.textContent = macroInfo.name || 'Playing Macro';
      if (step) step.textContent = `Step 0/${macroInfo.totalSteps || '?'}`;
      if (progressBar) progressBar.style.width = '0%';
    }
  },
  
  /**
   * Hides the playback indicator
   * 
   * @private
   * @returns {void}
   */
  _hidePlaybackIndicator() {
    const indicator = document.getElementById('playback-indicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  },
  
  /**
   * Updates the playback progress indicator
   * 
   * @private
   * @param {Object} state - Current playback state
   * @returns {void}
   */
  _updatePlaybackIndicator(state) {
    const indicator = document.getElementById('playback-indicator');
    if (!indicator) return;
    
    // Calculate progress percentage
    const progress = state.totalSteps > 0 
      ? (state.currentStepIndex / state.totalSteps) * 100 
      : 0;
    
    // Update progress bar
    const progressBar = indicator.querySelector('.playback-indicator__progress-bar');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    // Update step counter
    const stepCounter = indicator.querySelector('.playback-indicator__step');
    if (stepCounter) {
      stepCounter.textContent = `Step ${state.currentStepIndex}/${state.totalSteps}`;
    }
    
    // Update speed indicator
    const speedIndicator = indicator.querySelector('.playback-indicator__speed');
    if (speedIndicator) {
      speedIndicator.textContent = `${state.playbackSpeed.toFixed(1)}x`;
    }
    
    // Update pause button
    const pauseBtn = indicator.querySelector('.playback-indicator__pause-btn');
    if (pauseBtn) {
      pauseBtn.textContent = state.isPaused ? '▶️' : '⏸️';
    }
  },
  
  /**
   * Starts periodic updates of playback state
   * 
   * @private
   * @returns {void}
   */
  _startPlaybackStateUpdates() {
    // Clear any existing interval
    if (this._playbackUpdateInterval) {
      clearInterval(this._playbackUpdateInterval);
    }
    
    // Update every 250ms
    this._playbackUpdateInterval = setInterval(async () => {
      try {
        if (!this._state.isPlaying) {
          clearInterval(this._playbackUpdateInterval);
          return;
        }
        
        const state = await MacroIpc.getPlaybackState();
        
        // Update state
        this._state.isPaused = state.isPaused;
        
        // Update UI with playback state
        this._updatePlaybackIndicator(state);
      } catch (error) {
        console.error('Error getting playback state', error);
      }
    }, 250);
  },
  
  /**
   * Stops periodic updates of playback state
   * 
   * @private
   * @returns {void}
   */
  _stopPlaybackStateUpdates() {
    if (this._playbackUpdateInterval) {
      clearInterval(this._playbackUpdateInterval);
      this._playbackUpdateInterval = null;
    }
  },
  
  /**
   * Plays a macro
   * 
   * @param {string} macroId - ID of the macro to play
   * @param {Object} options - Playback options
   * @returns {Promise<void>}
   */
  async playMacro(macroId, options = {}) {
    if (this._state.isPlaying || this._state.isRecording) {
      return;
    }
    
    try {
      console.log(`Playing macro: ${macroId}`, options);
      
// Get the macro details first
const macro = await MacroIpc.getMacro(macroId);
if (!macro) {
  throw new Error('Macro not found');
}

window.UIController.updateStatus(`Playing macro: ${macro.name}...`);

// Show playback indicator
this._showPlaybackIndicator({
  name: macro.name,
  totalSteps: macro.steps.length
});

// Show cancel button
if (this._elements.cancelButton) {
  this._elements.cancelButton.classList.remove('hidden');
}

// Update state
this._state.isPlaying = true;
this._state.isPaused = false;
this._state.currentMacro = macro;

// Start periodic state updates
this._startPlaybackStateUpdates();

// Prepare playback options
const playbackOptions = {
  speed: options.speed || 1.0,
  repeat: options.repeat || false,
  repeatCount: options.repeatCount || 1,
  suppressErrors: options.suppressErrors || false
};

// Start playback via IPC
const result = await MacroIpc.playMacro(macroId, playbackOptions);

// Update state
this._state.isPlaying = false;
this._state.isPaused = false;

// Stop state updates
this._stopPlaybackStateUpdates();

// Hide playback indicator
this._hidePlaybackIndicator();

// Hide cancel button
if (this._elements.cancelButton) {
  this._elements.cancelButton.classList.add('hidden');
}

// Show completion message based on result
if (result.success) {
  window.UIController.updateStatus(`Macro ${macro.name} playback completed successfully`);
} else if (result.stopped) {
  window.UIController.updateStatus(`Macro ${macro.name} playback stopped by user`);
} else if (result.error) {
  window.UIController.updateStatus(`Macro ${macro.name} playback failed: ${result.error}`, true);
}
} catch (error) {
console.error('Failed to play macro', error);
window.UIController.showError('Playback Error', 'Failed to play macro: ' + error.message);

// Reset state
this._state.isPlaying = false;
this._state.isPaused = false;

// Stop state updates
this._stopPlaybackStateUpdates();

// Hide playback indicator
this._hidePlaybackIndicator();

// Hide cancel button
if (this._elements.cancelButton) {
  this._elements.cancelButton.classList.add('hidden');
}
}
},

/**
* Pauses the current macro playback
* 
* @returns {Promise<void>}
*/
async pausePlayback() {
if (!this._state.isPlaying || this._state.isPaused) {
return;
}

try {
console.log('Pausing macro playback');

window.UIController.updateStatus('Pausing macro playback...');

// Pause playback via IPC
const success = await MacroIpc.pausePlayback();

if (success) {
  // Update state
  this._state.isPaused = true;
  
  window.UIController.updateStatus('Macro playback paused');
}
} catch (error) {
console.error('Failed to pause macro playback', error);
window.UIController.showError('Playback Error', 'Failed to pause macro playback');
}
},

/**
* Resumes the paused macro playback
* 
* @returns {Promise<void>}
*/
async resumePlayback() {
if (!this._state.isPlaying || !this._state.isPaused) {
return;
}

try {
console.log('Resuming macro playback');

window.UIController.updateStatus('Resuming macro playback...');

// Resume playback via IPC
const success = await MacroIpc.resumePlayback();

if (success) {
  // Update state
  this._state.isPaused = false;
  
  window.UIController.updateStatus('Macro playback resumed');
}
} catch (error) {
console.error('Failed to resume macro playback', error);
window.UIController.showError('Playback Error', 'Failed to resume macro playback');
}
},

/**
* Adjusts the playback speed
* 
* @param {number} speed - Speed multiplier
* @returns {Promise<void>}
*/
async setPlaybackSpeed(speed) {
if (!this._state.isPlaying) {
return;
}

try {
console.log(`Setting playback speed to ${speed}x`);

// Set playback speed via IPC
const success = await MacroIpc.setPlaybackSpeed(speed);

if (success) {
  window.UIController.updateStatus(`Playback speed set to ${speed}x`);
}
} catch (error) {
console.error('Failed to set playback speed', error);
window.UIController.showError('Playback Error', 'Failed to set playback speed');
}
},

/**
* Stops the current macro playback
* 
* @returns {Promise<void>}
*/
async stopPlayback() {
if (!this._state.isPlaying) {
return;
}

try {
console.log('Stopping macro playback');

window.UIController.updateStatus('Stopping macro playback...');

// Stop playback via IPC
const success = await MacroIpc.stopPlayback();

// Update state
this._state.isPlaying = false;
this._state.isPaused = false;

// Stop state updates
this._stopPlaybackStateUpdates();

// Hide playback indicator
this._hidePlaybackIndicator();

// Hide cancel button
if (this._elements.cancelButton) {
  this._elements.cancelButton.classList.add('hidden');
}

window.UIController.updateStatus('Macro playback stopped');
} catch (error) {
console.error('Failed to stop macro playback', error);
window.UIController.showError('Playback Error', 'Failed to stop macro playback');

// Reset state
this._state.isPlaying = false;
this._state.isPaused = false;

// Stop state updates
this._stopPlaybackStateUpdates();

// Hide playback indicator
this._hidePlaybackIndicator();

// Hide cancel button
if (this._elements.cancelButton) {
  this._elements.cancelButton.classList.add('hidden');
}
}
},

/**
* Gets the current playback state
* 
* @returns {Object} - Current playback state
*/
async getPlaybackState() {
try {
if (!this._state.isPlaying) {
  return {
    isPlaying: false,
    isPaused: false,
    currentStepIndex: 0,
    totalSteps: 0,
    playbackSpeed: 1.0
  };
}

// Get state from IPC
const state = await MacroIpc.getPlaybackState();

// Update local state
this._state.isPaused = state.isPaused;

return state;
} catch (error) {
console.error('Failed to get playback state', error);
return {
  isPlaying: this._state.isPlaying,
  isPaused: this._state.isPaused,
  currentStepIndex: 0,
  totalSteps: 0,
  playbackSpeed: 1.0,
  error: error.message
};
}
}
};

// Initialize the macro UI controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
MacroUI.initialize();
});

// Export the macro UI controller as a global for access from other modules
window.MacroUI = MacroUI;

export default MacroUI;