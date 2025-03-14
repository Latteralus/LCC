/**
 * settings-panel.js
 * Component for application settings management
 */

import { ConfigIpc } from '../js/ipc-renderer.js';

/**
 * Settings Panel Component
 * Provides UI for managing application settings
 */
const SettingsPanel = {
  /**
   * Settings state
   * @private
   */
  _state: {
    originalConfig: null,
    currentConfig: null,
    isModified: false,
    isSaving: false
  },

  /**
   * DOM elements
   * @private
   */
  _elements: {
    form: null,
    saveButton: null,
    resetButton: null,
    triggerKeyField: null,
    allowModifiersField: null,
    targetDelayField: null,
    clickTypeField: null,
    themeField: null,
    indicatorColorField: null,
    indicatorSizeField: null,
    statusMessage: null
  },

  /**
   * Event handlers
   * @private
   */
  _handlers: {
    formChange: null,
    formSubmit: null,
    formReset: null
  },

  /**
   * Callback functions
   * @private
   */
  _callbacks: {
    onSave: null,
    onReset: null,
    onThemeChange: null
  },

  /**
   * Initializes the settings panel
   * 
   * @param {Object} options - Initialization options
   * @param {Function} options.onSave - Callback when settings are saved
   * @param {Function} options.onReset - Callback when settings are reset
   * @param {Function} options.onThemeChange - Callback when theme is changed
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    console.log('Initializing settings panel component');

    // Store callbacks
    if (options.onSave) {
      this._callbacks.onSave = options.onSave;
    }
    
    if (options.onReset) {
      this._callbacks.onReset = options.onReset;
    }
    
    if (options.onThemeChange) {
      this._callbacks.onThemeChange = options.onThemeChange;
    }

    // Cache DOM elements
    this._cacheElements();

    // Create bound event handlers
    this._createEventHandlers();

    // Attach event listeners
    this._attachEventListeners();

    // Load configuration
    await this._loadConfig();

    console.log('Settings panel component initialized');
  },

  /**
   * Caches frequently used DOM elements
   * 
   * @private
   * @returns {void}
   */
  _cacheElements() {
    this._elements.form = document.getElementById('settings-form');
    this._elements.saveButton = document.querySelector('#settings-form button[type="submit"]');
    this._elements.resetButton = document.querySelector('#settings-form button[type="reset"]');
    this._elements.triggerKeyField = document.getElementById('trigger-key');
    this._elements.allowModifiersField = document.getElementById('allow-modifiers');
    this._elements.targetDelayField = document.getElementById('target-delay');
    this._elements.clickTypeField = document.getElementById('click-type');
    this._elements.themeField = document.getElementById('theme');
    this._elements.indicatorColorField = document.getElementById('indicator-color');
    this._elements.indicatorSizeField = document.getElementById('indicator-size');
    this._elements.statusMessage = document.querySelector('.status-message');
  },

  /**
   * Creates bound event handlers
   * 
   * @private
   * @returns {void}
   */
  _createEventHandlers() {
    // Form change handler
    this._handlers.formChange = (event) => {
      this._handleFormChange(event);
    };

    // Form submit handler
    this._handlers.formSubmit = (event) => {
      event.preventDefault();
      this._handleSave();
    };

    // Form reset handler
    this._handlers.formReset = (event) => {
      event.preventDefault();
      this._handleReset();
    };
  },

  /**
   * Attaches event listeners to DOM elements
   * 
   * @private
   * @returns {void}
   */
  _attachEventListeners() {
    if (this._elements.form) {
      // Listen for form submission
      this._elements.form.addEventListener('submit', this._handlers.formSubmit);
      
      // Listen for form reset
      this._elements.form.addEventListener('reset', this._handlers.formReset);
      
      // Listen for changes on all form fields
      const fields = this._elements.form.querySelectorAll('input, select');
      fields.forEach(field => {
        field.addEventListener('change', this._handlers.formChange);
        
        // For text inputs, also listen for keyup
        if (field.type === 'text' || field.type === 'number') {
          field.addEventListener('keyup', this._handlers.formChange);
        }
      });
      
      // Special handler for theme changes to apply immediately
      if (this._elements.themeField) {
        this._elements.themeField.addEventListener('change', (event) => {
          this._handleThemeChange(event.target.value);
        });
      }
    }
  },

  /**
   * Loads configuration from the main process
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadConfig() {
    try {
      // Get configuration
      const config = await ConfigIpc.getConfig();
      
      // Store original and current configs
      this._state.originalConfig = config;
      this._state.currentConfig = JSON.parse(JSON.stringify(config)); // Deep clone
      
      // Populate form fields
      this._populateForm(config);
      
      console.log('Configuration loaded', config);
    } catch (error) {
      console.error('Failed to load configuration', error);
      this._showStatus('Error loading configuration', true);
    }
  },

  /**
   * Populates form fields with configuration values
   * 
   * @private
   * @param {Object} config - Configuration object
   * @returns {void}
   */
  _populateForm(config) {
    if (!config) return;
    
    // Set form field values from config
    if (this._elements.triggerKeyField) {
      this._elements.triggerKeyField.value = config.triggerKey;
    }
    
    if (this._elements.allowModifiersField) {
      this._elements.allowModifiersField.checked = config.allowModifiers;
    }
    
    if (this._elements.targetDelayField) {
      this._elements.targetDelayField.value = config.targetDelay;
    }
    
    if (this._elements.clickTypeField) {
      this._elements.clickTypeField.value = config.clickSimulation.defaultClickType;
    }
    
    if (this._elements.themeField) {
      this._elements.themeField.value = config.appearance.theme;
    }
    
    if (this._elements.indicatorColorField) {
      this._elements.indicatorColorField.value = config.appearance.targetIndicatorColor;
    }
    
    if (this._elements.indicatorSizeField && config.appearance.targetIndicatorSize) {
      this._elements.indicatorSizeField.value = config.appearance.targetIndicatorSize;
    }
  },

  /**
   * Handles form field changes
   * 
   * @private
   * @param {Event} event - Change event
   * @returns {void}
   */
  _handleFormChange(event) {
    if (!this._state.currentConfig) return;
    
    const field = event.target;
    const name = field.name;
    let value;
    
    // Get the appropriate value based on field type
    if (field.type === 'checkbox') {
      value = field.checked;
    } else if (field.type === 'number') {
      value = Number(field.value);
    } else {
      value = field.value;
    }
    
    console.log(`Field changed: ${name} = ${value}`);
    
    // Update current config based on field name
    switch (name) {
      case 'triggerKey':
        this._state.currentConfig.triggerKey = value;
        break;
        
      case 'allowModifiers':
        this._state.currentConfig.allowModifiers = value;
        break;
        
      case 'targetDelay':
        this._state.currentConfig.targetDelay = value;
        break;
        
      case 'defaultClickType':
        this._state.currentConfig.clickSimulation.defaultClickType = value;
        break;
        
      case 'theme':
        this._state.currentConfig.appearance.theme = value;
        break;
        
      case 'targetIndicatorColor':
        this._state.currentConfig.appearance.targetIndicatorColor = value;
        break;
        
      case 'targetIndicatorSize':
        this._state.currentConfig.appearance.targetIndicatorSize = value;
        break;
    }
    
    // Update modified state by comparing with original
    this._state.isModified = JSON.stringify(this._state.currentConfig) !== JSON.stringify(this._state.originalConfig);
    
    // Update save button state
    if (this._elements.saveButton) {
      this._elements.saveButton.disabled = !this._state.isModified;
    }
  },

  /**
   * Handles save button click
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _handleSave() {
    if (!this._state.isModified || this._state.isSaving) {
      return;
    }
    
    try {
      console.log('Saving configuration');
      
      // Update status
      this._showStatus('Saving settings...');
      
      // Set saving state
      this._state.isSaving = true;
      if (this._elements.saveButton) {
        this._elements.saveButton.disabled = true;
      }
      
      // Save configuration
      await ConfigIpc.setConfig(this._state.currentConfig);
      
      // Update original config
      this._state.originalConfig = JSON.parse(JSON.stringify(this._state.currentConfig));
      
      // Reset modified state
      this._state.isModified = false;
      
      // Show success message
      this._showStatus('Settings saved successfully');
      
      // Call callback
      if (this._callbacks.onSave) {
        this._callbacks.onSave(this._state.currentConfig);
      }
    } catch (error) {
      console.error('Failed to save configuration', error);
      this._showStatus('Error saving configuration', true);
    } finally {
      // Reset saving state
      this._state.isSaving = false;
      if (this._elements.saveButton) {
        this._elements.saveButton.disabled = false;
      }
    }
  },

  /**
   * Handles reset button click
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _handleReset() {
    try {
      console.log('Resetting configuration');
      
      // Confirm reset
      const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
      if (!confirmed) {
        return;
      }
      
      // Update status
      this._showStatus('Resetting settings...');
      
      // Reset configuration
      const defaultConfig = await ConfigIpc.resetConfig();
      
      // Update state
      this._state.originalConfig = defaultConfig;
      this._state.currentConfig = JSON.parse(JSON.stringify(defaultConfig));
      this._state.isModified = false;
      
      // Update form
      this._populateForm(defaultConfig);
      
      // Apply theme
      this._handleThemeChange(defaultConfig.appearance.theme);
      
      // Show success message
      this._showStatus('Settings reset to defaults');
      
      // Call callback
      if (this._callbacks.onReset) {
        this._callbacks.onReset(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to reset configuration', error);
      this._showStatus('Error resetting configuration', true);
    }
  },

  /**
   * Handles theme changes
   * 
   * @private
   * @param {string} theme - New theme value
   * @returns {void}
   */
  _handleThemeChange(theme) {
    console.log(`Applying theme: ${theme}`);
    
    // Call callback to apply theme
    if (this._callbacks.onThemeChange) {
      this._callbacks.onThemeChange(theme);
    }
  },

  /**
   * Shows a status message
   * 
   * @private
   * @param {string} message - Message to display
   * @param {boolean} [isError=false] - Whether this is an error message
   * @returns {void}
   */
  _showStatus(message, isError = false) {
    if (this._elements.statusMessage) {
      this._elements.statusMessage.textContent = message;
      
      // Reset classes
      this._elements.statusMessage.classList.remove('status-error', 'status-success');
      
      if (isError) {
        this._elements.statusMessage.classList.add('status-error');
      } else {
        this._elements.statusMessage.classList.add('status-success');
      }
      
      // Clear the status after a delay (for non-error messages)
      if (!isError && message !== 'Ready') {
        setTimeout(() => {
          if (this._elements.statusMessage) {
            this._elements.statusMessage.textContent = 'Ready';
            this._elements.statusMessage.classList.remove('status-error', 'status-success');
          }
        }, 3000);
      }
    }
  },

  /**
   * Gets the current settings state
   * 
   * @returns {Object} - Current state
   */
  getState() {
    return {
      isModified: this._state.isModified,
      isSaving: this._state.isSaving,
      currentConfig: this._state.currentConfig
    };
  },

  /**
   * Adds a custom setting section to the settings form
   * 
   * @param {string} sectionTitle - Title for the section
   * @param {Array} fields - Array of field configuration objects
   * @returns {void}
   */
  addCustomSection(sectionTitle, fields) {
    if (!this._elements.form) return;
    
    // Create section container
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    // Create section title
    const title = document.createElement('h3');
    title.textContent = sectionTitle;
    section.appendChild(title);
    
    // Create fields
    fields.forEach(field => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      // Create label
      const label = document.createElement('label');
      label.setAttribute('for', field.id);
      label.textContent = field.label;
      formGroup.appendChild(label);
      
      // Create input based on type
      let input;
      
      switch (field.type) {
        case 'text':
        case 'number':
        case 'color':
          input = document.createElement('input');
          input.type = field.type;
          input.id = field.id;
          input.name = field.name;
          input.value = field.value || '';
          
          if (field.min !== undefined) input.min = field.min;
          if (field.max !== undefined) input.max = field.max;
          if (field.step !== undefined) input.step = field.step;
          if (field.placeholder) input.placeholder = field.placeholder;
          break;
          
        case 'checkbox':
          input = document.createElement('input');
          input.type = 'checkbox';
          input.id = field.id;
          input.name = field.name;
          input.checked = field.checked || false;
          break;
          
        case 'select':
          input = document.createElement('select');
          input.id = field.id;
          input.name = field.name;
          
          if (field.options && Array.isArray(field.options)) {
            field.options.forEach(option => {
              const optionEl = document.createElement('option');
              optionEl.value = option.value;
              optionEl.textContent = option.label;
              if (option.value === field.value) {
                optionEl.selected = true;
              }
              input.appendChild(optionEl);
            });
          }
          break;
      }
      
      // Add event listeners
      if (input) {
        input.addEventListener('change', this._handlers.formChange);
        
        if (input.type === 'text' || input.type === 'number') {
          input.addEventListener('keyup', this._handlers.formChange);
        }
        
        formGroup.appendChild(input);
      }
      
      // Add description if provided
      if (field.description) {
        const description = document.createElement('small');
        description.className = 'form-description';
        description.textContent = field.description;
        formGroup.appendChild(description);
      }
      
      section.appendChild(formGroup);
    });
    
    // Append section before the form actions
    const formActions = this._elements.form.querySelector('.form-actions');
    if (formActions) {
      this._elements.form.insertBefore(section, formActions);
    } else {
      this._elements.form.appendChild(section);
    }
  }
};

// Export the component
export default SettingsPanel;