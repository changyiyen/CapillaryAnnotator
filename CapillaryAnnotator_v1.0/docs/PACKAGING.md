# How to Package for Distribution

## Problem: Symlinks in node_modules

The `node_modules` folder contains symlinks (e.g., `.bin/` entries) that don't work across different filesystems, especially when transferring to Windows.

**Solution:** Don't include `node_modules` in your distribution package.

---

## ✅ Packaging Instructions

### Quick Method: Use the Packaging Script

**Linux/macOS:**
```bash
./package-release.sh
```

**Windows:**
```batch
package-release.bat
```

This creates a `release/CapillaryAnnotator_v1.0/` folder with:
- ✅ Built application (`dist/`)
- ✅ Source code (`src/`)
- ✅ Server (`server/miniserve.exe`)
- ✅ Batch files
- ✅ Documentation
- ❌ NO `node_modules` (no symlinks!)

---

## Manual Packaging (What Gets Included)

### Essential Files for Distribution:
```
CapillaryAnnotator_v1.0/
├── dist/                    # Built app (REQUIRED for end users)
├── server/                  # miniserve.exe (REQUIRED for end users)
├── START_SERVER.bat         # Startup script
├── STOP_SERVER.bat          # Stop script
├── docs/                    # Documentation
├── src/                     # Source code (optional, for developers)
├── public/                  # Assets
├── README.md
├── package.json
└── [config files]           # tsconfig, vite.config, etc.
```

### Files to EXCLUDE:
- ❌ `node_modules/` - Contains symlinks, very large
- ❌ `.git/` - Version control
- ❌ `dist-ssr/` - Not needed
- ❌ `.gemini/` - Development artifacts
- ❌ `release/` - Packaging output

---

## Distribution Scenarios

### Scenario 1: End Users Only (No Development)

**Include:**
- `dist/` (built app)
- `server/miniserve.exe`
- `START_SERVER.bat`
- `STOP_SERVER.bat`
- `docs/START_HERE.html`
- `README.md`

**Size:** ~7-8 MB

**User workflow:**
1. Extract ZIP
2. Double-click `START_SERVER.bat`
3. Done!

### Scenario 2: Developers (Full Source)

**Include:**
- Everything from Scenario 1
- `src/` (source code)
- `package.json`
- `vite.config.ts`
- `tsconfig*.json`
- All config files

**Size:** ~8-9 MB (still no node_modules!)

**Developer workflow:**
1. Extract ZIP
2. Run `npm install` (downloads fresh node_modules)
3. Run `npm run dev`

---

## Creating the ZIP File

### Option 1: Using the Script (Recommended)
```bash
# Linux/macOS
./package-release.sh

# Windows
package-release.bat
```

Then ZIP the `release/CapillaryAnnotator_v1.0` folder.

### Option 2: Manual (Linux/macOS)
```bash
# Create clean package directory
mkdir -p release/CapillaryAnnotator_v1.0

# Copy essential files (no node_modules!)
cp -r dist docs server src public release/CapillaryAnnotator_v1.0/
cp *.bat README.md package.json *.config.* tsconfig*.json release/CapillaryAnnotator_v1.0/

# Create ZIP (no symlinks)
cd release
zip -r CapillaryAnnotator_v1.0.zip CapillaryAnnotator_v1.0/
```

### Option 3: Manual (Windows)
1. Create `release\CapillaryAnnotator_v1.0` folder
2. Copy folders: `dist`, `docs`, `server`, `src`, `public`
3. Copy files: `*.bat`, `README.md`, `package.json`, config files
4. Right-click folder → Send to → Compressed (zipped) folder

---

## Verifying the Package

After creating the ZIP:

1. **Extract to a test location**
2. **Check for symlinks:**
   ```bash
   # Linux/macOS
   find CapillaryAnnotator_v1.0 -type l
   # Should return nothing!
   ```
3. **Test end-user workflow:**
   - Double-click `START_SERVER.bat`
   - Should open browser and work
4. **Test developer workflow:**
   - Run `npm install` (creates new node_modules)
   - Run `npm run dev`
   - Should work

---

## File Sizes

- Built app only: ~1.4 MB
- With miniserve: ~7-8 MB
- With source code: ~8-9 MB
- **With node_modules (DON'T DO THIS):** ~200+ MB with symlink issues!

---

## Summary

✅ **DO:**
- Use the packaging scripts
- Exclude `node_modules`
- Include built `dist/` folder
- Include `server/` with miniserve

❌ **DON'T:**
- Include `node_modules`
- Include `.git` folder
- Include development artifacts

The packaging scripts handle everything correctly!
