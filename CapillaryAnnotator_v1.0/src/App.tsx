import { useState, useRef, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { Sidebar } from './components/Sidebar';
import { FileBrowser } from './components/FileBrowser';
import { MorphologyTally } from './components/MorphologyTally';
import type { Loop, ROI, RulerLine, FileEntry, SecondaryAnnotation } from './types';
import { updateLoopClassifications } from './utils/geometry';
import { generateBatchPDF } from './utils/pdfExport';

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'roi' | 'measure' | 'secondary'>('select');
  const [loops, setLoops] = useState<Loop[]>([]);
  const [secondaries, setSecondaries] = useState<SecondaryAnnotation[]>([]);
  const [roi, setRoi] = useState<ROI | null>(null);
  const [rulers, setRulers] = useState<RulerLine[]>([]);
  const [scale, setScale] = useState(1);
  const [selectedMorphology, setSelectedMorphology] = useState<Loop['morphology']>('Normal');
  const [selectedSecondaryType, setSelectedSecondaryType] = useState<SecondaryAnnotation['type']>('Hemorrhage');
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  // Multi-file workspace state
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [patientId, setPatientId] = useState('');
  const [subdirectories, setSubdirectories] = useState<string[]>([]);
  const [selectedSubdirectory, setSelectedSubdirectory] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Resizable panels state
  const [fileBrowserHeight, setFileBrowserHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleLoopsChange = (newLoops: Loop[]) => {
    const classified = updateLoopClassifications(newLoops);
    setLoops(classified);
  };

  const getFilenameWithoutExtension = (): string => {
    if (!image) return 'untitled';
    const name = image.name;
    const lastDot = name.lastIndexOf('.');
    return lastDot > 0 ? name.substring(0, lastDot) : name;
  };

  const handleExport = () => {
    const exportData = {
      imageName: image?.name,
      scale,
      roi,
      loops,
      secondaries,
      rulers
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "capillary_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = getFilenameWithoutExtension();
      link.download = `${filename}_annotated.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const handleDeleteLoop = (id: string) => {
    setLoops(loops.filter(loop => loop.id !== id));
  };

  const handleDeleteSecondary = (id: string) => {
    setSecondaries(secondaries.filter(s => s.id !== id));
  };

  const handleDeleteRuler = (id: string) => {
    setRulers(rulers.filter(ruler => ruler.id !== id));
  };

  const handleChangeImage = () => {
    const hasAnnotations = loops.length > 0 || secondaries.length > 0 || rulers.length > 0 || roi !== null;

    if (hasAnnotations) {
      const confirmed = window.confirm(
        'Changing the image will clear all annotations. Continue?'
      );
      if (!confirmed) return;
    }

    setImage(null);
    setImageUrl(null);
    setLoops([]);
    setSecondaries([]);
    setRulers([]);
    setRoi(null);
  };

  // Save current annotations before switching files
  const saveCurrentAnnotations = () => {
    if (currentFileIndex >= 0 && currentFileIndex < files.length) {
      const updatedFiles = [...files];
      updatedFiles[currentFileIndex] = {
        ...updatedFiles[currentFileIndex],
        annotations: {
          loops,
          secondaries,
          rulers,
          roi,
          scale
        }
      };
      setFiles(updatedFiles);
    }
  };

  const handleDirectorySelect = (newFiles: FileEntry[], patientIdentifier: string, subdirs: string[]) => {
    // Set patient ID and subdirectories
    setPatientId(patientIdentifier);
    setSubdirectories(subdirs);
    setSelectedSubdirectory(subdirs[0] || '');

    setFiles(newFiles);

    // Load first file
    if (newFiles.length > 0) {
      loadFile(0, newFiles);
    }
  };

  const handleSubdirectoryChange = (subdirName: string) => {
    setSelectedSubdirectory(subdirName);
    // The FileBrowser will handle loading the new files
  };

  const loadFile = (index: number, fileList: FileEntry[] = files) => {
    if (index < 0 || index >= fileList.length) return;

    const fileEntry = fileList[index];
    setImage(fileEntry.file);
    setCurrentFileIndex(index);

    // Load saved annotations if they exist
    if (fileEntry.annotations) {
      setLoops(fileEntry.annotations.loops);
      setSecondaries(fileEntry.annotations.secondaries || []);
      setRulers(fileEntry.annotations.rulers);
      setRoi(fileEntry.annotations.roi);
      setScale(fileEntry.annotations.scale);
    } else {
      // Reset annotations for new file
      setLoops([]);
      setSecondaries([]);
      setRulers([]);
      setRoi(null);
      setScale(1);
    }
  };

  const handleFileSelect = (index: number) => {
    saveCurrentAnnotations();
    loadFile(index);
  };

  const handleBatchPDFExport = async () => {
    if (files.length === 0) {
      alert('No files loaded. Please select a folder first.');
      return;
    }

    // Create updated files array with current annotations
    // (don't rely on state update which is async)
    let updatedFiles = [...files];
    if (currentFileIndex >= 0 && currentFileIndex < files.length) {
      updatedFiles[currentFileIndex] = {
        ...updatedFiles[currentFileIndex],
        annotations: {
          loops,
          secondaries,
          rulers,
          roi,
          scale
        }
      };
      // Also update the state for consistency
      setFiles(updatedFiles);
    }

    try {
      await generateBatchPDF(updatedFiles, patientId || 'Unknown Patient');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Check console for details.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header - Full Width */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold">Nailfold Capillaroscopy Annotator</h1>
        {image && (
          <button
            onClick={handleChangeImage}
            className="text-sm text-gray-400 hover:text-white"
          >
            Change Image
          </button>
        )}
      </header>

      {/* Main Layout: File Browser | Content | Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Resizable */}
        <div className="flex flex-col border-r border-gray-700 w-52">
          {/* File Browser - Resizable height */}
          <div
            style={{ height: `${fileBrowserHeight}px` }}
            className="flex-shrink-0 overflow-hidden"
          >
            <FileBrowser
              files={files}
              currentFileIndex={currentFileIndex}
              patientId={patientId}
              subdirectories={subdirectories}
              selectedSubdirectory={selectedSubdirectory}
              onFileSelect={handleFileSelect}
              onDirectorySelect={handleDirectorySelect}
              onSubdirectoryChange={handleSubdirectoryChange}
            />
          </div>

          {/* Resize Handle */}
          <div
            className={`h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors ${isResizing ? 'bg-blue-500' : ''
              }`}
            onMouseDown={(e) => {
              setIsResizing(true);
              const startY = e.clientY;
              const startHeight = fileBrowserHeight;

              const handleMouseMove = (e: MouseEvent) => {
                const delta = e.clientY - startY;
                const newHeight = Math.max(200, Math.min(window.innerHeight - 300, startHeight + delta));
                setFileBrowserHeight(newHeight);
              };

              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* Morphology Tally - Takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <MorphologyTally loops={loops} secondaries={secondaries} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-hidden relative" ref={containerRef}>
            {!imageUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-4">
                <div className="max-w-xl w-full">
                  <ImageUpload onImageUpload={setImage} />
                </div>
                <button
                  onClick={() => setImageUrl('/demo.png')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Load Demo Image
                </button>
              </div>
            ) : (
              <AnnotationCanvas
                imageUrl={imageUrl}
                filename={getFilenameWithoutExtension()}
                width={canvasSize.width}
                height={canvasSize.height}
                activeTool={activeTool}
                roi={roi}
                onRoiChange={setRoi}
                loops={loops}
                onLoopsChange={handleLoopsChange}
                secondaries={secondaries}
                onSecondariesChange={setSecondaries}
                rulers={rulers}
                onRulersChange={setRulers}
                scale={scale}
                selectedMorphology={selectedMorphology}
                selectedSecondaryType={selectedSecondaryType}
                hoveredAnnotationId={hoveredAnnotationId}
              />
            )}
          </main>
        </div>

        {/* Right Sidebar */}
        <Sidebar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          loops={loops}
          secondaries={secondaries}
          rulers={rulers}
          scale={scale}
          onScaleChange={setScale}
          selectedMorphology={selectedMorphology}
          onMorphologyChange={setSelectedMorphology}
          selectedSecondaryType={selectedSecondaryType}
          onSecondaryTypeChange={setSelectedSecondaryType}
          onDeleteLoop={handleDeleteLoop}
          onDeleteSecondary={handleDeleteSecondary}
          onDeleteRuler={handleDeleteRuler}
          onExport={handleExport}
          onExportImage={handleExportImage}
          onBatchPDFExport={handleBatchPDFExport}
          hasMultipleFiles={files.length > 0}
          onHoverAnnotation={setHoveredAnnotationId}
        />
      </div>
    </div>
  );
}

export default App;
