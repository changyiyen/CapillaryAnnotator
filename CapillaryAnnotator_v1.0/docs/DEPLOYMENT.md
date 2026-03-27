# Nailfold Capillaroscopy Annotator - Deployment Guide

## Prerequisites
- Node.js (v18 or later) installed on the target computer
- A modern browser (Chrome, Edge, or Opera) - required for File System Access API

## Option 1: Run from Source (Development Mode)

**On another computer:**

1. Copy the entire project folder to the target computer
2. Open a terminal/command prompt in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open the URL shown in the terminal (http://localhost:5175)

## Option 2: Build for Production (Static Hosting)

**Build the application:**

1. In the project directory, run:
   ```bash
   npm run build
   ```
   This creates a `dist` folder with optimized production files.

2. **Serve the built files:**
   
   **Option 2a - Using a simple HTTP server:**
   ```bash
   npx serve dist
   ```
   Then open http://localhost:3000

   **Option 2b - Using Python (if installed):**
   ```bash
   cd dist
   python -m http.server 8000
   ```
   Then open http://localhost:8000

   **Option 2c - Deploy to web hosting:**
   - Upload the `dist` folder contents to any static web host (Netlify, Vercel, GitHub Pages, etc.)

## Option 3: Package as Desktop App (Electron)

For a true desktop application experience, you can package with Electron:

1. Install Electron builder:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Create `electron.js` in project root (see separate guide)
3. Update `package.json` with Electron scripts
4. Build for target platform:
   ```bash
   npm run electron:build
   ```

## Important Notes

- **Browser Requirement**: The File System Access API used for folder selection only works in Chromium-based browsers (Chrome, Edge, Opera). Safari and Firefox are not supported.
- **HTTPS**: For production deployment on the web, use HTTPS. Some browser features may require it.
- **File Size**: The built application is approximately 1-2 MB.

## Quick Start for End Users

**If you just want to share with others:**

1. Build the production version (`npm run build`)
2. Zip the `dist` folder
3. Share the zip file with instructions:
   - Extract the folder
   - Run a local server (see Option 2b - Python HTTP server recommended)
   - ⚠️ Opening `index.html` directly has limited functionality due to CORS restrictions

## Troubleshooting

- **"showDirectoryPicker is not defined"**: Use Chrome, Edge, or Opera browser
- **CORS errors**: Files must be served via HTTP/HTTPS, not opened directly from filesystem
- **Annotations not saving**: Ensure browser has permission to access directories
