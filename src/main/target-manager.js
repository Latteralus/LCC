/**
 * target-manager.js
 * Manages target coordinates and operations
 */

const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');
const { createLogger } = require('../../utils/logger');
const { 
  createCoordinates, 
  globalToScreenCoordinates, 
  screenToGlobalCoordinates, 
  createTarget 
} = require('../../types/target-types');
const { validateObject, isString, isObject } = require('../../utils/validation');

// Initialize logger
const logger = createLogger('TargetManager');

/**
 * Target Manager
 * Handles management of click targets and their coordinates
 */
const TargetManager = {
  /**
   * Path to the targets storage file
   * @private
   */
  _targetsFilePath: null,
  
  /**
   * In-memory cache of loaded targets
   * @private
   */
  _targets: [],
  
  /**
   * Reference to the click simulator module
   * @private
   */
  _clickSimulator: null,
  
  /**
   * Initializes the target manager
   * 
   * @param {Object} options - Initialization options
   * @param {Object} [options.clickSimulator] - Click simulator module
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    logger.info('Initializing target manager');
    
    // Set up targets directory and file path
    const dataDir = path.join(app.getPath('userData'), 'data');
    this._targetsFilePath = path.join(dataDir, 'targets.json');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      logger.info('Creating data directory', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Store module references
    this._clickSimulator = options.clickSimulator;
    
    // Load targets from storage
    await this.loadTargets();
    
    logger.info('Target manager initialized');
  },
  
  /**
   * Loads targets from persistent storage
   * 
   * @returns {Promise<Array>} - The loaded targets
   */
  async loadTargets() {
    try {
      logger.info('Loading targets from storage');
      
      if (!fs.existsSync(this._targetsFilePath)) {
        logger.info('No targets file found, initializing empty array');
        this._targets = [];
        return this._targets;
      }
      
      const fileData = fs.readFileSync(this._targetsFilePath, 'utf-8');
      this._targets = JSON.parse(fileData);
      
      logger.info(`Loaded ${this._targets.length} targets from storage`);
      return this._targets;
    } catch (error) {
      logger.error('Failed to load targets', error);
      this._targets = [];
      return this._targets;
    }
  },
  
  /**
   * Saves targets to persistent storage
   * 
   * @returns {Promise<boolean>} - Whether the save was successful
   */
  async saveTargets() {
    try {
      logger.info(`Saving ${this._targets.length} targets to storage`);
      
      fs.writeFileSync(
        this._targetsFilePath,
        JSON.stringify(this._targets, null, 2),
        'utf-8'
      );
      
      logger.info('Targets saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save targets', error);
      return false;
    }
  },
  
  /**
   * Creates a new target
   * 
   * @param {Object} targetData - Target data
   * @param {string} targetData.name - Name of the target
   * @param {number} targetData.x - Global X coordinate
   * @param {number} targetData.y - Global Y coordinate
   * @param {Object} [targetData.options] - Additional options
   * @returns {Promise<Object>} - The created target
   */
  async createTarget(targetData) {
    try {
      logger.info('Creating new target', targetData);
      
      // Validate required fields
      if (!targetData || !targetData.name || targetData.x === undefined || targetData.y === undefined) {
        throw new Error('Target requires name, x, and y properties');
      }
      
      // Get all screens
      const displays = screen.getAllDisplays();
      
      // Convert global coordinates to screen-relative coordinates
      const coordinates = globalToScreenCoordinates(
        targetData.x, 
        targetData.y, 
        displays.map(display => ({
          id: display.id,
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
          isPrimary: display.id === screen.getPrimaryDisplay().id,
          scaleFactor: display.scaleFactor
        }))
      );
      
      // Create target object
      const target = createTarget(
        targetData.name,
        coordinates,
        {
          clickType: targetData.clickType || 'left',
          clickCount: targetData.clickCount || 1,
          id: targetData.id  // Will be auto-generated if null
        }
      );
      
      // Add to targets array
      this._targets.push(target);
      
      // Save to storage
      await this.saveTargets();
      
      logger.info('Target created successfully', { id: target.id, name: target.name });
      return target;
    } catch (error) {
      logger.error('Failed to create target', error);
      throw error;
    }
  },
  
  /**
   * Retrieves a specific target by ID
   * 
   * @param {string} id - ID of the target to get
   * @returns {Promise<Object>} - The requested target
   */
  async getTarget(id) {
    try {
      logger.debug(`Getting target with ID: ${id}`);
      
      const target = this._targets.find(t => t.id === id);
      
      if (!target) {
        logger.warn(`Target not found with ID: ${id}`);
        return null;
      }
      
      return target;
    } catch (error) {
      logger.error(`Failed to get target with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Retrieves all targets
   * 
   * @returns {Promise<Array>} - Array of all targets
   */
  async getAllTargets() {
    try {
      logger.debug('Getting all targets');
      return [...this._targets];
    } catch (error) {
      logger.error('Failed to get all targets', error);
      throw error;
    }
  },
  
  /**
   * Updates an existing target
   * 
   * @param {string} id - ID of the target to update
   * @param {Object} targetData - Updated target data
   * @returns {Promise<Object>} - The updated target
   */
  async updateTarget(id, targetData) {
    try {
      logger.info(`Updating target with ID: ${id}`, targetData);
      
      const targetIndex = this._targets.findIndex(t => t.id === id);
      
      if (targetIndex === -1) {
        throw new Error(`Target not found with ID: ${id}`);
      }
      
      const existingTarget = this._targets[targetIndex];
      
      // Prepare updated target
      let updatedTarget = { ...existingTarget };
      
      // Update name if provided
      if (targetData.name) {
        updatedTarget.name = targetData.name;
      }
      
      // Update coordinates if x and y are provided
      if (targetData.x !== undefined && targetData.y !== undefined) {
        // Get all screens
        const displays = screen.getAllDisplays();
        
        // Convert global coordinates to screen-relative
        const coordinates = globalToScreenCoordinates(
          targetData.x, 
          targetData.y, 
          displays.map(display => ({
            id: display.id,
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height,
            isPrimary: display.id === screen.getPrimaryDisplay().id,
            scaleFactor: display.scaleFactor
          }))
        );
        
        updatedTarget.coordinates = coordinates;
      }
      
      // Update click properties if provided
      if (targetData.clickType) {
        updatedTarget.clickType = targetData.clickType;
      }
      
      if (targetData.clickCount !== undefined) {
        updatedTarget.clickCount = targetData.clickCount;
      }
      
      // Update timestamp
      updatedTarget.updatedAt = new Date().toISOString();
      
      // Replace in array
      this._targets[targetIndex] = updatedTarget;
      
      // Save to storage
      await this.saveTargets();
      
      logger.info('Target updated successfully', { id, name: updatedTarget.name });
      return updatedTarget;
    } catch (error) {
      logger.error(`Failed to update target with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Deletes a target
   * 
   * @param {string} id - ID of the target to delete
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async deleteTarget(id) {
    try {
      logger.info(`Deleting target with ID: ${id}`);
      
      const targetIndex = this._targets.findIndex(t => t.id === id);
      
      if (targetIndex === -1) {
        logger.warn(`Target not found with ID: ${id}`);
        return false;
      }
      
      // Remove from array
      this._targets.splice(targetIndex, 1);
      
      // Save to storage
      await this.saveTargets();
      
      logger.info('Target deleted successfully', { id });
      return true;
    } catch (error) {
      logger.error(`Failed to delete target with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Clears all targets
   * 
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async clearAllTargets() {
    try {
      logger.info('Clearing all targets');
      
      // Clear targets array
      this._targets = [];
      
      // Save to storage
      await this.saveTargets();
      
      logger.info('All targets cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear all targets', error);
      throw error;
    }
  },
  
  /**
   * Tests a target by simulating a click
   * 
   * @param {string} id - ID of the target to test
   * @returns {Promise<boolean>} - Whether the test was successful
   */
  async testTarget(id) {
    try {
      logger.info(`Testing target with ID: ${id}`);
      
      if (!this._clickSimulator) {
        throw new Error('Click simulator not initialized');
      }
      
      const target = await this.getTarget(id);
      
      if (!target) {
        throw new Error(`Target not found with ID: ${id}`);
      }
      
      // Get all screens
      const displays = screen.getAllDisplays();
      
      // Convert screen-relative coordinates to global
      const globalCoords = screenToGlobalCoordinates(
        target.coordinates,
        displays.map(display => ({
          id: display.id,
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
          isPrimary: display.id === screen.getPrimaryDisplay().id,
          scaleFactor: display.scaleFactor
        }))
      );
      
      // Simulate the click
      await this._clickSimulator.simulateClick(
        globalCoords.x,
        globalCoords.y,
        {
          clickType: target.clickType,
          clickCount: target.clickCount
        }
      );
      
      logger.info('Target tested successfully', { id, name: target.name });
      return true;
    } catch (error) {
      logger.error(`Failed to test target with ID: ${id}`, error);
      throw error;
    }
  },
  
  /**
   * Validates a target object
   * 
   * @private
   * @param {Object} target - Target to validate
   * @returns {Object} - Validation result
   */
  _validateTarget(target) {
    const schema = {
      id: isString,
      name: isString,
      coordinates: isObject,
      clickType: value => ['left', 'right', 'double'].includes(value),
      clickCount: value => Number.isInteger(value) && value > 0,
      createdAt: isString,
      updatedAt: isString
    };
    
    return validateObject(target, schema);
  }
};

module.exports = TargetManager;