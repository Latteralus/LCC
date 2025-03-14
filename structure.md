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
│   ├── default-config.json           # Default configuration settings (auto-generated) ✓
│   └── user-config.json              # User-specific saved settings (auto-generated)
├── src/                              # Source code
│   ├── main/                         # Main process modules
│   │   ├── app-main.js               # Application initialization and lifecycle ✓
│   │   ├── config-manager.js         # Configuration handling ✓
│   │   ├── ipc-main-handler.js       # IPC communication handlers (main process) ✓
│   │   ├── target-manager.js         # Target coordinates management ✓
│   │   ├── click-simulator.js        # Mouse click simulation ✓
│   │   ├── keyboard-handler.js       # Keyboard event handling ✓
│   │   ├── macro-recorder.js         # Macro recording functionality
│   │   ├── macro-player.js           # Macro playback functionality
│   │   └── error-handler.js          # Advanced error handling and recovery
│   └── renderer/                     # Renderer process (UI) files
│       ├── index.html                # Main application window ✓
│       ├── styles/                   # CSS styles
│       │   ├── main.css              # Main application styles ✓
│       │   ├── themes.css            # Theme definitions (light/dark modes) ✓
│       │   ├── components.css        # Reusable component styles ✓
│       │   └── component-interfaces.css # Component-specific styles ✓
│       ├── js/                       # Renderer JavaScript files
│       │   ├── renderer-main.js      # Main renderer process script ✓
│       │   ├── ipc-renderer.js       # IPC communication (renderer process) ✓
│       │   ├── ui-controller.js      # UI state and interactions ✓
│       │   ├── target-ui.js          # Target selection UI handling ✓
│       │   ├── macro-ui.js           # Macro recording/playback UI ✓
│       │   └── component-manager.js  # Component initialization and integration ✓
│       └── components/               # UI components
│           ├── README.md             # Component documentation ✓
│           ├── targeting-overlay.js  # Targeting mode overlay ✓
│           ├── macro-editor.js       # Macro sequence editor ✓
│           └── settings-panel.js     # Settings and configuration UI ✓
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

## Implementation Status

### Phase 1: Foundation Setup ✓
- ✓ Project initialization
- ✓ Core type definitions
- ✓ Basic Electron structure
- ✓ Utility modules

### Phase 2: Core Functionality ✓
- ✓ Configuration management (Implemented in `config-manager.js`)
- ✓ IPC communication layer (Implemented in `ipc-main-handler.js` and `ipc-renderer.js`)
- ✓ Target management (Implemented in `target-manager.js` and `target-ui.js`)
- ✓ Keyboard event handling (Implemented in `keyboard-handler.js`)
- ✓ Click simulation (Implemented in `click-simulator.js`)

### Phase 3: User Interface ✓
- ✓ Basic UI framework (CSS structure and theming)
- ✓ UI controllers (Implemented in `ui-controller.js`, `target-ui.js`, and `macro-ui.js`)
- ✓ UI Components (targeting overlay, macro editor, settings panel)

### Phase 4: Core Features (In Progress)
- ◯ Macro recording (`macro-recorder.js`)
- ◯ Macro playback (`macro-player.js`)

### Remaining Phases (Not Started)
- ◯ Advanced error handling
- ◯ Platform-specific implementation
- ◯ Application packaging
- ◯ Documentation and testing

## File Naming Conventions

1. **Naming Pattern**: All files use kebab-case (lowercase with hyphens)
   - Example: `target-manager.js`, `event-utils.js`

2. **File Role Indicators**:
   - **Main Process Files**: Suffix with `-main` when there's a renderer counterpart
     - Example: `app-main.js`, `ipc-main-handler.js`
   - **Renderer Process Files**: Suffix with `-renderer` or `-ui` for UI-specific modules
     - Example: `ipc-renderer.js`, `target-ui.js`
   - **Component Files**: Name after the specific UI component they implement
     - Example: `targeting-overlay.js`, `macro-editor.js`
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

Each module is designed with clear, stable interfaces to ensure forward and backward compatibility:

1. **Type Definitions**:
   - Define shared data structures in `/types/*.js` files
   - All modules that exchange data import these types
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

5. **UI Components**:
   - Consistent interface with `initialize()`, `show()`, and `hide()` methods
   - Event-based communication through callbacks
   - Use of private state (with `_` prefix)
   - Example: `TargetingOverlay.initialize({onTargetSelected: callback})`

## Component Architecture

The UI component system follows these design principles:

1. **Component Manager**: Central initialization point in `component-manager.js`
   - Handles component creation and integration
   - Sets up event handlers and callbacks
   - Applies configuration settings

2. **Component Structure**:
   - Private state and methods (with `_` prefix)
   - Public API methods for interaction
   - Event-based communication through callbacks
   - Clear initialization patterns

3. **Component Integration**:
   - Components enhance existing UI without replacing it
   - Shared styling through CSS variables
   - Consistent DOM structure and manipulation patterns
   - Progressive enhancement of functionality

4. **Component Documentation**:
   - Clear usage examples in `components/README.md`
   - Documented callbacks and integration points
   - Consistent design patterns across components

## Next Steps

The project has completed Phases 1, 2, and 3, and is now ready to proceed to Phase 4. The following steps should be prioritized next:

1. Implement Macro Recording:
   - Develop `macro-recorder.js` for capturing user actions
   - Integrate with the new macro editor component
   - Implement action recording for clicks, keystrokes, and delays

2. Implement Macro Playback:
   - Develop `macro-player.js` for replaying recorded macros
   - Create a sequencing engine for action playback
   - Implement error handling during playback

3. Enhance Error Handling:
   - Implement `error-handler.js` for comprehensive error management
   - Add error recovery mechanisms
   - Create user-friendly error notifications

4. Complete Platform-Specific Implementation:
   - Enhance existing modules with better platform-specific handling
   - Test on multiple platforms to ensure compatibility

This structure and these conventions ensure that modules can be developed independently while maintaining compatibility, reducing the need for rewrites when expanding functionality.