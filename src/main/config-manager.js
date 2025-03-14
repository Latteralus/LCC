/**
 * config-manager.js
 * Manages application configuration loading, saving, and validation
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { DEFAULT_CONFIG, CONFIG_SCHEMAS } = require('../../types/config-types');
const { createLogger } = require('../../utils/logger');
const { validateObject } = require('../../utils/validation');

// Initialize logger
const logger = createLogger('ConfigManager');

/**
 * Configuration Manager
 * Handles loading, saving, and validation of app configuration
 */
const ConfigManager = {
  /**
   * Current loaded configuration
   * @private
   */
  _config: null,
  
  /**
   * Path to the user configuration file
   * @private
   */
  _userConfigPath: null,
  
  /**
   * Path to the default configuration file
   * @private
   */
  _defaultConfigPath: null,
  
  /**
   * Initializes the configuration manager
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    logger.info('Initializing configuration manager');
    
    // Set up config directory paths
    const configDir = path.join(app.getPath('userData'), 'config');
    this._userConfigPath = path.join(configDir, 'user-config.json');
    this._defaultConfigPath = path.join(configDir, 'default-config.json');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      logger.info('Creating config directory', configDir);
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Always write the current default config to disk
    // This ensures we have the latest default config available
    await this._saveDefaultConfig();
    
    // Load user configuration (or initialize with defaults)
    await this.load();
    
    logger.info('Configuration manager initialized');
  },
  
  /**
   * Loads configuration from disk
   * 
   * @returns {Promise<Object>} - The loaded configuration
   */
  async load() {
    try {
      logger.info('Loading configuration');
      
      // Check if user config exists
      if (fs.existsSync(this._userConfigPath)) {
        logger.debug('Reading user config', this._userConfigPath);
        
        // Read the user config file
        const configData = fs.readFileSync(this._userConfigPath, 'utf-8');
        const userConfig = JSON.parse(configData);
        
        // Migrate the config if needed
        const migratedConfig = this._migrateConfig(userConfig);
        
        // Validate the config
        const validation = this._validateConfig(migratedConfig);
        
        if (validation.valid) {
          // Use the valid migrated config
          this._config = migratedConfig;
          logger.info('User configuration loaded successfully');
        } else {
          // User config is invalid, fall back to defaults
          logger.warn('User configuration validation failed', validation.errors);
          logger.info('Falling back to default configuration');
          this._config = { ...DEFAULT_CONFIG };
        }
      } else {
        // No user config exists, use defaults
        logger.info('No user configuration found, using defaults');
        this._config = { ...DEFAULT_CONFIG };
        
        // Save the default config as the user config
        await this.save();
      }
      
      return this._config;
    } catch (error) {
      logger.error('Failed to load configuration', error);
      
      // Fall back to default config if there's an error
      this._config = { ...DEFAULT_CONFIG };
      return this._config;
    }
  },
  
  /**
   * Saves the current configuration to disk
   * 
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async save() {
    try {
      logger.info('Saving configuration');
      
      if (!this._config) {
        throw new Error('Configuration not initialized');
      }
      
      // Update the timestamp
      this._config.updatedAt = new Date().toISOString();
      
      // Write the config to file
      fs.writeFileSync(
        this._userConfigPath,
        JSON.stringify(this._config, null, 2),
        'utf-8'
      );
      
      logger.info('Configuration saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save configuration', error);
      return false;
    }
  },
  
  /**
   * Saves the default configuration to disk
   * 
   * @private
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async _saveDefaultConfig() {
    try {
      logger.debug('Saving default configuration');
      
      // Add timestamp to the default config
      const defaultConfigWithMeta = {
        ...DEFAULT_CONFIG,
        updatedAt: new Date().toISOString()
      };
      
      // Write the default config to file
      fs.writeFileSync(
        this._defaultConfigPath,
        JSON.stringify(defaultConfigWithMeta, null, 2),
        'utf-8'
      );
      
      logger.debug('Default configuration saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save default configuration', error);
      return false;
    }
  },
  
  /**
   * Gets the entire configuration or a specific value
   * 
   * @param {string} [path] - Optional dot notation path to a specific setting
   * @param {*} [defaultValue] - Default value if the path doesn't exist
   * @returns {*} - The requested configuration value
   */
  get(path, defaultValue) {
    if (!this._config) {
      logger.warn('Attempting to get config before initialization');
      return defaultValue;
    }
    
    // Return the entire config if no path is specified
    if (!path) {
      return { ...this._config };
    }
    
    // Navigate through the config object using the path
    const parts = path.split('.');
    let current = this._config;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  },
  
  /**
   * Sets a configuration value
   * 
   * @param {string} path - Dot notation path to the setting
   * @param {*} value - New value to set
   * @returns {boolean} - Whether the set operation was successful
   */
  set(path, value) {
    try {
      if (!this._config) {
        throw new Error('Configuration not initialized');
      }
      
      // Handle setting the entire config
      if (!path || path === '') {
        if (typeof value !== 'object' || value === null) {
          throw new Error('Setting entire config requires an object');
        }
        
        // Validate the new config
        const validation = this._validateConfig(value);
        if (!validation.valid) {
          logger.warn('Invalid configuration', validation.errors);
          return false;
        }
        
        // Keep the schema version
        value.schemaVersion = this._config.schemaVersion;
        
        // Set the new config
        this._config = value;
        return true;
      }
      
      // Navigate to the parent of the target property
      const parts = path.split('.');
      const targetProp = parts.pop();
      let current = this._config;
      
      for (const part of parts) {
        if (current[part] === undefined) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Set the value
      current[targetProp] = value;
      
      // Validate the updated config
      const validation = this._validateConfig(this._config);
      if (!validation.valid) {
        logger.warn('Updated configuration is invalid', validation.errors);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to set config value for path: ${path}`, error);
      return false;
    }
  },
  
  /**
   * Resets the configuration to default values
   * 
   * @returns {Object} - The default configuration
   */
  reset() {
    logger.info('Resetting configuration to defaults');
    
    this._config = { ...DEFAULT_CONFIG };
    return this._config;
  },
  
  /**
   * Migrates a configuration object to the latest schema version
   * 
   * @private
   * @param {Object} config - Configuration to migrate
   * @returns {Object} - Migrated configuration
   */
  _migrateConfig(config) {
    const currentVersion = config.schemaVersion || '1.0';
    const latestVersion = DEFAULT_CONFIG.schemaVersion;
    
    // If already on the latest version, no migration needed
    if (currentVersion === latestVersion) {
      return config;
    }
    
    logger.info(`Migrating config from ${currentVersion} to ${latestVersion}`);
    
    // Here we would implement specific migration logic for different versions
    // For now, we have a simple schema, so we'll just ensure all required properties exist
    
    const migratedConfig = {
      ...DEFAULT_CONFIG,  // Start with all defaults
      ...config,          // Override with existing values
      schemaVersion: latestVersion  // Ensure schema version is updated
    };
    
    // Ensure nested properties are properly merged
    if (config.clickSimulation) {
      migratedConfig.clickSimulation = {
        ...DEFAULT_CONFIG.clickSimulation,
        ...config.clickSimulation
      };
    }
    
    if (config.appearance) {
      migratedConfig.appearance = {
        ...DEFAULT_CONFIG.appearance,
        ...config.appearance
      };
    }
    
    logger.info('Configuration migration complete');
    return migratedConfig;
  },
  
  /**
   * Validates a configuration object against its schema
   * 
   * @private
   * @param {Object} config - Configuration to validate
   * @returns {import('../../utils/validation').ValidationResult} - Validation result
   */
  _validateConfig(config) {
    const schemaVersion = config.schemaVersion || DEFAULT_CONFIG.schemaVersion;
    const schema = CONFIG_SCHEMAS[schemaVersion];
    
    if (!schema) {
      logger.warn(`No schema found for version ${schemaVersion}`);
      return { valid: false, errors: [`Unknown schema version: ${schemaVersion}`] };
    }
    
    // Perform validation
    return validateObject(config, schema);
  }
};

module.exports = ConfigManager;