# WhyTabs

WhyTabs is a modern Chrome browser extension designed to help you declutter, organize, and manage your browser tabs and groups efficiently. Built with Angular 19.

## Features

- **Side Panel UI:** A sticky header and footer interface for easy access to your saved tabs.
- **Tab Reminders & Notifications:** Get notifications to read saved tabs when Chrome opens, with options to snooze or mark as read (integrates with system notifications).
- **Data Management:** Easily backup and restore your saved tabs data.
- **Keyboard Shortcuts:** Quick shortcuts to toggle the side panel and popup.

## Tech Stack

- **Framework:** Angular 19
- **Browser APIs:** Chrome Extensions API (Side Panel, Notifications, Alarms, Storage)

## Development

### Prerequisites

- Node.js
- npm

### Build & Load

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the extension:**
   To build and watch for changes during development:
   ```bash
   npx ng build --watch
   ```

3. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked**.
   - Select the `dist/why-tabs/browser` directory to load the extension.