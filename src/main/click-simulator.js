/**
 * click-simulator.js
 * Handles simulation of mouse clicks using robotjs
 */

const robot = require('robotjs');
const { isMac, isWindows, isLinux } = require('../../utils/platform-utils');
const { createLogger } = require('../../utils/logger');

// Initialize logger
const logger = createLogger('ClickSimulator');

/**
 * Click Simulator
 * Provides abstraction for mouse click simulation across platforms
 */
const ClickSimulator = {
  /**
   * Configuration options
   * @private
   */
  _config: {
    // Default delay between clicks (ms)
    defaultDelay: 250,
    // Default click type
    defaultClickType: 'left',
    // Default click count
    defaultClickCount: 1
  },
  
  /**
   * Initializes the click simulator
   * 
   * @param {Object} options - Initialization options
   * @returns {void}
   */
  initialize(options = {}) {
    logger.info('Initializing click simulator');
    
    // Set configuration from options
    if (options.defaultDelay !== undefined) {
      this._config.defaultDelay = options.defaultDelay;
    }
    
    if (options.defaultClickType) {
      this._config.defaultClickType = options.defaultClickType;
    }
    
    if (options.defaultClickCount !== undefined) {
      this._config.defaultClickCount = options.defaultClickCount;
    }
    
    // Check if robot is available
    try {
      // Get current mouse position as a quick test
      const pos = robot.getMousePos();
      logger.debug('Robot.js initialized successfully', pos);
    } catch (error) {
      logger.error('Failed to initialize robot.js', error);
      throw new Error('Failed to initialize click simulation: ' + error.message);
    }
    
    logger.info('Click simulator initialized');
  },
  
  /**
   * Get current mouse position
   * 
   * @returns {Object} - The current mouse position {x, y}
   */
  getMousePosition() {
    try {
      return robot.getMousePos();
    } catch (error) {
      logger.error('Failed to get mouse position', error);
      throw error;
    }
  },
  
  /**
   * Move the mouse to specific coordinates
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {boolean} [smooth=true] - Whether to use smooth movement
   * @returns {Promise<void>}
   */
  async moveMouse(x, y, smooth = true) {
    try {
      logger.debug(`Moving mouse to (${x}, ${y})`, { smooth });
      
      if (smooth) {
        // Get current position
        const { x: startX, y: startY } = this.getMousePosition();
        
        // Calculate distance
        const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        
        // If distance is small, just move directly
        if (distance < 20) {
          robot.moveMouse(x, y);
          return;
        }
        
        // For longer distances, use smooth movement
        const steps = Math.min(Math.ceil(distance / 10), 50);
        
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const curX = Math.round(startX + (x - startX) * progress);
          const curY = Math.round(startY + (y - startY) * progress);
          
          robot.moveMouse(curX, curY);
          await this._sleep(5);
        }
        
        // Ensure final position is exact
        robot.moveMouse(x, y);
      } else {
        // Direct movement
        robot.moveMouse(x, y);
      }
    } catch (error) {
      logger.error(`Failed to move mouse to (${x}, ${y})`, error);
      throw error;
    }
  },
  
  /**
   * Simulate a mouse click
   * 
   * @param {number} x - X coordinate to click
   * @param {number} y - Y coordinate to click
   * @param {Object} options - Click options
   * @param {('left'|'right'|'double')} [options.clickType] - Type of click
   * @param {number} [options.clickCount] - Number of clicks
   * @param {boolean} [options.restorePosition] - Whether to restore cursor position
   * @returns {Promise<void>}
   */
  async simulateClick(x, y, options = {}) {
    try {
      const clickType = options.clickType || this._config.defaultClickType;
      const clickCount = options.clickCount || this._config.defaultClickCount;
      const restorePosition = options.restorePosition || false;
      
      logger.debug(`Simulating ${clickType} click at (${x}, ${y})`, { 
        clickType, 
        clickCount, 
        restorePosition 
      });
      
      // Store original position if needed
      let originalPosition;
      if (restorePosition) {
        originalPosition = this.getMousePosition();
      }
      
      // Move to the target location
      await this.moveMouse(x, y);
      
      // Small delay to ensure mouse movement is complete
      await this._sleep(50);
      
      // Perform the click(s)
      if (clickType === 'double') {
        // Double click
        this._performClick('left');
        await this._sleep(30);
        this._performClick('left');
      } else {
        // Single or multiple clicks
        for (let i = 0; i < clickCount; i++) {
          this._performClick(clickType);
          
          if (i < clickCount - 1) {
            await this._sleep(30);
          }
        }
      }
      
      // Restore original position if needed
      if (restorePosition && originalPosition) {
        await this._sleep(50);
        await this.moveMouse(originalPosition.x, originalPosition.y);
      }
    } catch (error) {
      logger.error(`Failed to simulate click at (${x}, ${y})`, error);
      throw error;
    }
  },
  
  /**
   * Perform a mouse click at the current position
   * 
   * @private
   * @param {('left'|'right'|'middle')} button - Mouse button to click
   */
  _performClick(button) {
    const buttonMap = {
      left: 'left',
      right: 'right',
      middle: 'middle'
    };
    
    const robotButton = buttonMap[button] || 'left';
    
    try {
      robot.mouseClick(robotButton);
    } catch (error) {
      logger.error(`Failed to perform ${button} click`, error);
      throw error;
    }
  },
  
  /**
   * Simulates a mouse drag operation
   * 
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Object} options - Drag options
   * @param {('left'|'right')} [options.button='left'] - Mouse button to use
   * @param {boolean} [options.smooth=true] - Whether to use smooth movement
   * @returns {Promise<void>}
   */
  async simulateDrag(startX, startY, endX, endY, options = {}) {
    try {
      const button = options.button || 'left';
      const smooth = options.smooth !== false;
      
      logger.debug(`Simulating drag from (${startX}, ${startY}) to (${endX}, ${endY})`, {
        button,
        smooth
      });
      
      // Move to start position
      await this.moveMouse(startX, startY);
      
      // Small delay
      await this._sleep(50);
      
      // Press mouse button down
      robot.mouseToggle('down', button);
      
      // Move to end position
      if (smooth) {
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const steps = Math.min(Math.ceil(distance / 10), 50);
        
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const curX = Math.round(startX + (endX - startX) * progress);
          const curY = Math.round(startY + (endY - startY) * progress);
          
          robot.moveMouse(curX, curY);
          await this._sleep(5);
        }
        
        // Ensure final position is exact
        robot.moveMouse(endX, endY);
      } else {
        robot.moveMouse(endX, endY);
      }
      
      // Small delay
      await this._sleep(50);
      
      // Release mouse button
      robot.mouseToggle('up', button);
    } catch (error) {
      // Ensure mouse button is released on error
      try {
        robot.mouseToggle('up', 'left');
        robot.mouseToggle('up', 'right');
      } catch (e) {
        // Ignore cleanup errors
      }
      
      logger.error(`Failed to simulate drag`, error);
      throw error;
    }
  },
  
  /**
   * Simulates a mouse scroll
   * 
   * @param {number} x - X coordinate to place mouse
   * @param {number} y - Y coordinate to place mouse
   * @param {number} amount - Amount to scroll (positive is up, negative is down)
   * @returns {Promise<void>}
   */
  async simulateScroll(x, y, amount) {
    try {
      logger.debug(`Simulating scroll at (${x}, ${y}) with amount ${amount}`);
      
      // Move to position
      await this.moveMouse(x, y);
      
      // Small delay
      await this._sleep(50);
      
      // Perform scroll (RobotJS uses positive for down, negative for up)
      robot.scrollMouse(0, -amount);
    } catch (error) {
      logger.error(`Failed to simulate scroll`, error);
      throw error;
    }
  },
  
  /**
   * Sleep for a specified duration
   * 
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = ClickSimulator;