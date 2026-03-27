# Deployment for Users Without NPM/Node.js

## Quick Answer

After building the application (`npm run build`), the `dist` folder contains only static files that can be served by **any** web server - no Node.js required!

## Packaging Instructions

### Step 1: Build the Application
On your development machine:
```bash
npm run build
```
This creates a `dist` folder with all necessary files.

### Step 2: Choose a Deployment Method

## Method 1: Python HTTP Server (Recommended if Python is installed)

**Python is pre-installed on macOS and most Linux systems. Windows users can easily install it.**

**Instructions for end user:**
1. Extract the `dist` folder
2. Open terminal/command prompt in the `dist` folder
3. Run ONE of these commands:

   **Python 3:**
   ```bash
   python -m http.server 8000
   ```
   
   **Python 2:**
   ```bash
   python -m SimpleHTTPServer 8000
   ```

4. Open browser to: http://localhost:8000

## Method 2: Portable Web Server Executable

Download a portable web server and include it with your distribution:

### For Windows:
1. Download **Fenix Web Server** (portable, no install): https://fenixwebserver.com/
   - OR download **Mongoose** (single .exe): https://github.com/cesanta/mongoose/releases

2. Package structure:
   ```
   your-app/
   ├── dist/           (your built files)
   └── mongoose.exe    (portable server)
   ```

3. Create `START_SERVER.bat`:
   ```batch
   @echo off
   start http://localhost:8080
   mongoose.exe -document_root dist -listening_port 8080
   ```

### For macOS/Linux:
1. Download a static binary of a simple web server
2. Create `start_server.sh`:
   ```bash
   #!/bin/bash
   open http://localhost:8080  # macOS
   # xdg-open http://localhost:8080  # Linux
   ./server -port 8080 -dir dist
   ```

## Method 3: Use Browser "Open File" with CORS Workaround

**⚠️ Limited functionality - File System Access API may not work**

Some features require HTTP/HTTPS protocol. However, for basic viewing:

1. Users can double-click `index.html` in the `dist` folder
2. The app will open in the browser but may have limited functionality

## Method 4: Online Hosting (Zero Local Setup)

Upload the `dist` folder to free static hosting:

- **Netlify**: Drag & drop the `dist` folder at netlify.com
- **Vercel**: Free hosting with drag & drop
- **GitHub Pages**: Free hosting via GitHub
- **Cloudflare Pages**: Free hosting

Users just visit the URL - no installation needed!

## Recommended Package

**Create a ZIP file with:**

```
CapillaryAnnotator/
├── dist/                    (built application files)
├── START_HERE.html          (instructions)
├── mongoose.exe             (Windows portable server - optional)
└── start_server.bat         (Windows startup script - optional)
```

**START_HERE.html:**
```html
<!DOCTYPE html>
<html>
<head><title>Capillaroscopy Annotator - Setup Instructions</title></head>
<body style="font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px;">
    <h1>Nailfold Capillaroscopy Annotator</h1>
    
    <h2>Quick Start</h2>
    
    <h3>Option 1: Using Python (Recommended)</h3>
    <ol>
        <li>Open terminal/command prompt in the <code>dist</code> folder</li>
        <li>Run: <code>python -m http.server 8000</code></li>
        <li>Open browser to: <a href="http://localhost:8000">http://localhost:8000</a></li>
    </ol>
    
    <h3>Option 2: Using Portable Server (Windows)</h3>
    <ol>
        <li>Double-click <code>start_server.bat</code></li>
        <li>Your browser will open automatically</li>
    </ol>
    
    <h3>Important Requirements</h3>
    <ul>
        <li>✅ Use Chrome, Edge, or Opera browser (required for file selection)</li>
        <li>❌ Firefox and Safari are NOT supported</li>
        <li>⚠️ Must be served via HTTP (not file://)</li>
    </ul>
    
    <h2>Need Help?</h2>
    <p>See the DEPLOYMENT.md file for more options.</p>
</body>
</html>
```

## Summary

**Easiest for non-technical users:**
1. Build: `npm run build`
2. Host on Netlify/Vercel (free, zero setup for users)
3. Share the URL

**Best for offline/local use:**
1. Build: `npm run build`
2. Include portable server (mongoose.exe)
3. Create startup script
4. Zip and share
