/**
 * renderer-main.js
 * Main entry point for the renderer process
 */

// Import modules
import './ui-controller.js';
import './target-ui.js';
import './macro-ui.js';
import './component-manager.js';  // Import the new component manager

// DOM references
const themeToggleButton = document.getElementById('theme-toggle');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const settingsForm = document.getElementById('settings-form');
const statusMessage = document.querySelector('.status-message');
const versionInfo = document.querySelector('.version-info');

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Renderer process initialized');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI state
    await initializeUIState();
    
    // Display platform info
    displayPlatformInfo();
    
    // Update status message
    updateStatus('Ready');
  } catch (error) {
    console.error('Error initializing renderer:', error);
    updateStatus('Error initializing application', true);
  }
});

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Theme toggle
  themeToggleButton.addEventListener('click', toggleTheme);
  
  // Tab navigation
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Settings form
  settingsForm.addEventListener('submit', handleSettingsSubmit);
  settingsForm.addEventListener('reset', handleSettingsReset);
  
  // Window events for focus
  window.addEventListener('focus', () => {
    document.body.classList.add('app-focused');
  });
  
  window.addEventListener('blur', () => {
    document.body.classList.remove('app-focused');
  });
}

/**
 * Initialize UI state based on saved configuration
 */
async function initializeUIState() {
  try {
    // Get saved config
    const config = await window.api.send('config:get');
    
    if (!config.success) {
      throw new Error('Failed to load configuration');
    }
    
    // Apply theme
    applyTheme(config.data.appearance.theme);
    
    // Populate settings form
    populateSettingsForm(config.data);
    
    // Load targets
    const targetsResponse = await window.api.send('target:get-all');
    if (targetsResponse.success) {
      updateTargetsList(targetsResponse.data);
    }
    
    // Load macros
    const macrosResponse = await window.api.send('macro:get-all');
    if (macrosResponse.success) {
      updateMacrosList(macrosResponse.data);
    }
  } catch (error) {
    console.error('Error initializing UI state:', error);
    throw error;
  }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.documentElement.className || 'light-theme';
  const newTheme = currentTheme.includes('dark') ? 'light-theme' : 'dark-theme';
  
  applyTheme(newTheme);
  
  // Save the theme preference
  window.api.send('config:set', {
    path: 'appearance.theme',
    value: newTheme === 'light-theme' ? 'light' : 'dark'
  });
}

/**
 * Apply the specified theme to the document
 * 
 * @param {string} theme - Theme to apply ('light', 'dark', or 'system')
 */
function applyTheme(theme) {
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
}

/**
 * Switch between tabs
 * 
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
  // Update active tab button
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update active tab panel
  tabPanels.forEach(panel => {
    if (panel.id === `${tabName}-tab`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

/**
 * Handle settings form submission
 * 
 * @param {Event} event - Form submit event
 */
async function handleSettingsSubmit(event) {
  event.preventDefault();
  
  try {
    updateStatus('Saving settings...');
    
    const formData = new FormData(event.target);
    const settings = {};
    
    // Process form data into settings object
    for (const [key, value] of formData.entries()) {
      // Convert checkbox values to booleans
      if (event.target.elements[key].type === 'checkbox') {
        settings[key] = event.target.elements[key].checked;
      } 
      // Convert number inputs to numbers
      else if (event.target.elements[key].type === 'number') {
        settings[key] = Number(value);
      }
      // Everything else as string
      else {
        settings[key] = value;
      }
    }
    
    // Send settings to main process
    const response = await window.api.send('config:set', {
      value: {
        triggerKey: settings.triggerKey,
        allowModifiers: settings.allowModifiers,
        targetDelay: settings.targetDelay,
        clickSimulation: {
          defaultClickType: settings.defaultClickType
        },
        appearance: {
          theme: settings.theme,
          targetIndicatorColor: settings.targetIndicatorColor
        }
      }
    });
    
    if (response.success) {
      updateStatus('Settings saved successfully');
      
      // Apply theme if it was changed
      applyTheme(settings.theme);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    updateStatus('Error saving settings', true);
  }
}

/**
 * Handle settings form reset
 * 
 * @param {Event} event - Form reset event
 */
async function handleSettingsReset(event) {
  try {
    updateStatus('Resetting settings...');
    
    // Reset to default config
    const response = await window.api.send('config:reset');
    
    if (response.success) {
      // Populate form with default values
      populateSettingsForm(response.data);
      
      // Apply default theme
      applyTheme(response.data.appearance.theme);
      
      updateStatus('Settings reset to defaults');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    updateStatus('Error resetting settings', true);
  }
}

/**
 * Populate settings form with values from config
 * 
 * @param {Object} config - Configuration object
 */
function populateSettingsForm(config) {
  // Set form field values from config
  document.getElementById('trigger-key').value = config.triggerKey;
  document.getElementById('allow-modifiers').checked = config.allowModifiers;
  document.getElementById('target-delay').value = config.targetDelay;
  document.getElementById('click-type').value = config.clickSimulation.defaultClickType;
  document.getElementById('theme').value = config.appearance.theme;
  document.getElementById('indicator-color').value = config.appearance.targetIndicatorColor;
}

/**
 * Display platform-specific information
 */
function displayPlatformInfo() {
  const platform = window.platform.type;
  versionInfo.textContent = `v0.1.0 (${platform})`;
}

/**
 * Update the targets list in the UI
 * 
 * @param {Array} targets - Array of target objects
 */
function updateTargetsList(targets) {
  const targetsList = document.getElementById('targets-list');
  const noTargetsMessage = document.querySelector('.no-targets-message');
  
  if (targets.length === 0) {
    targetsList.innerHTML = '';
    noTargetsMessage.classList.remove('hidden');
    return;
  }
  
  noTargetsMessage.classList.add('hidden');
  
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
  
  targetsList.innerHTML = targetsHTML;
  
  // Add event listeners to the new target elements
  addTargetEventListeners();
}

/**
 * Add event listeners to target list items
 */
function addTargetEventListeners() {
  // Test buttons
  document.querySelectorAll('.target-test-button').forEach(button => {
    button.addEventListener('click', handleTargetTest);
  });
  
  // Edit buttons
  document.querySelectorAll('.target-edit-button').forEach(button => {
    button.addEventListener('click', handleTargetEdit);
  });
  
  // Delete buttons
  document.querySelectorAll('.target-delete-button').forEach(button => {
    button.addEventListener('click', handleTargetDelete);
  });
}

/**
 * Handle target test button click
 * 
 * @param {Event} event - Click event
 */
async function handleTargetTest(event) {
  const targetId = event.target.closest('.target-item').dataset.targetId;
  
  try {
    updateStatus('Testing target...');
    
    // Send request to test the target
    const response = await window.api.send('target:test', { targetId });
    
    if (response.success) {
      updateStatus('Target tested successfully');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error testing target:', error);
    updateStatus('Error testing target', true);
  }
}

/**
 * Handle target edit button click
 * 
 * @param {Event} event - Click event
 */
function handleTargetEdit(event) {
  const targetId = event.target.closest('.target-item').dataset.targetId;
  
  // This will be implemented in target-ui.js
  if (window.TargetUI && typeof window.TargetUI.openEditModal === 'function') {
    window.TargetUI.openEditModal(targetId);
  } else {
    console.error('TargetUI.openEditModal is not available');
  }
}

/**
 * Handle target delete button click
 * 
 * @param {Event} event - Click event
 */
async function handleTargetDelete(event) {
  const targetItem = event.target.closest('.target-item');
  const targetId = targetItem.dataset.targetId;
  const targetName = targetItem.querySelector('.target-item__name').textContent;
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete the target "${targetName}"?`)) {
    return;
  }
  
  try {
    updateStatus('Deleting target...');
    
    // Send delete request
    const response = await window.api.send('target:delete', { targetId });
    
    if (response.success) {
      // Remove from DOM
      targetItem.remove();
      
      // Check if this was the last target
      const remainingTargets = document.querySelectorAll('.target-item');
      if (remainingTargets.length === 0) {
        document.querySelector('.no-targets-message').classList.remove('hidden');
      }
      
      updateStatus('Target deleted successfully');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error deleting target:', error);
    updateStatus('Error deleting target', true);
  }
}

/**
 * Update the macros list in the UI
 * 
 * @param {Array} macros - Array of macro objects
 */
function updateMacrosList(macros) {
  const macrosList = document.getElementById('macros-list');
  const noMacrosMessage = document.querySelector('.no-macros-message');
  
  if (macros.length === 0) {
    macrosList.innerHTML = '';
    noMacrosMessage.classList.remove('hidden');
    return;
  }
  
  noMacrosMessage.classList.add('hidden');
  
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
  
  macrosList.innerHTML = macrosHTML;
  
  // Add event listeners to the new macro elements
  addMacroEventListeners();
}

/**
 * Add event listeners to macro list items
 */
function addMacroEventListeners() {
  // Play buttons
  document.querySelectorAll('.macro-play-button').forEach(button => {
    button.addEventListener('click', handleMacroPlay);
  });
  
  // Edit buttons
  document.querySelectorAll('.macro-edit-button').forEach(button => {
    button.addEventListener('click', handleMacroEdit);
  });
  
  // Delete buttons
  document.querySelectorAll('.macro-delete-button').forEach(button => {
    button.addEventListener('click', handleMacroDelete);
  });
}

/**
 * Handle macro play button click
 * 
 * @param {Event} event - Click event
 */
async function handleMacroPlay(event) {
  const macroId = event.target.closest('.macro-item').dataset.macroId;
  
  try {
    updateStatus('Playing macro...');
    
    // Display cancel button
    document.getElementById('cancel-button').classList.remove('hidden');
    
    // Send request to play the macro
    const response = await window.api.send('macro:play', { macroId });
    
    // Hide cancel button
    document.getElementById('cancel-button').classList.add('hidden');
    
    if (response.success) {
      updateStatus('Macro completed successfully');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error playing macro:', error);
    updateStatus('Error playing macro', true);
    
    // Hide cancel button
    document.getElementById('cancel-button').classList.add('hidden');
  }
}

/**
 * Handle macro edit button click
 * 
 * @param {Event} event - Click event
 */
function handleMacroEdit(event) {
  const macroId = event.target.closest('.macro-item').dataset.macroId;
  
  // This will be implemented in macro-ui.js
  if (window.MacroUI && typeof window.MacroUI.openEditModal === 'function') {
    window.MacroUI.openEditModal(macroId);
  } else {
    console.error('MacroUI.openEditModal is not available');
  }
}

/**
 * Handle macro delete button click
 * 
 * @param {Event} event - Click event
 */
async function handleMacroDelete(event) {
  const macroItem = event.target.closest('.macro-item');
  const macroId = macroItem.dataset.macroId;
  const macroName = macroItem.querySelector('.macro-item__name').textContent;
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete the macro "${macroName}"?`)) {
    return;
  }
  
  try {
    updateStatus('Deleting macro...');
    
    // Send delete request
    const response = await window.api.send('macro:delete', { macroId });
    
    if (response.success) {
      // Remove from DOM
      macroItem.remove();
      
      // Check if this was the last macro
      const remainingMacros = document.querySelectorAll('.macro-item');
      if (remainingMacros.length === 0) {
        document.querySelector('.no-macros-message').classList.remove('hidden');
      }
      
      updateStatus('Macro deleted successfully');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Error deleting macro:', error);
    updateStatus('Error deleting macro', true);
  }
}

/**
 * Update the status message in the footer
 * 
 * @param {string} message - Status message to display
 * @param {boolean} isError - Whether this is an error message
 */
function updateStatus(message, isError = false) {
  statusMessage.textContent = message;
  
  // Reset classes
  statusMessage.classList.remove('status-error', 'status-success');
  
  if (isError) {
    statusMessage.classList.add('status-error');
  } else {
    statusMessage.classList.add('status-success');
  }
  
  // Clear the status after a delay (for non-error messages)
  if (!isError && message !== 'Ready') {
    setTimeout(() => {
      statusMessage.textContent = 'Ready';
      statusMessage.classList.remove('status-error', 'status-success');
    }, 3000);
  }
}

// Export functions for use in other modules
window.AppUI = {
  updateStatus,
  updateTargetsList,
  updateMacrosList
};