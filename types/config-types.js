/**
 * config-types.js
 * Type definitions for application configuration
 */

/**
 * @typedef {Object} ClickSimulationConfig
 * @property {('left'|'right'|'double')} defaultClickType - Default click type for simulations
 * @property {number} defaultClickCount - Default number of clicks (for single clicks)
 */

/**
 * @typedef {Object} AppearanceConfig
 * @property {('system'|'light'|'dark')} theme - UI theme preference
 * @property {string} targetIndicatorColor - Color for target indicators (hex format)
 * @property {number} targetIndicatorSize - Size of target indicator in pixels
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} schemaVersion - Version of the config schema
 * @property {string} triggerKey - Key that triggers the macro
 * @property {boolean} allowModifiers - Whether modifier keys are allowed with trigger
 * @property {number} targetDelay - Delay before clicking a target (ms)
 * @property {ClickSimulationConfig} clickSimulation - Click simulation settings
 * @property {AppearanceConfig} appearance - UI appearance settings
 */

/**
 * Default configuration with schema version 1.0
 * @type {AppConfig}
 */
const DEFAULT_CONFIG = {
    schemaVersion: '1.0',
    triggerKey: '`',
    allowModifiers: true,
    targetDelay: 250,
    clickSimulation: {
      defaultClickType: 'left',
      defaultClickCount: 1
    },
    appearance: {
      theme: 'system',
      targetIndicatorColor: '#FF5733',
      targetIndicatorSize: 20
    }
  };
  
  /**
   * Configuration schema versions for migrations
   * @type {Object.<string, Object>}
   */
  const CONFIG_SCHEMAS = {
    '1.0': {
      schemaVersion: { type: 'string', required: true },
      triggerKey: { type: 'string', required: true },
      allowModifiers: { type: 'boolean', required: true },
      targetDelay: { type: 'number', required: true, min: 0, max: 5000 },
      clickSimulation: {
        type: 'object',
        required: true,
        properties: {
          defaultClickType: { 
            type: 'string', 
            required: true,
            enum: ['left', 'right', 'double']
          },
          defaultClickCount: { 
            type: 'number', 
            required: true, 
            min: 1, 
            max: 3
          }
        }
      },
      appearance: {
        type: 'object',
        required: true,
        properties: {
          theme: { 
            type: 'string', 
            required: true,
            enum: ['system', 'light', 'dark']
          },
          targetIndicatorColor: { 
            type: 'string', 
            required: true,
            pattern: /^#[0-9A-Fa-f]{6}$/
          },
          targetIndicatorSize: { 
            type: 'number', 
            required: true,
            min: 10,
            max: 50
          }
        }
      }
    }
    // Future schema versions can be added here
  };
  
  // Export the types and constants
  module.exports = {
    DEFAULT_CONFIG,
    CONFIG_SCHEMAS
  };