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
    isPlaying: false
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
          this.stopRecording();
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
          this.stopRecording();
          event.preventDefault();
        }
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
      
      // Update the macro
      const updatedMacro = {
        ...macro,
        name: newName
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
      
      window.UIController.updateStatus('Starting macro recording...');
      
      // Start recording via IPC
      await MacroIpc.startRecording({ name });
      
      // Update state
      this._state.isRecording = true;
      
      // Update UI
      if (this._elements.recordMacroButton) {
        this._elements.recordMacroButton.disabled = true;
      }
      
      if (this._elements.stopRecordingButton) {
        this._elements.stopRecordingButton.disabled = false;
      }
      
      window.UIController.updateStatus('Recording macro...');
    } catch (error) {
      console.error('Failed to start macro recording', error);
      window.UIController.showError('Recording Error', 'Failed to start macro recording');
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
      
      this.updateMacrosList();
      
      window.UIController.updateStatus('Macro recording completed');
    } catch (error) {
      console.error('Failed to stop macro recording', error);
      window.UIController.showError('Recording Error', 'Failed to stop macro recording');
      
      // Reset state
      this._state.isRecording = false;
      
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
   * Plays a macro
   * 
   * @param {string} macroId - ID of the macro to play
   * @returns {Promise<void>}
   */
  async playMacro(macroId) {
    if (this._state.isPlaying || this._state.isRecording) {
      return;
    }
    
    try {
      console.log(`Playing macro: ${macroId}`);
      
      window.UIController.updateStatus('Playing macro...');
      
      // Show cancel button
      if (this._elements.cancelButton) {
        this._elements.cancelButton.classList.remove('hidden');
      }
      
      // Update state
      this._state.isPlaying = true;
      
      // Start playback via IPC
      await MacroIpc.playMacro(macroId);
      
      // Update state
      this._state.isPlaying = false;
      
      // Hide cancel button
      if (this._elements.cancelButton) {
        this._elements.cancelButton.classList.add('hidden');
      }
      
      window.UIController.updateStatus('Macro playback completed');
    } catch (error) {
      console.error('Failed to play macro', error);
      window.UIController.showError('Playback Error', 'Failed to play macro');
      
      // Reset state
      this._state.isPlaying = false;
      
      // Hide cancel button
      if (this._elements.cancelButton) {
        this._elements.cancelButton.classList.add('hidden');
      }
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
      await MacroIpc.stopPlayback();
      
      // Update state
      this._state.isPlaying = false;
      
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
      
      // Hide cancel button
      if (this._elements.cancelButton) {
        this._elements.cancelButton.classList.add('hidden');
      }
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