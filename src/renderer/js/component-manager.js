/**
 * component-manager.js
 * Manages the initialization and integration of UI components
 */

import TargetingOverlay from '../components/targeting-overlay.js';
import MacroEditor from '../components/macro-editor.js';
import SettingsPanel from '../components/settings-panel.js';
import { ConfigIpc, TargetIpc, MacroIpc } from './ipc-renderer.js';

/**
 * Component Manager
 * Initializes and coordinates UI components
 */
const ComponentManager = {
  /**
   * Initializes all components
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing UI components');
    
    try {
      // Initialize targeting overlay
      await this._initTargetingOverlay();
      
      // Initialize macro editor
      await this._initMacroEditor();
      
      // Initialize settings panel
      await this._initSettingsPanel();
      
      console.log('All UI components initialized');
    } catch (error) {
      console.error('Failed to initialize UI components', error);
      window.UIController.showError('Component Error', 'Failed to initialize UI components');
    }
  },
  
  /**
   * Initializes the targeting overlay component
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initTargetingOverlay() {
    // Load configuration
    const config = await ConfigIpc.getConfig();
    
    // Initialize targeting overlay
    await TargetingOverlay.initialize({
      onTargetSelected: async (coordinates) => {
        try {
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
            x: coordinates.x,
            y: coordinates.y
          });
          
          // Update UI
          window.TargetUI.updateTargetsList();
          
          window.UIController.updateStatus('Target created successfully');
        } catch (error) {
          console.error('Error creating target:', error);
          window.UIController.updateStatus('Error creating target', true);
        }
      },
      onCancel: () => {
        window.UIController.updateStatus('Targeting canceled');
      }
    });
    
    // Apply configuration
    TargetingOverlay.setCrosshairColor(config.appearance.targetIndicatorColor);
    TargetingOverlay.setCrosshairSize(config.appearance.targetIndicatorSize || 20);
    
    // Make targeting overlay accessible from TargetUI
    if (window.TargetUI) {
      // Override startTargeting method
      const originalStartTargeting = window.TargetUI.startTargeting;
      window.TargetUI.startTargeting = function() {
        if (originalStartTargeting) {
          originalStartTargeting.call(window.TargetUI);
        }
        TargetingOverlay.show();
      };
      
      // Override stopTargeting method
      const originalStopTargeting = window.TargetUI.stopTargeting;
      window.TargetUI.stopTargeting = function() {
        if (originalStopTargeting) {
          originalStopTargeting.call(window.TargetUI);
        }
        TargetingOverlay.hide();
      };
    }
  },
  
  /**
   * Initializes the macro editor component
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initMacroEditor() {
    // Initialize macro editor
    await MacroEditor.initialize({
      onSave: (macro) => {
        window.UIController.updateStatus('Macro saved successfully');
        
        // Update macros list if MacroUI is available
        if (window.MacroUI && typeof window.MacroUI.updateMacrosList === 'function') {
          window.MacroUI.updateMacrosList();
        }
      },
      onCancel: () => {
        window.UIController.updateStatus('Macro editing canceled');
      },
      onRecordingStart: () => {
        window.UIController.updateStatus('Recording macro...');
      },
      onRecordingStop: (macro) => {
        window.UIController.updateStatus('Macro recording completed');
      }
    });
    
    // Make macro editor accessible from MacroUI
    if (window.MacroUI) {
      // Add openEditModal method if it doesn't exist
      if (!window.MacroUI.openEditModal) {
        window.MacroUI.openEditModal = async function(macroId) {
          try {
            // Get the macro
            const macro = await MacroIpc.getMacro(macroId);
            
            // Set as current macro for editing
            MacroEditor.setMacro(macro);
            
            // Show the editor
            MacroEditor.show();
          } catch (error) {
            console.error('Error getting macro for edit:', error);
            window.UIController.showError('Macro Error', 'Failed to edit macro');
          }
        };
      }
    }
  },
  
  /**
   * Initializes the settings panel component
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initSettingsPanel() {
    // Initialize settings panel
    await SettingsPanel.initialize({
      onSave: (config) => {
        window.UIController.updateStatus('Settings saved successfully');
        
        // Apply configuration changes
        this._applyConfigChanges(config);
      },
      onReset: (config) => {
        window.UIController.updateStatus('Settings reset to defaults');
        
        // Apply configuration changes
        this._applyConfigChanges(config);
      },
      onThemeChange: (theme) => {
        // Apply theme if UIController is available
        if (window.UIController && typeof window.UIController.applyTheme === 'function') {
          window.UIController.applyTheme(theme);
        }
      }
    });
    
    // Add targeting size field if it doesn't exist
    const targetSizeField = document.getElementById('indicator-size');
    if (!targetSizeField) {
      SettingsPanel.addCustomSection('Target Appearance', [
        {
          id: 'indicator-size',
          name: 'targetIndicatorSize',
          type: 'number',
          label: 'Target Indicator Size:',
          value: 20,
          min: 10,
          max: 50,
          step: 1,
          description: 'Size of the targeting crosshair in pixels'
        }
      ]);
    }
  },
  
  /**
   * Applies configuration changes to components
   * 
   * @private
   * @param {Object} config - Updated configuration
   * @returns {void}
   */
  _applyConfigChanges(config) {
    // Apply targeting overlay settings
    if (config.appearance) {
      TargetingOverlay.setCrosshairColor(config.appearance.targetIndicatorColor);
      TargetingOverlay.setCrosshairSize(config.appearance.targetIndicatorSize || 20);
    }
    
    // Apply theme
    if (config.appearance && config.appearance.theme) {
      if (window.UIController && typeof window.UIController.applyTheme === 'function') {
        window.UIController.applyTheme(config.appearance.theme);
      }
    }
  }
};

// Initialize the component manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ComponentManager.initialize();
});

// Export the component manager
export default ComponentManager;