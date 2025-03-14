/**
 * macro-editor.js
 * Component for editing macros and their action sequences
 */

import { MacroIpc, TargetIpc } from '../js/ipc-renderer.js';

/**
 * Macro Editor Component
 * Provides UI for viewing and editing macro action sequences
 */
const MacroEditor = {
  /**
   * Editor state
   * @private
   */
  _state: {
    isActive: false,
    currentMacro: null,
    targets: [],
    isModified: false,
    isRecording: false
  },

  /**
   * DOM elements
   * @private
   */
  _elements: {
    editor: null,
    macroName: null,
    actionsList: null,
    saveButton: null,
    cancelButton: null,
    recordButton: null,
    stopButton: null
  },

  /**
   * Event handlers
   * @private
   */
  _handlers: {
    saveClick: null,
    cancelClick: null,
    recordClick: null,
    stopClick: null,
    actionEdit: null,
    actionDelete: null,
    actionMove: null
  },

  /**
   * Callback functions
   * @private
   */
  _callbacks: {
    onSave: null,
    onCancel: null,
    onRecordingStart: null,
    onRecordingStop: null
  },

  /**
   * Initializes the macro editor
   * 
   * @param {Object} options - Initialization options
   * @param {Function} options.onSave - Callback when macro is saved
   * @param {Function} options.onCancel - Callback when editing is canceled
   * @param {Function} options.onRecordingStart - Callback when recording starts
   * @param {Function} options.onRecordingStop - Callback when recording stops
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    console.log('Initializing macro editor component');

    // Store callbacks
    if (options.onSave) {
      this._callbacks.onSave = options.onSave;
    }
    
    if (options.onCancel) {
      this._callbacks.onCancel = options.onCancel;
    }
    
    if (options.onRecordingStart) {
      this._callbacks.onRecordingStart = options.onRecordingStart;
    }
    
    if (options.onRecordingStop) {
      this._callbacks.onRecordingStop = options.onRecordingStop;
    }

    // Create DOM elements if they don't exist
    if (!document.getElementById('macro-editor')) {
      this._createElements();
    }

    // Cache DOM elements
    this._cacheElements();

    // Create bound event handlers
    this._createEventHandlers();

    // Load targets for reference
    await this._loadTargets();

    console.log('Macro editor component initialized');
  },

  /**
   * Creates the DOM elements for the editor
   * 
   * @private
   * @returns {void}
   */
  _createElements() {
    // Create the main editor container
    const editor = document.createElement('div');
    editor.id = 'macro-editor';
    editor.className = 'macro-editor hidden';

    // Create the header
    const header = document.createElement('div');
    header.className = 'macro-editor__header';
    header.innerHTML = `
      <h2>Edit Macro</h2>
      <div class="macro-editor__name-container">
        <label for="macro-name">Macro Name:</label>
        <input type="text" id="macro-name" class="macro-editor__name-input" />
      </div>
      <div class="macro-editor__controls">
        <button id="record-button" class="primary-button">Add Actions</button>
        <button id="stop-button" class="danger-button" disabled>Stop Recording</button>
      </div>
    `;

    // Create the actions list
    const actionsList = document.createElement('div');
    actionsList.className = 'macro-editor__actions';
    actionsList.innerHTML = `
      <h3>Actions</h3>
      <div class="macro-editor__no-actions">
        <p>No actions have been added yet. Click "Add Actions" to begin recording.</p>
      </div>
      <ul id="actions-list" class="macro-editor__actions-list"></ul>
    `;

    // Create the footer
    const footer = document.createElement('div');
    footer.className = 'macro-editor__footer';
    footer.innerHTML = `
      <button id="save-button" class="primary-button">Save Macro</button>
      <button id="cancel-button" class="secondary-button">Cancel</button>
    `;

    // Append children
    editor.appendChild(header);
    editor.appendChild(actionsList);
    editor.appendChild(footer);

    // Append to document
    document.body.appendChild(editor);
  },

  /**
   * Caches frequently used DOM elements
   * 
   * @private
   * @returns {void}
   */
  _cacheElements() {
    this._elements.editor = document.getElementById('macro-editor');
    this._elements.macroName = document.getElementById('macro-name');
    this._elements.actionsList = document.getElementById('actions-list');
    this._elements.saveButton = document.getElementById('save-button');
    this._elements.cancelButton = document.getElementById('cancel-button');
    this._elements.recordButton = document.getElementById('record-button');
    this._elements.stopButton = document.getElementById('stop-button');
  },

  /**
   * Creates bound event handlers
   * 
   * @private
   * @returns {void}
   */
  _createEventHandlers() {
    // Save button handler
    this._handlers.saveClick = () => {
      this._handleSave();
    };

    // Cancel button handler
    this._handlers.cancelClick = () => {
      this._handleCancel();
    };

    // Record button handler
    this._handlers.recordClick = () => {
      this._handleRecordStart();
    };

    // Stop button handler
    this._handlers.stopClick = () => {
      this._handleRecordStop();
    };

    // Action edit handler
    this._handlers.actionEdit = (event) => {
      const actionItem = event.target.closest('.macro-action-item');
      if (actionItem) {
        const actionId = actionItem.dataset.actionId;
        this._editAction(actionId);
      }
    };

    // Action delete handler
    this._handlers.actionDelete = (event) => {
      const actionItem = event.target.closest('.macro-action-item');
      if (actionItem) {
        const actionId = actionItem.dataset.actionId;
        this._deleteAction(actionId);
      }
    };

    // Action move handler (for reordering)
    this._handlers.actionMove = (event) => {
      // Placeholder for drag-and-drop reordering
    };

    // Attach event listeners
    if (this._elements.saveButton) {
      this._elements.saveButton.addEventListener('click', this._handlers.saveClick);
    }
    
    if (this._elements.cancelButton) {
      this._elements.cancelButton.addEventListener('click', this._handlers.cancelClick);
    }
    
    if (this._elements.recordButton) {
      this._elements.recordButton.addEventListener('click', this._handlers.recordClick);
    }
    
    if (this._elements.stopButton) {
      this._elements.stopButton.addEventListener('click', this._handlers.stopClick);
    }
  },

  /**
   * Loads targets for reference
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadTargets() {
    try {
      const targets = await TargetIpc.getAllTargets();
      this._state.targets = targets;
      console.log('Targets loaded for macro editor', targets);
    } catch (error) {
      console.error('Failed to load targets for macro editor', error);
      this._state.targets = [];
    }
  },

  /**
   * Sets the current macro for editing
   * 
   * @param {Object} macro - Macro object to edit
   * @returns {void}
   */
  setMacro(macro) {
    console.log('Setting macro for editing', macro);
    
    this._state.currentMacro = macro;
    this._state.isModified = false;
    
    // Update UI with macro data
    if (this._elements.macroName) {
      this._elements.macroName.value = macro.name || '';
    }
    
    // Update actions list
    this._updateActionsList();
  },

  /**
   * Updates the actions list UI
   * 
   * @private
   * @returns {void}
   */
  _updateActionsList() {
    if (!this._elements.actionsList) return;
    
    const actions = this._state.currentMacro?.steps || [];
    const noActionsEl = document.querySelector('.macro-editor__no-actions');
    
    if (actions.length === 0) {
      // Show no actions message
      if (noActionsEl) {
        noActionsEl.classList.remove('hidden');
      }
      this._elements.actionsList.innerHTML = '';
      return;
    }
    
    // Hide no actions message
    if (noActionsEl) {
      noActionsEl.classList.add('hidden');
    }
    
    // Sort actions by order
    const sortedActions = [...actions].sort((a, b) => a.order - b.order);
    
    // Generate HTML for each action
    const actionsHTML = sortedActions.map((step, index) => {
      const action = step.action;
      let actionDescription = '';
      let actionIcon = '';
      
      // Format action description based on type
      switch (action.type) {
        case 'click':
          const target = this._state.targets.find(t => t.id === action.targetId);
          actionIcon = '🖱️';
          
          if (target) {
            actionDescription = `Click "${target.name}" (${action.clickType} click)`;
          } else {
            actionDescription = `${action.clickType.charAt(0).toUpperCase() + action.clickType.slice(1)} click at X: ${action.x}, Y: ${action.y}`;
          }
          break;
          
        case 'keyboard':
          actionIcon = '⌨️';
          let modifiers = [];
          
          if (action.withShift) modifiers.push('Shift');
          if (action.withCtrl) modifiers.push('Ctrl');
          if (action.withAlt) modifiers.push('Alt');
          if (action.withMeta) modifiers.push('Meta');
          
          const modifierText = modifiers.length > 0 ? `${modifiers.join('+')}+` : '';
          actionDescription = `Press ${modifierText}${action.key}`;
          break;
          
        case 'text':
          actionIcon = '📝';
          actionDescription = `Type "${action.text.length > 20 ? action.text.substring(0, 20) + '...' : action.text}"`;
          break;
          
        case 'delay':
          actionIcon = '⏱️';
          actionDescription = `Wait ${action.duration}ms`;
          break;
          
        default:
          actionIcon = '❓';
          actionDescription = `Unknown action: ${action.type}`;
      }
      
      return `
        <li class="macro-action-item" data-action-id="${step.id}" data-order="${step.order}">
          <div class="macro-action-item__indicator">${index + 1}</div>
          <div class="macro-action-item__icon">${actionIcon}</div>
          <div class="macro-action-item__description">${actionDescription}</div>
          <div class="macro-action-item__actions">
            <button class="action-button action-edit-button" title="Edit Action">✏️</button>
            <button class="action-button action-button--danger action-delete-button" title="Delete Action">🗑️</button>
            <button class="action-button action-move-button" title="Reorder">⇅</button>
          </div>
        </li>
      `;
    }).join('');
    
    this._elements.actionsList.innerHTML = actionsHTML;
    
    // Add event listeners to action items
    document.querySelectorAll('.action-edit-button').forEach(button => {
      button.addEventListener('click', this._handlers.actionEdit);
    });
    
    document.querySelectorAll('.action-delete-button').forEach(button => {
      button.addEventListener('click', this._handlers.actionDelete);
    });
    
    document.querySelectorAll('.action-move-button').forEach(button => {
      button.addEventListener('click', this._handlers.actionMove);
    });
  },

  /**
   * Shows the macro editor
   * 
   * @returns {void}
   */
  show() {
    console.log('Showing macro editor');
    
    // Update state
    this._state.isActive = true;
    
    // Show the editor
    if (this._elements.editor) {
      this._elements.editor.classList.remove('hidden');
    }
    
    // Focus on name field
    if (this._elements.macroName) {
      this._elements.macroName.focus();
    }
  },

  /**
   * Hides the macro editor
   * 
   * @returns {void}
   */
  hide() {
    console.log('Hiding macro editor');
    
    // Update state
    this._state.isActive = false;
    
    // Hide the editor
    if (this._elements.editor) {
      this._elements.editor.classList.add('hidden');
    }
    
    // Reset recording state if needed
    if (this._state.isRecording) {
      this._handleRecordStop();
    }
  },

  /**
   * Handles the save button click
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _handleSave() {
    if (!this._state.currentMacro) {
      return;
    }
    
    try {
      console.log('Saving macro');
      
      // Update macro with current values
      const updatedMacro = {
        ...this._state.currentMacro,
        name: this._elements.macroName.value,
        updatedAt: new Date().toISOString()
      };
      
      // Save the macro
      await MacroIpc.saveMacro(updatedMacro);
      
      // Reset modified state
      this._state.isModified = false;
      
      // Hide the editor
      this.hide();
      
      // Call the callback
      if (this._callbacks.onSave) {
        this._callbacks.onSave(updatedMacro);
      }
    } catch (error) {
      console.error('Failed to save macro', error);
      alert('Failed to save macro: ' + error.message);
    }
  },

  /**
   * Handles the cancel button click
   * 
   * @private
   * @returns {void}
   */
  _handleCancel() {
    console.log('Canceling macro edit');
    
    // Check if there are unsaved changes
    if (this._state.isModified) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) {
        return;
      }
    }
    
    // Hide the editor
    this.hide();
    
    // Call the callback
    if (this._callbacks.onCancel) {
      this._callbacks.onCancel();
    }
  },

  /**
   * Handles the record button click
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _handleRecordStart() {
    try {
      console.log('Starting macro recording');
      
      // Update UI
      if (this._elements.recordButton) {
        this._elements.recordButton.disabled = true;
      }
      
      if (this._elements.stopButton) {
        this._elements.stopButton.disabled = false;
      }
      
      // Update state
      this._state.isRecording = true;
      
      // Start recording via IPC
      await MacroIpc.startRecording({
        name: this._elements.macroName.value || 'New Macro',
        existingId: this._state.currentMacro?.id
      });
      
      // Call the callback
      if (this._callbacks.onRecordingStart) {
        this._callbacks.onRecordingStart();
      }
    } catch (error) {
      console.error('Failed to start recording', error);
      alert('Failed to start recording: ' + error.message);
      
      // Reset UI
      if (this._elements.recordButton) {
        this._elements.recordButton.disabled = false;
      }
      
      if (this._elements.stopButton) {
        this._elements.stopButton.disabled = true;
      }
      
      // Reset state
      this._state.isRecording = false;
    }
  },

  /**
   * Handles the stop button click
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _handleRecordStop() {
    try {
      console.log('Stopping macro recording');
      
      // Update UI
      if (this._elements.recordButton) {
        this._elements.recordButton.disabled = false;
      }
      
      if (this._elements.stopButton) {
        this._elements.stopButton.disabled = true;
      }
      
      // Stop recording via IPC
      const recordedMacro = await MacroIpc.stopRecording();
      
      // Update state
      this._state.isRecording = false;
      this._state.isModified = true;
      this._state.currentMacro = recordedMacro;
      
      // Update UI
      this._updateActionsList();
      
      // Call the callback
      if (this._callbacks.onRecordingStop) {
        this._callbacks.onRecordingStop(recordedMacro);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      alert('Failed to stop recording: ' + error.message);
      
      // Reset UI
      if (this._elements.recordButton) {
        this._elements.recordButton.disabled = false;
      }
      
      if (this._elements.stopButton) {
        this._elements.stopButton.disabled = true;
      }
      
      // Reset state
      this._state.isRecording = false;
    }
  },

  /**
   * Edits an action
   * 
   * @private
   * @param {string} actionId - ID of the action to edit
   * @returns {void}
   */
  _editAction(actionId) {
    // Find the action
    const step = this._state.currentMacro?.steps.find(s => s.id === actionId);
    if (!step) return;
    
    console.log('Editing action', step);
    
    // In a full implementation, this would open a modal dialog
    // For now, we'll just use prompt/alert for simplicity
    
    const action = step.action;
    let updatedAction = { ...action };
    
    switch (action.type) {
      case 'click':
        const clickType = prompt('Click type (left, right, double):', action.clickType);
        if (clickType && ['left', 'right', 'double'].includes(clickType)) {
          updatedAction.clickType = clickType;
        }
        break;
        
      case 'delay':
        const duration = prompt('Delay duration (ms):', action.duration);
        if (duration && !isNaN(parseInt(duration))) {
          updatedAction.duration = parseInt(duration);
        }
        break;
        
      case 'text':
        const text = prompt('Text to type:', action.text);
        if (text !== null) {
          updatedAction.text = text;
        }
        break;
        
      default:
        alert('Editing this action type is not supported yet');
        return;
    }
    
    // Update the action
    this._updateAction(actionId, updatedAction);
  },

  /**
   * Updates an action
   * 
   * @private
   * @param {string} actionId - ID of the action to update
   * @param {Object} updatedAction - Updated action data
   * @returns {void}
   */
  _updateAction(actionId, updatedAction) {
    if (!this._state.currentMacro) return;
    
    // Find the action index
    const stepIndex = this._state.currentMacro.steps.findIndex(s => s.id === actionId);
    if (stepIndex === -1) return;
    
    // Update the action
    const updatedStep = {
      ...this._state.currentMacro.steps[stepIndex],
      action: updatedAction
    };
    
    // Update the macro
    const updatedSteps = [...this._state.currentMacro.steps];
    updatedSteps[stepIndex] = updatedStep;
    
    this._state.currentMacro = {
      ...this._state.currentMacro,
      steps: updatedSteps
    };
    
    // Mark as modified
    this._state.isModified = true;
    
    // Update UI
    this._updateActionsList();
  },

  /**
   * Deletes an action
   * 
   * @private
   * @param {string} actionId - ID of the action to delete
   * @returns {void}
   */
  _deleteAction(actionId) {
    if (!this._state.currentMacro) return;
    
    console.log('Deleting action', actionId);
    
    // Confirm deletion
    const confirmed = confirm('Are you sure you want to delete this action?');
    if (!confirmed) return;
    
    // Remove the action
    const updatedSteps = this._state.currentMacro.steps.filter(s => s.id !== actionId);
    
    // Update order of remaining steps
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index
    }));
    
    // Update the macro
    this._state.currentMacro = {
      ...this._state.currentMacro,
      steps: reorderedSteps
    };
    
    // Mark as modified
    this._state.isModified = true;
    
    // Update UI
    this._updateActionsList();
  },

  /**
   * Adds a new action
   * 
   * @param {Object} action - Action to add
   * @returns {void}
   */
  addAction(action) {
    if (!this._state.currentMacro) return;
    
    console.log('Adding action', action);
    
    // Create a step ID
    const stepId = 'step_' + Math.random().toString(36).substr(2, 9);
    
    // Create a step order (at the end)
    const order = this._state.currentMacro.steps.length;
    
    // Create the step
    const step = {
      id: stepId,
      action,
      order
    };
    
    // Add to macro
    const updatedSteps = [...this._state.currentMacro.steps, step];
    
    // Update the macro
    this._state.currentMacro = {
      ...this._state.currentMacro,
      steps: updatedSteps
    };
    
    // Mark as modified
    this._state.isModified = true;
    
    // Update UI
    this._updateActionsList();
  },

  /**
   * Gets the current editor state
   * 
   * @returns {Object} - Current state
   */
  getState() {
    return {
      isActive: this._state.isActive,
      isRecording: this._state.isRecording,
      isModified: this._state.isModified,
      currentMacro: this._state.currentMacro
    };
  }
};

// Export the component
export default MacroEditor;