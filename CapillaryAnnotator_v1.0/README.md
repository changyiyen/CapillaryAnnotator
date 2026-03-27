# Nailfold Capillaroscopy Annotator

A professional web-based application for annotating and analyzing nailfold capillaroscopy images.

## Features

- **Patient Management**: Directory-based workflow with automatic patient ID extraction
- **Multi-Image Support**: Browse and annotate multiple image sets per patient with resizable panel layout
- **Annotation Tools**:
  - Loop marking with 6 morphology types (Normal, Tortuous, Enlarged, Giant, Ramified, Bizarre)
  - Secondary findings (Hemorrhage, Avascular areas)
  - 1mm×1mm ROI assessment box
  - Calibrated measurement ruler
- **Smart Analysis & Processing**: 
  - Automatic loop classification and morphology tallying
  - CLAHE enhancement and contrast post-processing
- **Professional Reports**: Comprehensive PDF & clinical text exports with:
  - Annotated images with legends
  - Summary statistics across all images
  - Per-image morphology counts
  - ISO date formats with native Windows EOL standards

## Quick Start

### For End Users (Windows)
1. Build the application first (see Development section) OR use a pre-built `dist` folder
2. Double-click `START_SERVER.bat`
3. The application will open automatically in your browser
4. Use Chrome, Edge, or Opera (required for file system access)

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run serve
```

## Deployment

The application includes a portable web server (miniserve) for easy deployment on Windows.

**Package Contents:**
- `dist/` - Built application (static files)
- `server/miniserve.exe` - Lightweight portable web server (~6 MB)
- `scripts/START_SERVER.bat` - One-click startup script
- `scripts/STOP_SERVER.bat` - Stop the server

**Distribution:**
Simply zip the entire project folder and share. Recipients only need to:
1. Extract the folder
2. Double-click `START_SERVER.bat`
3. Open in Chrome/Edge/Opera

For detailed deployment options, see:
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Full deployment guide
- [`docs/DEPLOYMENT_NO_NPM.md`](docs/DEPLOYMENT_NO_NPM.md) - Deploy without Node.js
- [`docs/PACKAGING.md`](docs/PACKAGING.md) - Packaging application logic
- [`docs/START_HERE.html`](docs/START_HERE.html) - User-friendly instructions

## Browser Requirements

**✅ Supported:** Chrome, Edge, Opera (Chromium-based browsers)  
**❌ Not Supported:** Firefox, Safari

*The File System Access API (required for folder selection) is only available in Chromium-based browsers.*

## Project Structure

```
capillary_annotate/
├── dist/                       # Production build output
├── docs/                       # Documentation
│   ├── DEPLOYMENT.md
│   ├── DEPLOYMENT_NO_NPM.md
│   ├── PACKAGING.md
│   └── START_HERE.html
├── scripts/                    # Automation scripts
│   ├── START_SERVER.bat        # Windows: Start server script
│   ├── STOP_SERVER.bat         # Windows: Stop server script
│   ├── package-release.bat     # Windows release build
│   └── package-release.sh      # Unix release build
├── server/                     # Portable web server
│   └── miniserve.exe          # Lightweight HTTP server (~6 MB)
├── src/
│   ├── core/                  # Core application files
│   │   ├── App.tsx           # Main application component
│   │   └── main.tsx          # Entry point
│   ├── features/              # Feature-based organization
│   │   ├── annotation/       # Loop annotation & canvas
│   │   │   ├── components/
│   │   │   └── utils/
│   │   ├── export/           # PDF & image export
│   │   │   └── utils/
│   │   ├── files/            # File browser & management
│   │   │   └── components/
│   │   ├── morphology/       # Morphology selection & stats
│   │   │   └── components/
│   │   └── measurement/      # Ruler tool
│   │       └── components/
│   ├── shared/                # Shared resources
│   │   ├── components/       # Sidebar & common UI
│   │   ├── types/            # TypeScript interfaces
│   │   ├── constants/        # Color schemes & options
│   │   └── utils/            # Helper utilities
│   └── index.css             # Tailwind directives
├── public/
│   └── demo.png              # Demo capillaroscopy image
├── package.json
├── README.md
└── [config files...]
```

## Technologies

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 5
- **Canvas**: Konva + React Konva
- **Styling**: Tailwind CSS
- **PDF**: jsPDF + jsPDF-AutoTable
- **Icons**: Lucide React
- **Server**: miniserve (portable HTTP server)

## File Size

- **Built Application**: ~1.4 MB (dist folder)
- **Total Package**: ~7-8 MB (including miniserve)
- **PDF Reports**: ~300-500 KB per image

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run serve

# Lint code
npm run lint
```

## Troubleshooting

**"showDirectoryPicker is not defined"**
- Use Chrome, Edge, or Opera browser

**CORS errors when opening index.html directly**
- Use the server in `scripts/START_SERVER.bat` or `npm run serve`

**Annotations not saving**
- Ensure browser has permission to access the selected directories
- Check that you're using a supported browser

## License

Copyright © 2025
