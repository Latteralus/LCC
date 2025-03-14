/**
 * main.js
 * Entry point for the Electron application
 */

const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const AppMain = require('./src/main/app-main');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global references to prevent garbage collection
let tray = null;

/**
 * Creates the system tray icon and menu
 */
function createTray(mainWindow) {
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
        app.isQuitting = true;
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
 * Main application entry point
 */
async function startApp() {
  // Wait for app to be ready
  if (!app.isReady()) {
    await new Promise(resolve => app.on('ready', resolve));
  }
  
  // Create main window
  const mainWindow = AppMain.createMainWindow();
  
  // Create tray icon
  createTray(mainWindow);
  
  // Initialize application components
  await AppMain.initialize();
}

// Set app name
app.name = 'Macro Automation Tool';

// Start the application
startApp().catch(error => {
  console.error('Failed to start application:', error);
  app.quit();
});