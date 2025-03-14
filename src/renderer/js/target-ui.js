/**
 * target-ui.js
 * Handles target-specific UI interactions and DOM manipulation
 */

import { TargetIpc, IpcRenderer, SystemIpc } from './ipc-renderer.js';

/**
 * Target UI Controller
 * Manages UI elements related to targets
 */
const TargetUI = {
  /**
   * Target state
   * @private
   */
  _state: {
    targets: [],
    currentTarget: null,
    isTargetingMode: false,
    displays: []
  },
  
  /**
   * DOM elements
   * @private
   */
  _elements: {
    addTargetButton: null,
    targetsList: null,
    noTargetsMessage: null,
    targetingOverlay: null,
    targetingCrosshair: null
  },
  
  /**
   * Initializes the target UI controller
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing target UI controller');
    
    // Cache DOM elements
    this._cacheElements();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Get display information
    await this._getDisplayInfo();
    
    // Load targets
    await this._loadTargets();
    
    console.log('Target UI controller initialized');
  },
  
  /**
   * Caches frequently used DOM elements
   * 
   * @private
   * @returns {void}
   */
  _cacheElements() {
    this._elements.addTargetButton = document.getElementById('add-target');
    this._elements.targetsList = document.getElementById('targets-list');
    this._elements.noTargetsMessage = document.querySelector('.no-targets-message');
    this._elements.targetingOverlay = document.getElementById('targeting-overlay');
    this._elements.targetingCrosshair = document.getElementById('targeting-crosshair');
  },
  
  /**
   * Sets up UI event listeners
   * 
   * @private
   * @returns {void}
   */
  _setupEventListeners() {
    // Add target button
    if (this._elements.addTargetButton) {
      this._elements.addTargetButton.addEventListener('click', () => this.startTargeting());
    }
    
    // Targeting overlay
    if (this._elements.targetingOverlay) {
      // Mouse move in targeting mode
      this._elements.targetingOverlay.addEventListener('mousemove', event => {
        if (this._state.isTargetingMode && this._elements.targetingCrosshair) {
          this._elements.targetingCrosshair.style.left = `${event.clientX}px`;
          this._elements.targetingCrosshair.style.top = `${event.clientY}px`;
        }
      });
      
      // Click in targeting mode
      this._elements.targetingOverlay.addEventListener('click', event => {
        if (this._state.isTargetingMode) {
          this._handleTargetingClick(event);
        }
      });
    }
    
    // Listen for targeting mode events from IPC
    IpcRenderer.on('toggle-targeting-mode', event => {
      this.toggleTargetingMode();
    });
    
    // Keyboard events
    document.addEventListener('keydown', event => {
      // Escape key to cancel targeting
      if (event.key === 'Escape' && this._state.isTargetingMode) {
        this.stopTargeting();
        event.preventDefault();
      }
    });
  },
  
  /**
   * Gets information about all displays
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _getDisplayInfo() {
    try {
      this._state.displays = await SystemIpc.getDisplays();
      console.log('Display information loaded', this._state.displays);
    } catch (error) {
      console.error('Failed to get display information', error);
      // Fallback to a single display
      this._state.displays = [{
        id: 0,
        x: 0,
        y: 0,
        width: window.screen.width,
        height: window.screen.height,
        isPrimary: true,
        scaleFactor: 1
      }];
    }
  },
  
  /**
   * Loads targets from storage
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadTargets() {
    try {
      const targets = await TargetIpc.getAllTargets();
      this._state.targets = targets;
      
      // Update the UI
      this.updateTargetsList();
      
      console.log('Targets loaded', targets);
    } catch (error) {
      console.error('Failed to load targets', error);
      window.UIController.showError('Target Error', 'Failed to load targets');
    }
  },
  
  /**
   * Updates the targets list in the UI
   * 
   * @returns {void}
   */
  updateTargetsList() {
    const targets = this._state.targets;
    
    if (!this._elements.targetsList || !this._elements.noTargetsMessage) {
      console.warn('Target list elements not found');
      return;
    }
    
    if (targets.length === 0) {
      this._elements.targetsList.innerHTML = '';
      this._elements.noTargetsMessage.classList.remove('hidden');
      return;
    }
    
    this._elements.noTargetsMessage.classList.add('hidden');
    
    // Generate HTML for each target
    const targetsHTML = targets.map(target => `
      <li class="target-item" data-target-id="${target.id}">
        <div class="target-item__info">
          <span class="target-item__name">${target.name}</span>
          <span class="target-item__coords">X: ${target.coordinates.x}, Y: ${target.coordinates.y} (Screen ${target.coordinates.screenId})</span>
        </div>
        <div class="target-item__actions">
          <button class="action-button action-button--primary target-test-button" title="Test Target">▶</button>
          <button class="action-button target-edit-button" title="Edit Target">✏️</button>
          <button class="action-button action-button--danger target-delete-button" title="Delete Target">🗑️</button>
        </div>
      </li>
    `).join('');
    
    this._elements.targetsList.innerHTML = targetsHTML;
    
    // Add event listeners to the new target elements
    this._addTargetItemEventListeners();
  },
  
  /**
   * Adds event listeners to target list items
   * 
   * @private
   * @returns {void}
   */
  _addTargetItemEventListeners() {
    // Test buttons
    document.querySelectorAll('.target-test-button').forEach(button => {
      button.addEventListener('click', event => this._handleTargetTest(event));
    });
    
    // Edit buttons
    document.querySelectorAll('.target-edit-button').forEach(button => {
      button.addEventListener('click', event => this._handleTargetEdit(event));
    });
    
    // Delete buttons
    document.querySelectorAll('.target-delete-button').forEach(button => {
      button.addEventListener('click', event => this._handleTargetDelete(event));
    });
  },
  
  /**
   * Handles target test button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleTargetTest(event) {
    const targetId = event.target.closest('.target-item').dataset.targetId;
    
    try {
      window.UIController.updateStatus('Testing target...');
      
      // Send request to test the target
      await TargetIpc.testTarget(targetId);
      
      window.UIController.updateStatus('Target tested successfully');
    } catch (error) {
      console.error('Error testing target:', error);
      window.UIController.updateStatus('Error testing target', true);
    }
  },
  
  /**
   * Handles target edit button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleTargetEdit(event) {
    const targetId = event.target.closest('.target-item').dataset.targetId;
    
    try {
      // Get the target
      const target = await TargetIpc.getTarget(targetId);
      
      // Set as current target for editing
      this._state.currentTarget = target;
      
      // Open edit modal
      this.openEditModal(targetId);
    } catch (error) {
      console.error('Error getting target for edit:', error);
      window.UIController.showError('Target Error', 'Failed to edit target');
    }
  },
  
  /**
   * Handles target delete button click
   * 
   * @private
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async _handleTargetDelete(event) {
    const targetItem = event.target.closest('.target-item');
    const targetId = targetItem.dataset.targetId;
    const targetName = targetItem.querySelector('.target-item__name').textContent;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the target "${targetName}"?`)) {
      return;
    }
    
    try {
      window.UIController.updateStatus('Deleting target...');
      
      // Send delete request
      await TargetIpc.deleteTarget(targetId);
      
      // Remove from state
      this._state.targets = this._state.targets.filter(t => t.id !== targetId);
      
      // Update UI
      this.updateTargetsList();
      
      window.UIController.updateStatus('Target deleted successfully');
    } catch (error) {
      console.error('Error deleting target:', error);
      window.UIController.updateStatus('Error deleting target', true);
    }
  },
  
  /**
   * Opens the edit modal for a target
   * 
   * @param {string} targetId - ID of the target to edit
   * @returns {Promise<void>}
   */
  async openEditModal(targetId) {
    try {
      // In a full implementation, this would open a modal dialog
      // For now, we'll just use prompt/alert for simplicity
      
      const target = this._state.currentTarget || await TargetIpc.getTarget(targetId);
      
      if (!target) {
        throw new Error('Target not found');
      }
      
      // Get new name
      const newName = prompt('Enter new name for target:', target.name);
      
      if (newName === null) {
        // User canceled
        return;
      }
      
      if (newName.trim() === '') {
        alert('Name cannot be empty');
        return;
      }
      
      // Update the target
      const updatedTarget = {
        ...target,
        name: newName
      };
      
      window.UIController.updateStatus('Updating target...');
      
      await TargetIpc.setTarget(updatedTarget);
      
      // Update state
      const targetIndex = this._state.targets.findIndex(t => t.id === targetId);
      if (targetIndex !== -1) {
        this._state.targets[targetIndex] = updatedTarget;
      }
      
      // Update UI
      this.updateTargetsList();
      
      window.UIController.updateStatus('Target updated successfully');
    } catch (error) {
      console.error('Error editing target:', error);
      window.UIController.showError('Target Error', 'Failed to update target');
    }
  },
  
  /**
   * Starts the targeting mode to set a new target
   * 
   * @returns {void}
   */
  startTargeting() {
    console.log('Starting targeting mode');
    
    // Set targeting mode state
    this._state.isTargetingMode = true;
    
    // Show targeting overlay
    if (this._elements.targetingOverlay) {
      this._elements.targetingOverlay.classList.remove('hidden');
    }
    
    // Add targeting class to body
    document.body.classList.add('targeting-mode');
    
    window.UIController.updateStatus('Click anywhere to set a target');
  },
  
  /**
   * Stops the targeting mode
   * 
   * @returns {void}
   */
  stopTargeting() {
    console.log('Stopping targeting mode');
    
    // Set targeting mode state
    this._state.isTargetingMode = false;
    
    // Hide targeting overlay
    if (this._elements.targetingOverlay) {
      this._elements.targetingOverlay.classList.add('hidden');
    }
    
    // Remove targeting class from body
    document.body.classList.remove('targeting-mode');
    
    window.UIController.updateStatus('Targeting canceled');
  },
  
  /**
   * Toggles targeting mode
   * 
   * @returns {void}
   */
  toggleTargetingMode() {
    if (this._state.isTargetingMode) {
      this.stopTargeting();
    } else {
      this.startTargeting();
    }
  },
  
  /**
   * Handles a click in targeting mode
   * 
   * @private
   * @param {MouseEvent} event - Click event
   * @returns {Promise<void>}
   */
  async _handleTargetingClick(event) {
    console.log('Target clicked', {
      x: event.clientX,
      y: event.clientY
    });
    
    try {
      // Get the position
      const x = event.clientX;
      const y = event.clientY;
      
      // Stop targeting mode
      this.stopTargeting();
      
      // Get target name
      const name = prompt('Enter a name for this target:');
      
      if (!name || name.trim() === '') {
        window.UIController.updateStatus('Target creation canceled');
        return;
      }
      
      window.UIController.updateStatus('Creating target...');
      
      // Create the target
      const newTarget = await TargetIpc.setTarget({
        name,
        x,
        y
      });
      
      // Add to state
      this._state.targets.push(newTarget);
      
      // Update UI
      this.updateTargetsList();
      
      window.UIController.updateStatus('Target created successfully');
    } catch (error) {
      console.error('Error creating target:', error);
      window.UIController.updateStatus('Error creating target', true);
    } 
  }}