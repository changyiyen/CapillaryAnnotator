import { useState, useRef, useEffect } from 'react';
import { ImageUpload } from '../features/files/components/ImageUpload';
import { AnnotationCanvas } from '../features/annotation/components/AnnotationCanvas';
import { Sidebar } from '../shared/components/Sidebar';
import { FileBrowser } from '../features/files/components/FileBrowser';
import { MorphologyTally } from '../features/morphology/components/MorphologyTally';
import { NotificationOverlay } from '../shared/components/NotificationOverlay';
import type { Loop, ROI, RulerLine, FileEntry, SecondaryAnnotation } from '../shared/types';
import { updateLoopClassifications } from '../features/annotation/utils/geometry';
import { generateBatchPDF } from '../features/export/utils/pdfExport';
import { enhanceImage } from '../features/annotation/utils/imageEnhancement';
import { calculateSkewAngle } from '../features/annotation/utils/deskew';
import { saveFile } from '../utils/fileSaver';
// import { detectLoops } from '../experimental/detection/detection'; // Disabled for now

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

  // Keyboard shortcuts state
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [previousTool, setPreviousTool] = useState<'select' | 'roi' | 'secondary'>('select');

  // Image enhancement state
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Rotation state
  const [rotation, setRotation] = useState(0);
  const [isAligning, setIsAligning] = useState(false);

  // Auto-detection state (disabled for now)
  // const [isDetecting, setIsDetecting] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'w':
          e.preventDefault();
          handlePreviousImage();
          break;
        case 's':
          e.preventDefault();
          handleNextImage();
          break;
        case 'a':
          e.preventDefault();
          handlePreviousTool();
          break;
        case 'd':
          e.preventDefault();
          handleNextTool();
          break;
        case 'e':
          e.preventDefault();
          handleRulerToggle();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    files,
    currentFileIndex,
    selectedMorphology,
    selectedSecondaryType,
    activeTool,
    previousTool,
    loops,
    secondaries,
    rulers,
    roi,
    scale,
    rotation
  ]);

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

  const handleExport = async () => {
    const exportData = {
      imageName: image?.name,
      scale,
      roi,
      loops,
      secondaries,
      rulers
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    await saveFile(blob, 'capillary_data.json', [{
      description: 'JSON Data',
      accept: { 'application/json': ['.json'] }
    }]);
  };

  const handleExportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filename = getFilenameWithoutExtension();
      await saveFile(blob, `${filename}_annotated.png`, [{
        description: 'PNG Image',
        accept: { 'image/png': ['.png'] }
      }]);
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

  // Keyboard shortcut helpers
  const showNotification = (message: string) => {
    setNotificationMessage(message);
  };

  const handlePreviousImage = () => {
    if (files.length === 0) {
      showNotification('No images loaded');
      return;
    }
    if (files.length === 1) {
      showNotification('Only one image');
      return;
    }
    const newIndex = currentFileIndex <= 0 ? files.length - 1 : currentFileIndex - 1;
    handleFileSelect(newIndex);
    showNotification(`Image "${files[newIndex].filename}" selected`);
  };

  const handleNextImage = () => {
    if (files.length === 0) {
      showNotification('No images loaded');
      return;
    }
    if (files.length === 1) {
      showNotification('Only one image');
      return;
    }
    const newIndex = currentFileIndex >= files.length - 1 ? 0 : currentFileIndex + 1;
    handleFileSelect(newIndex);
    showNotification(`Image "${files[newIndex].filename}" selected`);
  };

  const handlePreviousTool = () => {
    const tools: Array<{ type: 'loop' | 'secondary'; morphology?: Loop['morphology']; secondaryType?: SecondaryAnnotation['type'] }> = [
      { type: 'loop', morphology: 'Normal' },
      { type: 'loop', morphology: 'Tortuous' },
      { type: 'loop', morphology: 'Enlarged' },
      { type: 'loop', morphology: 'Giant' },
      { type: 'loop', morphology: 'Ramified' },
      { type: 'loop', morphology: 'Bizarre' },
      { type: 'secondary', secondaryType: 'Hemorrhage' },
      { type: 'secondary', secondaryType: 'Avascular' },
    ];

    const currentIndex = tools.findIndex(tool =>
      (tool.type === 'loop' && tool.morphology === selectedMorphology && activeTool === 'select') ||
      (tool.type === 'secondary' && tool.secondaryType === selectedSecondaryType && activeTool === 'secondary')
    );

    const newIndex = currentIndex <= 0 ? tools.length - 1 : currentIndex - 1;
    const newTool = tools[newIndex];

    if (newTool.type === 'loop') {
      setActiveTool('select');
      setSelectedMorphology(newTool.morphology!);
      showNotification(`${newTool.morphology} loop marker selected`);
    } else {
      setActiveTool('secondary');
      setSelectedSecondaryType(newTool.secondaryType!);
      showNotification(`${newTool.secondaryType} marker selected`);
    }
  };

  const handleNextTool = () => {
    const tools: Array<{ type: 'loop' | 'secondary'; morphology?: Loop['morphology']; secondaryType?: SecondaryAnnotation['type'] }> = [
      { type: 'loop', morphology: 'Normal' },
      { type: 'loop', morphology: 'Tortuous' },
      { type: 'loop', morphology: 'Enlarged' },
      { type: 'loop', morphology: 'Giant' },
      { type: 'loop', morphology: 'Ramified' },
      { type: 'loop', morphology: 'Bizarre' },
      { type: 'secondary', secondaryType: 'Hemorrhage' },
      { type: 'secondary', secondaryType: 'Avascular' },
    ];

    const currentIndex = tools.findIndex(tool =>
      (tool.type === 'loop' && tool.morphology === selectedMorphology && activeTool === 'select') ||
      (tool.type === 'secondary' && tool.secondaryType === selectedSecondaryType && activeTool === 'secondary')
    );

    const newIndex = currentIndex >= tools.length - 1 ? 0 : currentIndex + 1;
    const newTool = tools[newIndex];

    if (newTool.type === 'loop') {
      setActiveTool('select');
      setSelectedMorphology(newTool.morphology!);
      showNotification(`${newTool.morphology} loop marker selected`);
    } else {
      setActiveTool('secondary');
      setSelectedSecondaryType(newTool.secondaryType!);
      showNotification(`${newTool.secondaryType} marker selected`);
    }
  };

  const handleRulerToggle = () => {
    if (activeTool !== 'measure') {
      // Save current tool and switch to ruler
      setPreviousTool(activeTool);
      setActiveTool('measure');
      showNotification('Ruler tool selected');
    } else {
      // Return to previous tool
      setActiveTool(previousTool);
      if (previousTool === 'select') {
        showNotification(`${selectedMorphology} loop marker selected`);
      } else if (previousTool === 'secondary') {
        showNotification(`${selectedSecondaryType} marker selected`);
      } else {
        showNotification('ROI tool selected');
      }
    }
  };

  // Image enhancement toggle
  const handleToggleEnhancement = async () => {
    if (!image) return;

    try {
      if (!isEnhanced) {
        // Generate enhanced version if not already cached
        if (!enhancedImageUrl) {
          setIsEnhancing(true);
          const enhanced = await enhanceImage(image);
          setEnhancedImageUrl(enhanced);
          setIsEnhancing(false);
        }
        setIsEnhanced(true);
        showNotification('Enhanced view enabled');
      } else {
        setIsEnhanced(false);
        showNotification('Original view restored');
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      setIsEnhancing(false);
      alert('Image enhancement failed. Please try again.');
    }
  };

  // Auto-align function
  const handleAutoAlign = async () => {
    if (!image) return;

    setIsAligning(true);
    try {
      // Create an image element to pass to deskew
      const img = new Image();
      img.src = imageUrl!;
      await new Promise(resolve => { img.onload = resolve; });

      const angle = await calculateSkewAngle(img);
      setRotation(angle); // Set absolute rotation for idempotency
      showNotification(`Auto-aligned: ${angle > 0 ? '+' : ''}${angle.toFixed(1)}°`);
    } catch (error) {
      console.error("Auto-align failed:", error);
      alert("Auto-alignment failed. Please try again.");
    } finally {
      setIsAligning(false);
    }
  };

  // Auto-detection function (disabled for now)
  // const handleAutoDetect = async () => {
  //   if (!image) return;
  //
  //   setIsDetecting(true);
  //   try {
  //     // Create an image element to pass to detection
  //     const img = new Image();
  //     img.src = imageUrl!;
  //     await new Promise(resolve => { img.onload = resolve; });
  //
  //     const detectedLoops = await detectLoops(img, scale);
  //
  //     // Merge with existing loops
  //     const newLoops = [...loops, ...detectedLoops];
  //     handleLoopsChange(newLoops);
  //
  //     // Switch to select tool to see results
  //     setActiveTool('select');
  //   } catch (error) {
  //     console.error("Detection failed:", error);
  //     alert("Auto-detection failed. Please try again.");
  //   } finally {
  //     setIsDetecting(false);
  //   }
  // };

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

    // Clear enhancement cache
    setIsEnhanced(false);
    setEnhancedImageUrl(null);
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
          scale,
          rotation
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
      setRotation(fileEntry.annotations.rotation || 0);
    } else {
      // Reset annotations for new file
      setLoops([]);
      setSecondaries([]);
      setRulers([]);
      setRoi(null);
      setScale(1);
      setRotation(0);
    }

    // Reset enhancement state
    setIsEnhanced(false);
    setEnhancedImageUrl(null);
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
          scale,
          rotation
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
              <div className="relative w-full h-full">
                <NotificationOverlay
                  message={notificationMessage}
                  onDismiss={() => setNotificationMessage(null)}
                />
                <AnnotationCanvas
                  imageUrl={isEnhanced && enhancedImageUrl ? enhancedImageUrl : imageUrl}
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
                  rotation={rotation}
                  selectedMorphology={selectedMorphology}
                  selectedSecondaryType={selectedSecondaryType}
                  hoveredAnnotationId={hoveredAnnotationId}
                />
              </div>
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
          rotation={rotation}
          onRotationChange={setRotation}
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
          isEnhanced={isEnhanced}
          isEnhancing={isEnhancing}
          onToggleEnhancement={handleToggleEnhancement}
          hasImage={!!image}
          onAutoAlign={handleAutoAlign}
          isAligning={isAligning}
        />
      </div>
    </div>
  );
}

export default App;
