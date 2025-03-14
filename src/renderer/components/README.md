# UI Components for Macro Automation Tool

This directory contains specialized UI components that provide enhanced functionality for the Macro Automation Tool. These components are designed to be modular, reusable, and follow a consistent interface pattern.

## Component Overview

### 1. TargetingOverlay

**Purpose:** Provides an interactive overlay for selecting screen coordinates when creating targets.

**Key Features:**
- Full-screen overlay with crosshair indicator
- Real-time coordinate display
- Customizable crosshair appearance (color, size)
- Keyboard shortcuts for cancellation (Esc)

**Usage:**
```javascript
import TargetingOverlay from './components/targeting-overlay.js';

// Initialize
await TargetingOverlay.initialize({
  onTargetSelected: (coordinates) => {
    console.log(`Target selected at X: ${coordinates.x}, Y: ${coordinates.y}`);
  },
  onCancel: () => {
    console.log('Target selection canceled');
  }
});

// Show the overlay
TargetingOverlay.show();

// Hide the overlay
TargetingOverlay.hide();

// Customize appearance
TargetingOverlay.setCrosshairColor('#FF5733');
TargetingOverlay.setCrosshairSize(20);
```

### 2. MacroEditor

**Purpose:** Provides an interface for viewing, editing, and recording macro sequences.

**Key Features:**
- Visual representation of macro steps
- Step type identification with icons
- Ability to edit, delete, and reorder steps
- Integrated recording controls
- Automatic step visualization based on action type

**Usage:**
```javascript
import MacroEditor from './components/macro-editor.js';

// Initialize
await MacroEditor.initialize({
  onSave: (macro) => {
    console.log('Macro saved:', macro);
  },
  onCancel: () => {
    console.log('Editing canceled');
  },
  onRecordingStart: () => {
    console.log('Recording started');
  },
  onRecordingStop: (macro) => {
    console.log('Recording stopped, new macro:', macro);
  }
});

// Set a macro for editing
MacroEditor.setMacro(myMacro);

// Show the editor
MacroEditor.show();

// Hide the editor
MacroEditor.hide();

// Add a new action programmatically
MacroEditor.addAction({
  type: 'click',
  x: 100,
  y: 200,
  clickType: 'left'
});
```

### 3. SettingsPanel

**Purpose:** Enhances the settings form with additional functionality and dynamic sections.

**Key Features:**
- Automatic form population from configuration
- Change tracking and modified state
- Theme preview
- Support for adding custom settings sections dynamically
- Integrated validation

**Usage:**
```javascript
import SettingsPanel from './components/settings-panel.js';

// Initialize
await SettingsPanel.initialize({
  onSave: (config) => {
    console.log('Settings saved:', config);
  },
  onReset: (config) => {
    console.log('Settings reset to defaults:', config);
  },
  onThemeChange: (theme) => {
    console.log('Theme changed to:', theme);
  }
});

// Add a custom section
SettingsPanel.addCustomSection('Advanced Options', [
  {
    id: 'custom-option',
    name: 'customOption',
    type: 'checkbox',
    label: 'Enable advanced features',
    checked: false,
    description: 'This enables experimental features'
  }
]);

// Get current state
const state = SettingsPanel.getState();
console.log('Is settings form modified?', state.isModified);
```

## Component Manager

The `component-manager.js` file serves as the initialization and integration point for all UI components. It handles:

1. Component initialization with proper callbacks
2. Integration with existing UI modules
3. Configuration application to components
4. Coordination between components

## Design Patterns

These components follow several important design patterns:

1. **Module Pattern**: Each component is a self-contained module with private state and methods
2. **Event-Based Communication**: Components communicate through callbacks and events
3. **Configuration-Driven**: Component appearance and behavior can be controlled through configuration
4. **Progressive Enhancement**: Components enhance existing functionality without replacing it
5. **Consistent Interface**: All components follow a similar initialization and usage pattern

## CSS Structure

Component-specific CSS is located in `styles/component-interfaces.css` and follows these principles:

1. Component-specific class namespaces (e.g., `targeting-overlay__`, `macro-editor__`)
2. Responsive design considerations
3. Theme variable usage for consistent appearance
4. State-based styling (using modifier classes like `.hidden`)

## Integration with Existing Code

These components integrate with the existing codebase by:

1. Enhancing functionality of `TargetUI` and `MacroUI` modules
2. Using the same configuration management through `ConfigIpc`
3. Sharing event handlers and state with existing UI
4. Following the same design language and patterns

## Adding New Components

When creating new components, follow these guidelines:

1. Use the same module pattern structure
2. Implement `initialize()`, `show()`, and `hide()` methods
3. Use callbacks for communication with other modules
4. Keep component-specific state private
5. Add CSS to `component-interfaces.css` using consistent naming
6. Register the component in `component-manager.js`