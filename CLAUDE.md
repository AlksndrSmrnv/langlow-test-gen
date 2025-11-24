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

- **index.html** (252 lines) - HTML structure, settings modal, agent chat UI
- **styles.css** (1141 lines) - CSS with custom properties, responsive design
- **app.js** (813 lines) - All JavaScript logic

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

## Key Functions

### Core Generation
- `buildXML()` - Constructs XML request from form inputs
- `parseXML()` - Two-tier parsing: DOMParser + regex fallback for malformed XML
- `extractResponse()` - Extracts text from nested Langflow response structure
- `generate()` - Main generation orchestration with error handling

### Display & UI
- `showResults()` - Displays parsed tests and checks
- `showPlainText()` - Fallback when XML parsing fails
- `createCard()` - Dynamic card creation (test/check modes)
- `updateCard()` - Updates card content after agent edits
- `toggleAll()` / `selectAll()` - Bulk card operations

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
- **API Key** - Optional authentication
- **API Format** - Request body format (standard/inputs/message)

**JIRA Connection:**
- JIRA URL - Base Jira instance URL
- JIRA Token - API authentication token

**Confluence Connection:**
- Confluence URL - Base Confluence instance URL
- Confluence Token - API authentication token

All settings auto-save to `localStorage.testGeneratorFormData`.

## State Management

```javascript
// Global state
testsData = []              // Array of generated tests
agentState = {              // Agent chat state
  selectedIndex: null,
  messages: [],
  processing: false
}
dom = {}                    // Cached DOM elements (44 elements)
currentAbortController      // Request cancellation
```

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
- Graceful degradation for partial responses

## UI Patterns

### Collapsible Behavior
- **Form sections** - Collapse during generation, expand on click
- **Test cards** - Start collapsed, toggle via header click (not checkbox)
- **Bulk operations** - "Expand All" / "Collapse All" button

### Selection Logic
- **Checkboxes** - For JIRA export selection (multiple)
- **Agent chat** - Requires EXACTLY ONE selection (shows warning otherwise)
- **Visual feedback** - Selected cards: green border + background

### Auto-save
- Triggers 500ms after any input change
- Toast notification (bottom-right) on save
- Persists to localStorage

## Error Handling

- **HTTP errors** - Displays status code with troubleshooting hints
- **405 errors** - Specific guidance about endpoint/format issues
- **Content-type validation** - Warns if non-JSON response
- **JSON parse errors** - Graceful degradation
- **Request abortion** - AbortController for cancellation

## Technical Implementation Details

### Event Delegation
Single event listener on document for all clicks/changes, dispatches to appropriate handlers.

### DOM Caching
All frequently accessed elements cached in `dom` object at initialization (44 elements).

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
AUTOSAVE_DELAY = 500        // ms
FEEDBACK_DELAY = 2000       // ms
LOADER_INTERVAL = 8000      // ms
LOADING_STATUSES = [...]    // 8 status messages with substatus
```

### Browser Compatibility

Requires modern browser with:
- ES6+ (arrow functions, async/await, template literals)
- Fetch API
- DOMParser
- LocalStorage
- CSS Custom Properties
