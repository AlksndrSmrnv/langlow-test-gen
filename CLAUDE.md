# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Web application for generating integration tests with Russian language interface. Built with modular namespace-based architecture for maintainability and scalability. Sends XML requests to Langflow API, displays parsed test results as interactive cards, and provides AI-powered test editing via chat interface.

## Development

**No build system** - open `index.html` directly in a browser.

**External dependencies** (loaded via CDN):
- **marked.js** - Markdown parsing for test content rendering
- **Google Fonts** - Inter font family

## Architecture

### File Structure

- **index.html** - HTML structure, settings modal, history modal, agent chat UI
- **styles.css** - CSS with custom properties, responsive design, animations
- **js/** - Modular JavaScript architecture (16 files)
  - **00-namespace.js** - Global `TestGen` namespace definition
  - **01-config.js** - Constants, icons, loading statuses, DOM IDs
  - **02-state.js** - Global state management (tests, checks, DOM cache, agent state)
  - **03-utils.js** - Utility functions (sessionId, escapeHtml, plural, copy, md)
  - **04-storage.js** - LocalStorage operations (saveForm, loadForm, getSettings)
  - **05-history.js** - History management (save, load, render, delete)
  - **06-modal.js** - Modal controls (settings, history, token visibility)
  - **07-xml.js** - XML building and parsing (buildXML, parseXML, buildChecksXML, buildJiraXML)
  - **08-cards.js** - Card creation and updates (createCard, updateCard)
  - **09-features.js** - Feature input management (add, remove, update)
  - **10-selection.js** - Selection logic (toggleAll, selectAll, updateSelection)
  - **11-agent.js** - Agent chat functionality (sendMsg, addMessage, reset)
  - **12-results.js** - Results display (showResults, showPlainText, startLoading, stopLoading)
  - **13-jira.js** - JIRA integration (sendJira, updateJiraConnection)
  - **14-generation.js** - Test generation orchestration (generate, generateFromChecks)
  - **15-init.js** - Application initialization and event delegation

### Key Features

#### 1. Test Generation
- User provides feature pages (Confluence URLs) and checklist URL
- Builds XML request and sends to Langflow generation endpoint
- Parses XML response to extract test cases and additional checks
- Displays as interactive, collapsible cards

#### 2. Agent Chat (AI Test Editing)
- Select one or multiple tests via checkboxes
- Chat interface to request modifications
- Sends test content + modification request to agent endpoint
- Updates test cards in real-time with AI response

#### 3. JIRA Export
- Select multiple tests via checkboxes
- Parallel API requests to JIRA endpoint
- Per-test success/failure reporting
- Includes project key, folder path, and JIRA credentials

#### 4. Additional Checks
- Separate section for `<additional_checks>` from XML response
- Warning-styled cards in grid layout
- For context/reminders not fitting main test structure
- **Generate from Checks** - Select specific additional checks and generate new tests based on them
- Appends newly generated tests to existing test list

#### 5. History Management
- Persistent storage of all test generations in localStorage
- History modal showing past generations with timestamps
- Display test count and additional checks count per generation
- Load previous generations to restore all tests and checks
- **Agent Chat History** - Saves and restores agent chat messages per generation
- Each generation preserves its own chat conversation
- Switching between histories automatically restores the corresponding chat
- Delete individual history entries
- Automatically saves up to 50 most recent generations

#### 6. Settings Management
- **Export Settings** - Download all settings as JSON file
- **Import Settings** - Upload and restore settings from JSON file
- Token visibility toggles for secure password fields
- Dual JIRA instance support (Jira D and Jira S) with toggle switch

#### 7. Error Recovery
- **Retry Button** - Appears when generation fails
- Allows immediate retry without refreshing page
- Preserves all form data and settings

### Data Flow

**Generation Flow:**
```
Form inputs → buildXML() → XML payload → Langflow API →
→ JSON response → extractResponse() → parseXML() →
→ showResults() or showPlainText() → Display cards
```

**Agent Chat Flow:**
```
Select tests → User message → Prompt construction →
→ Agent endpoint → AI response → updateCard() →
→ Real-time card update
```

**JIRA Export Flow:**
```
Select tests → sendJira() → Promise.all(parallel requests) →
→ Per-test status → UI feedback
```

**Additional Checks Generation Flow:**
```
Select checks → buildChecksXML() → XML payload → Langflow API →
→ JSON response → parseXML() → showResults(append=true) →
→ New tests appended to existing list → saveToHistory()
```

**History Flow:**
```
Generate tests → saveToHistory() (with current agent chat) → localStorage →
→ Agent edits test → updateCurrentHistoryWithChat() → Update localStorage →
→ Generate new tests → saveToHistory(old tests with chat) → saveToHistory(new tests with empty chat) →
→ History modal → Load generation → showResults() → restoreAgentChat() → Restore UI
```

**Chat History Preservation:**
- Each generation is saved with its own agent chat messages and test data
- `state.currentHistoryId` tracks which history item is currently active
- **Deep cloning** - all test/check objects and chat messages are cloned using `map(obj => ({...obj}))` to prevent shared references
- When user modifies tests via agent, both chat AND updated test data are saved to the active history item (by ID)
- When generating new tests, old generation (with its chat and data) is saved first, then new generation (with empty chat) is saved
- When loading from history, `currentHistoryId` is updated to the loaded item's ID
- This ensures each generation preserves its own conversation context and test modifications, isolated from other history entries

## Key Functions by Module

### TG.xml (07-xml.js)
- `buildXML()` - Constructs XML request from form inputs
- `buildChecksXML()` - Constructs XML for generating tests from selected additional checks
- `buildJiraXML()` - Constructs XML for JIRA export with all test metadata
- `parseXML()` - Two-tier parsing: DOMParser + regex fallback for malformed XML
- `extractResponse()` - Extracts text from nested Langflow response structure

### TG.generation (14-generation.js)
- `generate()` - Main generation: deep-clones and saves current tests with chat, generates new tests, saves new tests with empty chat
- `generateFromChecks()` - Generates from selected checks: deep-clones and saves current tests with chat, generates new tests, appends and saves all

### TG.results (12-results.js)
- `showResults(data, append)` - Displays parsed tests and checks (supports append mode)
- `showPlainText()` - Fallback when XML parsing fails
- `startLoading()` - Shows animated loader with rotating status messages
- `stopLoading()` - Hides loader and clears status interval

### TG.cards (08-cards.js)
- `createCard()` - Dynamic card creation (test/check modes with checkboxes)
- `updateCard()` - Updates card content after agent edits

### TG.selection (10-selection.js)
- `toggleAll()` - Expands/collapses all test cards
- `selectAll()` - Selects/deselects all test checkboxes
- `updateSelection()` - Manages agent chat availability based on selection

### TG.agent (11-agent.js)
- `sendAgentMsg()` - Processes chat messages, updates tests, and saves chat to history
- `addMessage()` - Adds chat message bubble to UI
- `resetAgent()` - Clears chat state
- `restoreAgentChat()` - Restores chat messages from history

### TG.jira (13-jira.js)
- `sendJira()` - Parallel JIRA submission with status reporting
- `updateJiraConnection()` - Switches between Jira D and Jira S credentials
- `updateJiraToggleLabels()` - Updates active state of Jira toggle labels

### TG.storage (04-storage.js)
- `saveForm()` - Auto-saves all form data to localStorage (500ms debounce)
- `loadForm()` - Restores form data on page load
- `showAutosave()` - Visual save confirmation toast
- `getSettings()` - Extracts settings from DOM
- `buildBody()` - Constructs API request body (supports 3 formats)
- `headers()` - Builds API headers with optional auth

### TG.history (05-history.js)
- `saveToHistory()` - Saves generation with deep-cloned test/check/message data, sets `state.currentHistoryId`
- `updateCurrentHistoryWithChat()` - Updates active history item with deep-cloned chat AND test data (prevents shared references)
- `loadHistory()` - Retrieves history array from localStorage (max 50 items)
- `renderHistory()` - Displays history items in modal with load/delete actions
- `loadGenerationFromHistory()` - Restores a previous generation by ID, updates `state.currentHistoryId`, restores chat
- `deleteFromHistory()` - Removes a history item, clears `currentHistoryId` if deleting active item, re-renders list

### TG.modal (06-modal.js)
- `openSettingsModal()` / `closeSettingsModal()` - Settings modal controls
- `saveSettings()` - Validates and saves settings changes
- `exportSettings()` - Downloads settings as JSON file with timestamp
- `importSettings()` - Triggers file picker for settings import
- `handleImportFile()` - Processes and validates imported settings file
- `toggleTokenVisibility()` - Shows/hides password fields (token inputs)
- `openHistoryModal()` / `closeHistoryModal()` - History modal controls

### TG.features (09-features.js)
- `addFeature()` - Adds new feature URL input field
- `removeFeature()` - Removes feature URL input field
- `updateFeatureButtons()` - Shows/hides remove buttons based on count

### TG.utils (03-utils.js)
- `sessionId()` - Generates timestamped session IDs: `YYYYMMDD_HHMMSS_[random]`
- `md()` - Markdown rendering with marked.js
- `escapeHtml()` - HTML entity escaping
- `plural()` - Russian plural form helper
- `copy()` - Clipboard copy with visual feedback

### TG.init (15-init.js)
- `cacheDom()` - Caches all DOM elements from config.domIds
- `setupEventDelegation()` - Single event listener for all UI interactions
- `initialize()` - Application entry point, runs on DOMContentLoaded

## Configuration

### Settings Modal (localStorage persistence)

**Langflow Endpoints:**
- **Generation URL** - Main test generation endpoint
- **Agent Chat URL** - AI editing endpoint
- **JIRA URL** - Test submission endpoint
- **API Key** - Optional authentication (supports Bearer and x-api-key headers)
- **API Format** - Request body format (standard/inputs/message)

**JIRA Connection (Dual Instance Support):**
- **Jira D** - Primary Jira instance credentials (URL + Token)
- **Jira S** - Secondary Jira instance credentials (URL + Token)
- **Toggle Switch** - Switch between Jira D and Jira S for test export
- All tokens support show/hide visibility toggle

**JIRA Test Metadata:**
- **Project Key** - JIRA project identifier
- **Folder Name** - Zephyr test folder path
- **Configuration Element (АС/КЭ)** - Optional system configuration identifier
- **Test Type** - Optional test type classification (e.g., "Functional")

**Settings Import/Export:**
- Export all settings to JSON file for backup
- Import settings from JSON file for quick restoration
- Useful for sharing configurations across environments

All settings auto-save to `localStorage.testGeneratorFormData` with 500ms debounce.

## State Management

All state is managed through the `TestGen.state` namespace:

```javascript
TestGen.state = {
  dom: {},                    // Cached DOM elements (56 elements)
  testsData: [],              // Array of generated tests
  checksData: [],             // Array of additional checks
  saveTimeout: null,          // Debounce timer for auto-save
  statusInterval: null,       // Interval for rotating loading messages
  currentAbortController: null, // Request cancellation for active API calls
  agentState: {               // Agent chat state
    selectedIndex: null,
    messages: [],
    processing: false
  },
  settingsChanged: false,     // Tracks if settings were modified
  originalSettings: null,     // Stores original settings for comparison
  isGenerating: false,        // Prevents duplicate generation clicks
  isSendingJira: false,       // Prevents duplicate JIRA submission clicks
  currentHistoryId: null      // ID of currently active history item
}
```

**Storage Keys:**
- `testGeneratorFormData` - All form inputs and settings
- `testGeneratorHistory` - Array of past generations (max 50 items)

## API Request Format

### Request Body Variations

Based on `apiFormat` setting:

**Standard:**
```json
{
  "input_value": "<xml>...</xml>",
  "output_type": "chat",
  "input_type": "chat",
  "session_id": "20240101_120000_abc123"
}
```

**Inputs:**
```json
{
  "inputs": { "input_value": "<xml>...</xml>" },
  "output_type": "chat",
  "input_type": "chat",
  "session_id": "..."
}
```

**Message:**
```json
{
  "message": "<xml>...</xml>",
  "output_type": "chat",
  "input_type": "chat",
  "session_id": "..."
}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer <apiKey>  // if provided
x-api-key: <apiKey>            // if provided
```

## XML Parsing Strategy

`parseXML()` uses two-tier approach:

1. **DOMParser** (primary) - Standards-compliant XML parsing
2. **Regex fallback** - Handles malformed/incomplete XML

Extracts:
- `<test name="..." id="...">` → Test cards
- `<additional_checks>` → Warning cards or raw text
- `<check name="..." id="...">` inside additional_checks → Individual check cards
- Graceful degradation for partial responses

**XML Generation:**
- `buildXML()` - Standard test generation with features + checklist
- `buildChecksXML()` - Generates tests from selected checks
- `buildJiraXML()` - Creates JIRA export XML with test metadata and connection credentials

## UI Patterns

### Collapsible Behavior
- **Form sections** - Collapse during generation, expand on click
- **Test cards** - Start collapsed, toggle via header click (not checkbox)
- **Bulk operations** - "Expand All" / "Collapse All" button

### Selection Logic
- **Checkboxes** - For JIRA export selection (multiple)
- **Agent chat** - Requires EXACTLY ONE selection (shows warning otherwise)
- **Visual feedback** - Selected cards: green border + background
- **Additional checks** - Have their own checkboxes (`.check-card-checkbox`) for generation
- **Generate from Checks** button appears when additional checks are displayed

### Modal Patterns
- **Settings Modal** - Configuration for all endpoints and credentials
- **History Modal** - List of past generations with load/delete actions
- Both modals: click backdrop or close button to dismiss, ESC key support
- Body overflow hidden when modal is active

### Auto-save
- Triggers 500ms after any input change
- Toast notification (bottom-right) on save
- Persists to localStorage

## Error Handling

- **HTTP errors** - Displays status code with troubleshooting hints in error section
- **405 errors** - Specific guidance about endpoint/format issues
- **Content-type validation** - Warns if non-JSON response
- **JSON parse errors** - Graceful degradation with error details
- **Request abortion** - AbortController for canceling in-flight requests
- **Retry functionality** - Dedicated retry button appears on generation errors
- **Error section** - Shows error details with suggestions for resolution
- **AbortError handling** - Silently ignores user-canceled requests
- **Duplicate action protection** - `isGenerating` and `isSendingJira` flags prevent multiple simultaneous operations
- **Button state management** - Buttons disabled during operations to prevent double-clicks

## Modular Architecture Pattern

The application uses a **namespace-based modular architecture** to organize code:

### Structure
```
TestGen (window.TestGen)
├── config      // Constants and configuration
├── state       // Global state management
├── utils       // Utility functions
├── storage     // LocalStorage operations
├── history     // History management
├── modal       // Modal dialogs
├── xml         // XML parsing/building
├── cards       // Card creation/updates
├── features    // Feature input management
├── selection   // Selection logic
├── agent       // Agent chat
├── results     // Results display
├── jira        // JIRA integration
├── generation  // Test generation
└── init        // Initialization
```

### Module Communication
- Modules access shared state via `TG.state`
- Modules access configuration via `TG.config`
- Modules call functions across namespaces (e.g., `TG.results.showResults()`)
- No circular dependencies - clear dependency flow

### File Naming Convention
Files prefixed with numbers (00-15) to enforce load order:
- **00-02**: Core infrastructure (namespace, config, state)
- **03-10**: Utilities and UI components
- **11-14**: Feature-specific logic (agent, results, JIRA, generation)
- **15**: Initialization and event wiring

### IIFE Pattern
All modules use Immediately Invoked Function Expression (IIFE) pattern:
```javascript
(function(TG) {
    'use strict';
    TG.moduleName = {
        functionName: function() { ... }
    };
})(window.TestGen);
```

Benefits: scope isolation, 'use strict' enforcement, clear dependencies.

## Technical Implementation Details

### Event Delegation
Single event listener in `15-init.js` on document for all clicks/changes, dispatches to appropriate module handlers.

### DOM Caching
All frequently accessed elements cached in `TG.state.dom` object at initialization (56 elements).
Elements defined in `TG.config.domIds` array and cached during `TG.init.cacheDom()`.
Includes elements for settings, history, modals, forms, and result sections.

### Module Loading
Files load in sequence (00-15) via `<script>` tags in `index.html`:
1. **00-namespace.js** - Creates global `window.TestGen` object
2. **01-config.js** - Populates `TG.config` with constants
3. **02-state.js** - Initializes `TG.state` with default values
4. **03-15** - Each module adds functions to respective namespace
5. **15-init.js** - Runs initialization on DOM load

### CSS Architecture
- CSS Custom Properties for theming (~32 variables)
- Responsive breakpoints: 900px, 768px, 480px
- Animations: slideUp, spin, fadeIn, slideIn
- Agent chat uses gradient backgrounds and bubble UI

### Markdown Rendering
- marked.js with `breaks: true` option
- Fallback to escaped HTML if marked.js unavailable
- Custom CSS for rendered markdown (code, lists, blockquotes)

### Constants

```javascript
STORAGE_KEY = 'testGeneratorFormData'
HISTORY_STORAGE_KEY = 'testGeneratorHistory'
AUTOSAVE_DELAY = 500        // ms
FEEDBACK_DELAY = 2000       // ms
LOADER_INTERVAL = 8000      // ms
LOADING_STATUSES = [...]    // 8 status messages with substatus
ICONS = {                   // UI icon text constants
  copy: '📋 Копировать',
  copied: '✓ Скопировано',
  error: '✕ Ошибка',
  expand: '📂 Развернуть все',
  collapse: '📁 Свернуть все'
}
```

### Browser Compatibility

Requires modern browser with:
- ES6+ (arrow functions, async/await, template literals)
- Fetch API
- DOMParser
- LocalStorage
- CSS Custom Properties
- File API (for settings import/export)

## Development Guidelines

**Code Organization:**
- **Modular Architecture** - All JavaScript organized by function in `js/` directory
- **Namespace Pattern** - All code wrapped in `TestGen` namespace to avoid global pollution
- **Load Order** - Files load sequentially (00-15) to ensure proper dependency resolution
- **No Build Step** - Open `index.html` directly in browser, no compilation required
- **CSS** - Uses custom properties for consistent theming
- **Event Delegation** - Single event listener in `15-init.js` for all dynamic interactions

**Adding New Features:**
1. Identify appropriate module file (or create new numbered file)
2. Add function to relevant `TestGen` namespace (e.g., `TestGen.utils.newFunction`)
3. Update localStorage schema in `04-storage.js` if storing new data
4. Add DOM element to `01-config.js` domIds array if frequently accessed
5. Update `15-init.js` event delegation if new UI interactions needed
6. Update CLAUDE.md with feature documentation

**Modular Architecture Benefits:**
- **Separation of Concerns** - Each file has single, clear responsibility
- **Maintainability** - Easy to locate and modify specific functionality
- **Readability** - Smaller files with focused logic
- **Testability** - Functions organized by domain for easier testing
- **Namespace Safety** - No global variable conflicts

**Testing Checklist:**
- Test with real Langflow endpoints
- Verify localStorage persistence
- Check mobile responsive behavior
- Validate error handling paths
- Test settings import/export
- Verify all modules load correctly in sequence

**Common Patterns:**
- Access configuration via `TG.config` constants
- Access state via `TG.state` properties
- Use `TG.storage.getSettings()` to access all configuration
- Use `TG.state.currentAbortController` for cancelable requests
- Debounce user input with `setTimeout` for performance
- All functions use IIFE pattern: `(function(TG) { ... })(window.TestGen)`

## Workflow Conventions

**Generating Tests:**
1. Fill in feature pages (Confluence URLs)
2. Add checklist URL
3. Configure Langflow endpoints in settings
4. Click "🚀 Сгенерировать тесты"
5. Wait for results (check loader status updates)
6. Results automatically saved to history

**Editing Tests with AI:**
1. Generate tests first
2. Select EXACTLY ONE test via checkbox
3. Type modification request in agent chat
4. Send message (📤 button or Enter)
5. Test card updates in real-time

**Exporting to JIRA:**
1. Generate tests
2. Select tests via checkboxes (multiple allowed)
3. Choose Jira instance (D or S toggle)
4. Fill in Project Key and Folder Name
5. Click "📤 Отправить выбранные тесты в Jira"
6. View individual test export status

**Generating from Additional Checks:**
1. Generate tests (includes additional_checks)
2. Select specific checks via checkboxes
3. Click "🚀 Сгенерировать тест по дополнительным проверкам"
4. New tests append to existing list
5. Full history saved (old + new tests)
