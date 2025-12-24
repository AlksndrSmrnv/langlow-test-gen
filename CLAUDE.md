# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Web application for generating integration tests with Russian language interface. Sends XML requests to Langflow API, displays parsed test results as interactive cards, and provides AI-powered test editing via chat interface.

## Development

**No build system** - open `index.html` directly in a browser.

**External dependencies** (loaded via CDN):
- **marked.js** - Markdown parsing for test content rendering
- **Google Fonts** - Inter font family

## Architecture

### File Structure

- **index.html** (326 lines) - HTML structure, settings modal, history modal, agent chat UI
- **styles.css** (1344 lines) - CSS with custom properties, responsive design, animations
- **app.js** (1386 lines) - All JavaScript logic, state management, API integration
- **mock.js** (260 lines) - Mock mode implementation for UI testing without real API calls

### Key Features

#### 1. Test Generation
- User provides feature pages (Confluence URLs) and checklist URL
- Builds XML request with optional Confluence credentials
- Sends to Langflow generation endpoint
- Parses XML response to extract test cases and additional checks
- Displays as interactive, collapsible cards

#### 2. Agent Chat (AI Test Editing)
- Select exactly ONE test via checkbox
- Chat interface to request modifications
- Sends test content + modification request to agent endpoint
- Updates test card in real-time with AI response

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
- Delete individual history entries
- Automatically saves up to 50 most recent generations

#### 6. Mock Mode
- Testing UI without real API calls to Langflow
- Toggle in settings modal to enable/disable
- Visual indicator showing when mock mode is active
- Provides realistic delays and demo data for all API endpoints
- Useful for development, demos, and UI testing

#### 7. Settings Management
- **Export Settings** - Download all settings as JSON file
- **Import Settings** - Upload and restore settings from JSON file
- Token visibility toggles for secure password fields
- Dual JIRA instance support (Jira D and Jira S) with toggle switch

#### 8. Error Recovery
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
Select 1 test → User message → Prompt construction →
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
Generate tests → saveToHistory() → localStorage →
→ History modal → Load generation → showResults() → Restore UI
```

**Mock Mode Flow:**
```
API call → Check mockMode flag → window.mockFetch() →
→ Simulate delay → Return demo data → Process as normal
```

## Key Functions

### Core Generation
- `buildXML()` - Constructs XML request from form inputs with Confluence credentials
- `buildChecksXML()` - Constructs XML for generating tests from selected additional checks
- `buildJiraXML()` - Constructs XML for JIRA export with all test metadata
- `parseXML()` - Two-tier parsing: DOMParser + regex fallback for malformed XML
- `extractResponse()` - Extracts text from nested Langflow response structure
- `generate()` - Main generation orchestration with error handling and abort support
- `generateFromChecks()` - Generates new tests from selected additional checks (append mode)

### Display & UI
- `showResults(data, append)` - Displays parsed tests and checks (supports append mode)
- `showPlainText()` - Fallback when XML parsing fails
- `createCard()` - Dynamic card creation (test/check modes with checkboxes)
- `updateCard()` - Updates card content after agent edits
- `toggleAll()` / `selectAll()` - Bulk card operations
- `startLoading()` / `stopLoading()` - Animated loading states with rotating messages

### Agent Chat
- `sendAgentMsg()` - Processes chat messages, updates tests
- `addMessage()` - Adds chat message bubble to UI
- `resetAgent()` - Clears chat state
- `updateSelection()` - Manages agent chat availability based on selection

### JIRA Integration
- `sendJira()` - Parallel JIRA submission with status reporting

### Persistence
- `saveForm()` - Auto-saves all form data to localStorage (500ms debounce)
- `loadForm()` - Restores form data on page load
- `showAutosave()` - Visual save confirmation toast

### History Management
- `saveToHistory()` - Saves generation results with metadata to localStorage
- `loadHistory()` - Retrieves history array from localStorage (max 50 items)
- `renderHistory()` - Displays history items in modal with load/delete actions
- `loadGenerationFromHistory()` - Restores a previous generation by ID
- `deleteFromHistory()` - Removes a history item and re-renders list
- `openHistoryModal()` / `closeHistoryModal()` - History modal controls

### Mock Mode
- `window.mockFetch(type, data)` - Main mock API function (defined in mock.js)
- `mockDelay()` - Simulates network latency (500-1500ms)
- `getMockAgentResponse()` - Generates mock agent chat responses
- `window.mockModeActive()` - Creates visual indicator element
- `toggleMockIndicator()` - Shows/hides mock mode indicator

### Settings Management
- `exportSettings()` - Downloads settings as JSON file with timestamp
- `importSettings()` - Triggers file picker for settings import
- `handleImportFile()` - Processes and validates imported settings file
- `toggleTokenVisibility()` - Shows/hides password fields (token inputs)
- `updateJiraConnection()` - Switches between Jira D and Jira S credentials
- `updateJiraToggleLabels()` - Updates active state of Jira toggle labels

### Utilities
- `sessionId()` - Generates timestamped session IDs: `YYYYMMDD_HHMMSS_[random]`
- `buildBody()` - Constructs API request body (supports 3 formats)
- `getSettings()` - Extracts settings from DOM
- `headers()` - Builds API headers with optional auth
- `md()` - Markdown rendering with marked.js
- `escapeHtml()` - HTML entity escaping
- `plural()` - Russian plural form helper
- `copy()` - Clipboard copy with visual feedback

## Configuration

### Settings Modal (localStorage persistence)

**Langflow Endpoints:**
- **Generation URL** - Main test generation endpoint
- **Agent Chat URL** - AI editing endpoint
- **JIRA URL** - Test submission endpoint
- **API Key** - Optional authentication (supports Bearer and x-api-key headers)
- **API Format** - Request body format (standard/inputs/message)
- **Mock Mode** - Enable/disable mock mode for UI testing without real API calls

**JIRA Connection (Dual Instance Support):**
- **Jira D** - Primary Jira instance credentials (URL + Token)
- **Jira S** - Secondary Jira instance credentials (URL + Token)
- **Toggle Switch** - Switch between Jira D and Jira S for test export
- All tokens support show/hide visibility toggle

**Confluence Connection:**
- **Confluence Token** - API token for accessing Confluence pages
- Embedded in XML requests to fetch feature documentation

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

```javascript
// Global state
testsData = []              // Array of generated tests
checksData = []             // Array of additional checks
agentState = {              // Agent chat state
  selectedIndex: null,
  messages: [],
  processing: false
}
dom = {}                    // Cached DOM elements (56 elements)
currentAbortController      // Request cancellation for active API calls
saveTimeout = null          // Debounce timer for auto-save
statusInterval = null       // Interval for rotating loading messages
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
- `buildXML()` - Standard test generation with features + checklist + confluence_token
- `buildChecksXML()` - Generates tests from selected checks with constant checklist URL (`http://s.s/test`)
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
- **Mock mode errors** - Handles missing mock.js gracefully
- **AbortError handling** - Silently ignores user-canceled requests

## Technical Implementation Details

### Event Delegation
Single event listener on document for all clicks/changes, dispatches to appropriate handlers.

### DOM Caching
All frequently accessed elements cached in `dom` object at initialization (56 elements).
Includes elements for settings, history, modals, forms, and result sections.

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

## Mock Mode Development

**Purpose:** Test and develop UI features without requiring a live Langflow backend.

**How to Enable:**
1. Open Settings modal (⚙️ button)
2. Check "🎭 Режим заглушек (Mock Mode)"
3. Visual indicator appears in top-right corner

**Mock Data Provided:**
- **Test Generation** - Returns 3 pre-built test cases + 3 additional checks
- **Agent Chat** - Returns modified test with user request appended
- **JIRA Export** - Returns success status

**Mock Behavior:**
- Simulates realistic network delays (800-1500ms)
- Returns data in Langflow API response format
- Logs all mock operations to console with 🎭 prefix
- Fully compatible with all UI features

**Use Cases:**
- UI development without backend setup
- Demonstrations and presentations
- Testing error handling paths
- Rapid prototyping of new features

## Development Guidelines

**Code Organization:**
- All JavaScript in `app.js` (no build step required)
- Mock functionality isolated in `mock.js`
- CSS uses custom properties for consistent theming
- Event delegation for all dynamic UI interactions

**Adding New Features:**
1. Update relevant functions in `app.js`
2. Add mock support in `mock.js` if API-related
3. Update localStorage schema in `saveForm()`/`loadForm()` if storing new data
4. Add DOM element to cache if frequently accessed
5. Update CLAUDE.md with feature documentation

**Testing Checklist:**
- Test with Mock Mode enabled
- Test with real Langflow endpoints
- Verify localStorage persistence
- Check mobile responsive behavior
- Validate error handling paths
- Test settings import/export

**Common Patterns:**
- Use `getSettings()` to access all configuration
- Check `settings.mockMode` before API calls
- Use `window.mockFetch()` for mock responses
- Always use `AbortController` for cancelable requests
- Debounce user input with `setTimeout` for performance

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
