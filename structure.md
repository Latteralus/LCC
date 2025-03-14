# Project Structure: Macro Automation Tool

## Directory Structure

```
macro-automation-tool/                # Root directory
├── package.json                      # Project metadata and dependencies ✓
├── .gitignore                        # Git ignore file ✓
├── .eslintrc.js                      # ESLint configuration ✓
├── .eslintignore                     # ESLint ignore file ✓
├── .prettierrc.js                    # Prettier configuration ✓
├── README.md                         # Project documentation ✓
├── main.js                           # Main Electron process entry point ✓
├── preload.js                        # Preload script for secure context bridging ✓
├── config/                           # Configuration-related files
│   ├── default-config.json           # Default configuration settings (auto-generated)
│   └── user-config.json              # User-specific saved settings (auto-generated)
├── src/                              # Source code
│   ├── main/                         # Main process modules
│   │   ├── app-main.js               # Application initialization and lifecycle
│   │   ├── ipc-main-handler.js       # IPC communication handlers (main process)
│   │   ├── macro-recorder.js         # Macro recording functionality
│   │   ├── macro-player.js           # Macro playback functionality
│   │   ├── click-simulator.js        # Mouse click simulation
│   │   ├── keyboard-handler.js       # Keyboard event handling
│   │   ├── target-manager.js         # Target coordinates management
│   │   ├── config-manager.js         # Configuration handling
│   │   └── error-handler.js          # Advanced error handling and recovery
│   └── renderer/                     # Renderer process (UI) files
│       ├── index.html                # Main application window ✓
│       ├── styles/                   # CSS styles
│       │   ├── main.css              # Main application styles ✓
│       │   ├── themes.css            # Theme definitions (light/dark modes) ✓
│       │   └── components.css        # Reusable component styles ✓
│       ├── js/                       # Renderer JavaScript files
│       │   ├── renderer-main.js      # Main renderer process script ✓
│       │   ├── ipc-renderer.js       # IPC communication (renderer process)
│       │   ├── ui-controller.js      # UI state and interactions
│       │   ├── target-ui.js          # Target selection UI handling
│       │   └── macro-ui.js           # Macro recording/playback UI
│       └── components/               # UI components
│           ├── targeting-overlay.js  # Targeting mode overlay
│           ├── macro-editor.js       # Macro sequence editor
│           └── settings-panel.js     # Settings and configuration UI
├── assets/                           # Application assets
│   └── icons/                        # Application icons
│       ├── app-icon.png              # Main application icon
│       ├── target-icon.png           # Target selection icon
│       └── tray-icon.png             # System tray icon
├── utils/                            # Utility functions
│   ├── event-utils.js                # Event handling utilities (including debounce) ✓
│   ├── logger.js                     # Logging functionality ✓
│   ├── platform-utils.js             # Platform-specific utilities ✓
│   └── validation.js                 # Input validation helpers ✓
├── types/                            # Type definitions
│   ├── config-types.js               # Configuration object types ✓
│   ├── macro-types.js                # Macro data structure types ✓
│   ├── target-types.js               # Target data structure types ✓
│   └── ipc-types.js                  # IPC message type definitions ✓
├── dist/                             # Build output (auto-generated)
├── docs/                             # Documentation
│   ├── installation.md               # Installation instructions
│   ├── usage.md                      # Usage guidelines
│   ├── configuration.md              # Configuration details
│   └── troubleshooting.md            # Troubleshooting information
└── tests/                            # Tests
    ├── unit/                         # Unit tests
    └── integration/                  # Integration tests
```

## File Naming Conventions

1. **Naming Pattern**: All files use kebab-case (lowercase with hyphens)
   - Example: `target-manager.js`, `event-utils.js`

2. **File Role Indicators**:
   - **Main Process Files**: Suffix with `-main` when there's a renderer counterpart
     - Example: `app-main.js`, `ipc-main-handler.js`
   - **Renderer Process Files**: Suffix with `-renderer` or `-ui` for UI-specific modules
     - Example: `ipc-renderer.js`, `target-ui.js`
   - **Component Files**: Name after the specific UI component they implement
     - Example: `targeting-overlay.js`, `settings-panel.js`
   - **Utility Files**: Group by functionality with `-utils` suffix
     - Example: `event-utils.js`, `platform-utils.js`
   - **Type Definition Files**: Suffix with `-types`
     - Example: `config-types.js`, `macro-types.js`

3. **CSS Naming**:
   - **BEM Methodology**: Block__Element--Modifier
   - Class names follow the same kebab-case pattern
   - Example: `.target-overlay`, `.target-overlay__crosshair`, `.button--primary`

4. **Import/Export Naming**:
   - Export consistent namespace objects to avoid name collisions
   - Example: `export const TargetManager = { ... }` instead of multiple individual exports

## Module Interfaces and Compatibility

Each module should be designed with clear, stable interfaces to ensure forward and backward compatibility:

1. **Type Definitions**:
   - Define shared data structures in `/types/*.js` files
   - All modules that exchange data should import these types
   - Example: Macro and Target data structures

2. **Module Interface Pattern**:
   ```javascript
   // Example module pattern for target-manager.js
   const TargetManager = {
     // Public API - stable interface that won't change
     createTarget(x, y, name) { /* implementation */ },
     getTarget(id) { /* implementation */ },
     getAllTargets() { /* implementation */ },
     updateTarget(id, data) { /* implementation */ },
     deleteTarget(id) { /* implementation */ },
     
     // Private methods (prefixed with _)
     _validateTarget(target) { /* implementation */ }
   };
   
   export default TargetManager;
   ```

3. **IPC Communication**:
   - Centralize all IPC channel names in constants
   - Use versioned channel names for breaking changes
   - Example: `const IPC_CHANNELS = { SET_TARGET: 'target:set:v1' }`

4. **Configuration**:
   - Use schema versioning for configuration files
   - Include migration logic for upgrading older configs
   - Example: `{ schemaVersion: '1.0', ... }`

This structure and these conventions ensure that modules can be developed independently while maintaining compatibility, reducing the need for rewrites when expanding functionality.