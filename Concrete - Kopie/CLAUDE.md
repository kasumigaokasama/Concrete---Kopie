# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Λbstract is a Chrome extension for Wolvesville game automation in custom games. The project consists of:

- **Chrome Extension**: Browser extension with popup UI and content script injection
- **Backend Server**: Express.js server for license verification and bot monitoring
- **Game Automation**: Content script that automates Wolvesville gameplay

## Architecture

### Chrome Extension Components
- `manifest.json` - Extension configuration (v3)
- `popup.html/css/js` - Extension popup UI for bot control
- `background.js` - Service worker handling click automation via Chrome debugger API
- `Λbstract.js` - Content script injected into Wolvesville pages

### Backend Server (`abstract-bot-server/`)
- `server.js` - Express server with CORS configuration
- `package.json` - Node.js dependencies (express, cors, nodemon)
- Automated startup scripts for Windows (`.bat` files)

## Development Commands

### Backend Server
```bash
# Start server in development mode
cd abstract-bot-server
npm run dev

# Start server in production mode
npm start

# Install dependencies
npm install
```

### Extension Development
- Load extension in Chrome: Extensions → Developer mode → Load unpacked
- Test on https://www.wolvesville.com/* (requires server running on localhost:3000)

## Key Technical Details

### Game Automation Logic
The content script (`Λbstract.js`) implements:
- **Role Detection**: Analyzes DOM elements to identify player roles (Wolf, Priest, Shooter, etc.)
- **Phase Detection**: Determines game phase (Day/Night) by analyzing timer labels
- **Automated Actions**: Sends chat messages, votes, and uses role abilities
- **Couple Detection**: Identifies love connections using Cupid stickers

### Click System
- Extension uses Chrome debugger API to simulate precise mouse clicks
- `background.js` receives click coordinates and executes via `Input.dispatchMouseEvent`
- Content script calculates element centers and sends commands to background

### Server API Endpoints
- `POST /api/heartbeat` - Receives bot status updates
- `GET /api/heartbeat` - Returns last heartbeat and bot status
- `POST /api/verify-name` - License verification (currently allows all names)
- `GET /api/health` - Server health check

## Development Notes

### Obfuscated Code
The main automation logic uses hex-encoded variable names for obfuscation. When debugging:
- Use browser dev tools to inspect DOM elements
- Check console logs prefixed with `[Λbstract]` or `[Λ]`
- Monitor network requests to localhost:3000

### Testing
- Requires active Wolvesville custom game
- Server must be running on port 3000
- Extension needs debugger permissions for click automation

### Permissions Required
- `tabs` - Access browser tabs
- `scripting` - Inject content scripts
- `storage` - Store bot configuration
- `debugger` - Chrome debugger API for clicks
- Host permissions for Wolvesville and localhost