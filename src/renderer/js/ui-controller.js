/**
 * ui-controller.js
 * Manages UI state and interactions
 */

import { IpcRenderer, ConfigIpc, TargetIpc, SystemIpc } from './ipc-renderer.js';

/**
 * UI Controller
 * Manages UI state and interactions
 */
const UIController = {
  /**
   * UI state
   * @private
   */
  _state: {
    activeTab: 'targets',
    theme: 'system',
    isTargetingMode: false,
    isRecording: false,
    isPlaying: false
  },
  
  /**
   * Initializes the UI controller
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing UI controller');
    
    // Set up IPC event listeners
    this._setupIpcListeners();
    
    // Load initial configuration
    await this._loadInitialConfig();
    
    // Set up generic UI event listeners
    this._setupUIEventListeners();
    
    console.log('UI controller initialized');
  },
  
  /**
   * Sets up IPC event listeners
   * 
   * @private
   * @returns {void}
   */
  _setupIpcListeners() {
    // Listen for trigger key pressed
    IpcRenderer.on('ui:trigger-key-pressed', () => {
      console.log('Trigger key pressed');
      this.showNotification('Trigger key pressed');
    });
    
    // Listen for targeting mode changes
    IpcRenderer.on('ui:targeting-mode-changed', (data) => {
      console.log('Targeting mode changed', data);
      this.setTargetingMode(data.enabled);
    });
    
    // Listen for theme changes
    IpcRenderer.on('ui:theme-changed', (data) => {
      console.log('Theme changed', data);
      this.applyTheme(data.theme);
    });
    
    // Listen for initialization errors
    IpcRenderer.on('app:initialization-error', (data) => {
      console.error('Initialization error', data);
      this.showError('Application Initialization Error', data.message);
    });
  },
  
  /**
   * Loads initial configuration
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadInitialConfig() {
    try {
      // Get configuration
      const config = await ConfigIpc.getConfig();
      
      // Apply theme
      this.applyTheme(config.appearance.theme);
      
      // Store state
      this._state.theme = config.appearance.theme;
      
      console.log('Initial configuration loaded', config);
    } catch (error) {
      console.error('Failed to load initial configuration', error);
      this.showError('Configuration Error', 'Failed to load application configuration');
    }
  },
  
  /**
   * Sets up generic UI event listeners
   * 
   * @private
   * @returns {void}
   */
  _setupUIEventListeners() {
    // Theme toggle button
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', () => this.toggleTheme());
    }
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });
    
    // Status message auto-hide
    const statusMessage = document.querySelector('.status-message');
    if (statusMessage) {
      // Clear success messages after 3 seconds
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'class' && 
              statusMessage.classList.contains('status-success') && 
              !statusMessage.classList.contains('status-error')) {
            setTimeout(() => {
              if (!statusMessage.classList.contains('status-error')) {
                statusMessage.textContent = 'Ready';
                statusMessage.classList.remove('status-success');
              }
            }, 3000);
          }
        });
      });
      
      observer.observe(statusMessage, { attributes: true });
    }
    
    // Cancel button
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        if (this._state.isPlaying) {
          this.stopMacroPlayback();
        }
        if (this._state.isRecording) {
          this.stopMacroRecording();
        }
        if (this._state.isTargetingMode) {
          this.setTargetingMode(false);
        }
      });
    }
    
    // Keyboard events
    document.addEventListener('keydown', event => {
      // Escape key handler
      if (event.key === 'Escape') {
        if (this._state.isTargetingMode) {
          this.setTargetingMode(false);
          event.preventDefault();
        }
      }
    });
  },
  
  /**
   * Switches to a specific tab
   * 
   * @param {string} tabName - Name of the tab to switch to
   * @returns {void}
   */
  switchTab(tabName) {
    if (this._state.activeTab === tabName) {
      return;
    }
    
    console.log(`Switching to tab: ${tabName}`);
    
    // Update active tab button
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Update active tab panel
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
      if (panel.id === `${tabName}-tab`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    // Update state
    this._state.activeTab = tabName;
  },
  
  /**
   * Toggles between light and dark themes
   * 
   * @returns {Promise<void>}
   */
  async toggleTheme() {
    try {
      const currentTheme = document.documentElement.className || 'light-theme';
      const newThemeClass = currentTheme.includes('dark') ? 'light-theme' : 'dark-theme';
      const newTheme = newThemeClass === 'light-theme' ? 'light' : 'dark';
      
      console.log(`Toggling theme from ${currentTheme} to ${newThemeClass}`);
      
      // Apply the theme
      this.applyTheme(newTheme);
      
      // Update state
      this._state.theme = newTheme;
      
      // Save the theme preference
      await ConfigIpc.setConfig('appearance.theme', newTheme);
    } catch (error) {
      console.error('Failed to toggle theme', error);
      this.showError('Theme Error', 'Failed to change theme');
    }
  },
  
  /**
   * Applies a theme to the document
   * 
   * @param {string} theme - Theme to apply ('light', 'dark', or 'system')
   * @returns {void}
   */
  applyTheme(theme) {
    console.log(`Applying theme: ${theme}`);
    
    // Remove any existing theme classes
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      // Use specified theme
      document.documentElement.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
    }
  },
  
  /**
   * Sets targeting mode state
   * 
   * @param {boolean} enabled - Whether targeting mode is enabled
   * @returns {void}
   */
  setTargetingMode(enabled) {
    console.log(`Setting targeting mode: ${enabled}`);
    
    const targetingOverlay = document.getElementById('targeting-overlay');
    
    if (enabled) {
      // Enable targeting mode
      targetingOverlay.classList.remove('hidden');
      document.body.classList.add('targeting-mode');
    } else {
      // Disable targeting mode
      targetingOverlay.classList.add('hidden');
      document.body.classList.remove('targeting-mode');
    }
    
    // Update state
    this._state.isTargetingMode = enabled;
  },
  
  /**
   * Updates the status message
   * 
   * @param {string} message - Status message to display
   * @param {boolean} [isError=false] - Whether this is an error message
   * @returns {void}
   */
  updateStatus(message, isError = false) {
    console.log(`Updating status: ${message}`, { isError });
    
    const statusMessage = document.querySelector('.status-message');
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    
    // Reset classes
    statusMessage.classList.remove('status-error', 'status-success');
    
    if (isError) {
      statusMessage.classList.add('status-error');
    } else {
      statusMessage.classList.add('status-success');
    }
  },
  
  /**
   * Shows a notification in the UI
   * 
   * @param {string} message - Notification message
   * @returns {void}
   */
  showNotification(message) {
    console.log(`Showing notification: ${message}`);
    
    // For now, just update the status
    this.updateStatus(message);
    
    // In a more complete implementation, this would show a toast notification
  },
  
  /**
   * Shows an error message
   * 
   * @param {string} title - Error title
   * @param {string} message - Error message
   * @returns {void}
   */
  showError(title, message) {
    console.error(`Error: ${title} - ${message}`);
    
    // Update status with error
    this.updateStatus(`Error: ${message}`, true);
    
    // In a more complete implementation, this would show a modal dialog
  },
  
  /**
   * Starts macro recording
   * 
   * @returns {Promise<void>}
   */
  async startMacroRecording() {
    try {
      console.log('Starting macro recording');
      
      // Update state
      this._state.isRecording = true;
      
      // Update UI
      const recordButton = document.getElementById('record-macro');
      const stopButton = document.getElementById('stop-recording');
      
      if (recordButton) recordButton.disabled = true;
      if (stopButton) stopButton.disabled = false;
      
      this.updateStatus('Recording macro...');
      
      // This would typically start the actual recording via IPC
    } catch (error) {
      console.error('Failed to start macro recording', error);
      this.showError('Recording Error', 'Failed to start macro recording');
      this._state.isRecording = false;
    }
  },
  
  /**
   * Stops macro recording
   * 
   * @returns {Promise<void>}
   */
  async stopMacroRecording() {
    try {
      console.log('Stopping macro recording');
      
      // Update state
      this._state.isRecording = false;
      
      // Update UI
      const recordButton = document.getElementById('record-macro');
      const stopButton = document.getElementById('stop-recording');
      
      if (recordButton) recordButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
      
      this.updateStatus('Macro recording stopped');
      
      // This would typically stop the actual recording via IPC
    } catch (error) {
      console.error('Failed to stop macro recording', error);
      this.showError('Recording Error', 'Failed to stop macro recording');
    }
  },
  
  /**
   * Starts macro playback
   * 
   * @param {string} macroId - ID of the macro to play
   * @returns {Promise<void>}
   */
  async startMacroPlayback(macroId) {
    try {
      console.log(`Starting macro playback: ${macroId}`);
      
      // Update state
      this._state.isPlaying = true;
      
      // Show cancel button
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) cancelButton.classList.remove('hidden');
      
      this.updateStatus('Playing macro...');
      
      // This would typically start the actual playback via IPC
    } catch (error) {
      console.error('Failed to start macro playback', error);
      this.showError('Playback Error', 'Failed to start macro playback');
      this._state.isPlaying = false;
      
      // Hide cancel button
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) cancelButton.classList.add('hidden');
    }
  },
  
  /**
   * Stops macro playback
   * 
   * @returns {Promise<void>}
   */
  async stopMacroPlayback() {
    try {
      console.log('Stopping macro playback');
      
      // Update state
      this._state.isPlaying = false;
      
      // Hide cancel button
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) cancelButton.classList.add('hidden');
      
      this.updateStatus('Macro playback stopped');
      
      // This would typically stop the actual playback via IPC
    } catch (error) {
      console.error('Failed to stop macro playback', error);
      this.showError('Playback Error', 'Failed to stop macro playback');
    }
  }
};

// Initialize the UI controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  UIController.initialize();
});

// Export the UI controller as a global for access from other modules
window.UIController = UIController;

export default UIController;