# Life in Dots — Chrome Extension

A compact Chrome extension popup for the Life in Dots app.

## Features

- Dots grid with dropdown to switch between **Years**, **Months**, **Year**, **Month**, and **Day** views
- Right-click any dot to color or tag it
- **Todos** section (separate from the dots) — add, check off, and delete todos
- Light / dark theme toggle (matches the main website)
- "Open Website" button to jump to the full app

## Development

```bash
cd extension
npm install
npm run build
```

Then load `extension/dist/` as an unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

## First Run

On first open, you'll be prompted to enter your birth date and expected lifespan. This data is stored locally in `chrome.storage.local`.
