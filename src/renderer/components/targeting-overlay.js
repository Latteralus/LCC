/**
 * targeting-overlay.js
 * Component for the target selection overlay
 */

import { TargetIpc, SystemIpc } from '../js/ipc-renderer.js';

/**
 * Targeting Overlay Component
 * Provides UI for selecting screen coordinates for targets
 */
const TargetingOverlay = {
  /**
   * State for the targeting overlay
   * @private
   */
  _state: {
    isActive: false,
    mousePosition: { x: 0, y: 0 },
    displays: []
  },

  /**
   * DOM elements
   * @private
   */
  _elements: {
    overlay: null,
    crosshair: null,
    instructions: null,
    coordinates: null
  },

  /**
   * Event handlers
   * @private
   */
  _handlers: {
    mousemove: null,
    click: null,
    keydown: null
  },

  /**
   * Callback functions
   * @private
   */
  _callbacks: {
    onTargetSelected: null,
    onCancel: null
  },

  /**
   * Initializes the targeting overlay
   * 
   * @param {Object} options - Initialization options
   * @param {Function} options.onTargetSelected - Callback when target is selected
   * @param {Function} options.onCancel - Callback when targeting is canceled
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    console.log('Initializing targeting overlay component');

    // Store callbacks
    if (options.onTargetSelected) {
      this._callbacks.onTargetSelected = options.onTargetSelected;
    }
    
    if (options.onCancel) {
      this._callbacks.onCancel = options.onCancel;
    }

    // Create DOM elements if they don't exist
    if (!document.getElementById('targeting-overlay')) {
      this._createElements();
    }

    // Cache DOM elements
    this._cacheElements();

    // Get display information
    await this._getDisplayInfo();

    // Create bound event handlers
    this._createEventHandlers();

    console.log('Targeting overlay component initialized');
  },

  /**
   * Creates the DOM elements for the overlay
   * 
   * @private
   * @returns {void}
   */
  _createElements() {
    // Create the main overlay container
    const overlay = document.createElement('div');
    overlay.id = 'targeting-overlay';
    overlay.className = 'targeting-overlay hidden';

    // Create the instructions
    const instructions = document.createElement('div');
    instructions.className = 'targeting-instructions';
    instructions.innerHTML = `
      <p>Click anywhere on the screen to set a target</p>
      <p>Press <kbd>Esc</kbd> to cancel</p>
    `;

    // Create the coordinates display
    const coordinates = document.createElement('div');
    coordinates.className = 'targeting-coordinates';
    coordinates.innerHTML = `
      <span class="targeting-coordinates__text">X: 0, Y: 0</span>
    `;

    // Create the crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'targeting-crosshair';
    crosshair.className = 'targeting-crosshair';

    // Append children
    overlay.appendChild(instructions);
    overlay.appendChild(coordinates);
    overlay.appendChild(crosshair);

    // Append to document
    document.body.appendChild(overlay);
  },

  /**
   * Caches frequently used DOM elements
   * 
   * @private
   * @returns {void}
   */
  _cacheElements() {
    this._elements.overlay = document.getElementById('targeting-overlay');
    this._elements.crosshair = document.getElementById('targeting-crosshair');
    this._elements.instructions = document.querySelector('.targeting-instructions');
    this._elements.coordinates = document.querySelector('.targeting-coordinates__text');
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
   * Creates bound event handlers
   * 
   * @private
   * @returns {void}
   */
  _createEventHandlers() {
    // Mouse move handler
    this._handlers.mousemove = (event) => {
      if (this._state.isActive) {
        this._updateCrosshairPosition(event.clientX, event.clientY);
        this._updateCoordinatesDisplay(event.clientX, event.clientY);
      }
    };

    // Click handler
    this._handlers.click = (event) => {
      if (this._state.isActive) {
        this._handleTargetSelection(event);
      }
    };

    // Keyboard handler
    this._handlers.keydown = (event) => {
      if (this._state.isActive && event.key === 'Escape') {
        this.hide();
        
        if (this._callbacks.onCancel) {
          this._callbacks.onCancel();
        }
        
        event.preventDefault();
      }
    };
  },

  /**
   * Shows the targeting overlay
   * 
   * @returns {void}
   */
  show() {
    console.log('Showing targeting overlay');

    // Update state
    this._state.isActive = true;

    // Show the overlay
    if (this._elements.overlay) {
      this._elements.overlay.classList.remove('hidden');
    }

    // Add event listeners
    document.addEventListener('mousemove', this._handlers.mousemove);
    document.addEventListener('click', this._handlers.click);
    document.addEventListener('keydown', this._handlers.keydown);

    // Add targeting class to body
    document.body.classList.add('targeting-mode');
  },

  /**
   * Hides the targeting overlay
   * 
   * @returns {void}
   */
  hide() {
    console.log('Hiding targeting overlay');

    // Update state
    this._state.isActive = false;

    // Hide the overlay
    if (this._elements.overlay) {
      this._elements.overlay.classList.add('hidden');
    }

    // Remove event listeners
    document.removeEventListener('mousemove', this._handlers.mousemove);
    document.removeEventListener('click', this._handlers.click);
    document.removeEventListener('keydown', this._handlers.keydown);

    // Remove targeting class from body
    document.body.classList.remove('targeting-mode');
  },

  /**
   * Updates the crosshair position
   * 
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  _updateCrosshairPosition(x, y) {
    if (this._elements.crosshair) {
      this._elements.crosshair.style.left = `${x}px`;
      this._elements.crosshair.style.top = `${y}px`;
    }

    this._state.mousePosition = { x, y };
  },

  /**
   * Updates the coordinates display
   * 
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  _updateCoordinatesDisplay(x, y) {
    if (this._elements.coordinates) {
      this._elements.coordinates.textContent = `X: ${x}, Y: ${y}`;
    }
  },

  /**
   * Handles target selection
   * 
   * @private
   * @param {MouseEvent} event - Click event
   * @returns {Promise<void>}
   */
  async _handleTargetSelection(event) {
    console.log('Target selected', {
      x: event.clientX,
      y: event.clientY
    });

    // Prevent multiple selections
    event.preventDefault();
    event.stopPropagation();

    // Hide the overlay
    this.hide();

    // Call the callback
    if (this._callbacks.onTargetSelected) {
      this._callbacks.onTargetSelected({
        x: event.clientX,
        y: event.clientY
      });
    }
  },

  /**
   * Gets the current targeting state
   * 
   * @returns {boolean} - Whether targeting is active
   */
  isActive() {
    return this._state.isActive;
  },

  /**
   * Sets the crosshair color
   * 
   * @param {string} color - CSS color value
   * @returns {void}
   */
  setCrosshairColor(color) {
    if (this._elements.crosshair) {
      this._elements.crosshair.style.borderColor = color;
      this._elements.crosshair.style.backgroundColor = `${color}33`; // 20% opacity
    }
  },

  /**
   * Sets the crosshair size
   * 
   * @param {number} size - Size in pixels
   * @returns {void}
   */
  setCrosshairSize(size) {
    if (this._elements.crosshair) {
      this._elements.crosshair.style.width = `${size}px`;
      this._elements.crosshair.style.height = `${size}px`;
    }
  }
};

// Export the component
export default TargetingOverlay;