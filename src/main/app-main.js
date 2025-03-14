/**
 * app-main.js
 * Main application initialization and lifecycle management
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { createLogger } = require('../../utils/logger');
const ConfigManager = require('./config-manager');
const IpcMainHandler = require('./ipc-main-handler');
const TargetManager = require('./target-manager');
const ClickSimulator = require('./click-simulator');
const KeyboardHandler = require('./keyboard-handler');

// Initialize logger
const logger = createLogger('AppMain');

/**
 * App Main
 * Manages the application lifecycle and component initialization
 */
const AppMain = {
  /**
   * Main application window
   * @private
   */
  _mainWindow: null,
  
  /**
   * Flag indicating if app is quitting
   * @private
   */
  _isQuitting: false,
  
  /**
   * Initializes the application
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    logger.info('Initializing application');
    
    try {
      // Initialize logger system
      await this._initLogger();
      
      // Initialize configuration manager
      await this._initConfigManager();
      
      // Initialize click simulator
      await this._initClickSimulator();
      
      // Initialize target manager
      await this._initTargetManager();
      
      // Initialize keyboard handler
      await this._initKeyboardHandler();
      
      // Initialize IPC handler
      await this._initIpcHandler();
      
      // Set up app event listeners
      this._setupAppEvents();
      
      logger.info('Application initialization complete');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      
      // Display error and exit on critical failure
      if (this._mainWindow) {
        this._mainWindow.webContents.send('app:initialization-error', {
          message: 'Failed to initialize application',
          error: error.message
        });
      } else {
        app.quit();
      }
    }
  },
  
  /**
   * Creates the main application window
   * 
   * @returns {BrowserWindow} - The created window
   */
  createMainWindow() {
    logger.info('Creating main application window');
    
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // Create the browser window
    this._mainWindow = new BrowserWindow({
      width: Math.min(1200, width * 0.8),
      height: Math.min(800, height * 0.8),
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '../../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
      },
      icon: path.join(__dirname, '../../assets/icons/app-icon.png'),
      show: false, // Don't show until ready-to-show
    });
    
    // Load the index.html
    this._mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    
    // Only open DevTools in development mode
    if (process.argv.includes('--dev')) {
      this._mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    
    // Show window when ready
    this._mainWindow.once('ready-to-show', () => {
      this._mainWindow.show();
    });
    
    // Hide to tray when window is closed (unless quitting)
    this._mainWindow.on('close', (event) => {
      if (!this._isQuitting) {
        event.preventDefault();
        this._mainWindow.hide();
        return false;
      }
      return true;
    });
    
    logger.info('Main window created');
    return this._mainWindow;
  },
  
  /**
   * Sets up application event listeners
   * 
   * @private
   * @returns {void}
   */
  _setupAppEvents() {
    // Before quit
    app.on('before-quit', () => {
      logger.info('Application is quitting');
      this._isQuitting = true;
    });
    
    // Window all closed
    app.on('window-all-closed', () => {
      logger.info('All windows closed');
      
      // Quit app when all windows are closed (except on macOS)
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    
    // App activate (macOS)
    app.on('activate', () => {
      logger.info('Application activated');
      
      // Recreate window if needed
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      } else {
        // Show the main window if it exists but is hidden
        if (this._mainWindow) {
          this._mainWindow.show();
        }
      }
    });
    
    // Will quit
    app.on('will-quit', () => {
      logger.info('Application will quit');
      
      // Unregister global shortcuts
      KeyboardHandler.unregisterAll();
    });
  },
  
  /**
   * Initializes the logger system
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initLogger() {
    const { initialize } = require('../../utils/logger');
    
    // Initialize with default settings
    initialize();
    
    logger.info('Logger system initialized');
  },
  
  /**
   * Initializes the configuration manager
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initConfigManager() {
    logger.info('Initializing configuration manager');
    
    // Initialize the configuration manager
    await ConfigManager.initialize();
    
    logger.info('Configuration manager initialized');
  },
  
  /**
   * Initializes the click simulator
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initClickSimulator() {
    logger.info('Initializing click simulator');
    
    // Get configuration
    const config = ConfigManager.get();
    
    // Initialize click simulator with config
    ClickSimulator.initialize({
      defaultDelay: config.targetDelay,
      defaultClickType: config.clickSimulation.defaultClickType,
      defaultClickCount: config.clickSimulation.defaultClickCount
    });
    
    logger.info('Click simulator initialized');
  },
  
  /**
   * Initializes the target manager
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initTargetManager() {
    logger.info('Initializing target manager');
    
    // Initialize target manager with dependencies
    await TargetManager.initialize({
      clickSimulator: ClickSimulator
    });
    
    logger.info('Target manager initialized');
  },
  
  /**
   * Initializes the keyboard handler
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initKeyboardHandler() {
    logger.info('Initializing keyboard handler');
    
    // Get configuration
    const config = ConfigManager.get();
    
    // Initialize keyboard handler with config
    KeyboardHandler.initialize({
      triggerKey: config.triggerKey,
      allowModifiers: config.allowModifiers,
      debounceTime: 100
    });
    
    // Set up trigger handler (placeholder for now)
    KeyboardHandler.setTriggerHandler(() => {
      logger.info('Trigger key pressed');
      
      // This would typically start the macro selection UI
      if (this._mainWindow) {
        this._mainWindow.webContents.send('ui:trigger-key-pressed');
      }
    });
    
    logger.info('Keyboard handler initialized');
  },
  
  /**
   * Initializes the IPC handler
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _initIpcHandler() {
    logger.info('Initializing IPC handler');
    
    // Initialize IPC handler with module references
    IpcMainHandler.initialize({
      configManager: ConfigManager,
      targetManager: TargetManager,
      keyboardHandler: KeyboardHandler
    });
    
    logger.info('IPC handler initialized');
  }
};

module.exports = AppMain;