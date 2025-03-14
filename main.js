const { app, BrowserWindow, Tray, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global references to prevent garbage collection
let mainWindow = null;
let tray = null;

// Variable to determine if app is quitting
// This prevents window from closing when clicking X (it hides to tray instead)
let isQuitting = false;

// Set environment mode
const isDev = process.argv.includes('--dev');

/**
 * Creates the main application window
 */
function createMainWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: Math.min(1200, width * 0.8),
    height: Math.min(800, height * 0.8),
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'assets', 'icons', 'app-icon.png'),
    show: false, // Don't show until ready-to-show
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Only open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Hide to tray when window is closed (unless quitting)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Create the tray icon and context menu
  createTray();

  // Set up main process IPC handlers
  setupIpcHandlers();

  // Ensure config directory exists
  ensureConfigDirectoryExists();
}

/**
 * Creates the system tray icon and menu
 */
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'tray-icon.png');
  
  // Create the tray icon
  tray = new Tray(iconPath);
  tray.setToolTip('Macro Automation Tool');
  
  // Create the context menu
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => mainWindow.show() 
    },
    { 
      label: 'Toggle Targeting Mode',
      click: () => mainWindow.webContents.send('toggle-targeting-mode')
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Show app on click (macOS)
  tray.on('click', () => {
    mainWindow.show();
  });
}

/**
 * Sets up IPC handlers for main process
 */
function setupIpcHandlers() {
  // Set up placeholder for IPC handlers
  // Will be implemented in ipc-main-handler.js
}

/**
 * Ensures the config directory exists
 */
function ensureConfigDirectoryExists() {
  const configDir = path.join(app.getPath('userData'), 'config');
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Create default config file if it doesn't exist
  const defaultConfigPath = path.join(configDir, 'default-config.json');
  if (!fs.existsSync(defaultConfigPath)) {
    const defaultConfig = {
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
    
    fs.writeFileSync(
      defaultConfigPath, 
      JSON.stringify(defaultConfig, null, 2),
      'utf-8'
    );
  }
}

// App lifecycle events
app.on('ready', createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});