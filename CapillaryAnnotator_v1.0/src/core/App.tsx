import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageUpload } from '../features/files/components/ImageUpload';
import { AnnotationCanvas } from '../features/annotation/components/AnnotationCanvas';
import { Sidebar } from '../shared/components/Sidebar';
import { FileBrowser } from '../features/files/components/FileBrowser';
import { MorphologyTally } from '../features/morphology/components/MorphologyTally';
import { NotificationOverlay } from '../shared/components/NotificationOverlay';
import type { Loop, FileEntry, SecondaryAnnotation, Polygon } from '../shared/types';
import { generateZipArchive } from '../features/export/utils/zipExport';
import { useCapillaryData } from '../shared/hooks/useCapillaryData';
import { useProjectFiles } from '../shared/hooks/useProjectFiles';
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { updateLoopClassifications } from '../features/annotation/utils/geometry';
import { generateBatchPDF } from '../features/export/utils/pdfExport';
import { saveFile } from '../shared/utils/fileSaver';
import { enhanceImage, applyClaheOnly } from '../features/annotation/utils/imageEnhancement';
import { calculateSkewAngle } from '../features/annotation/utils/deskew';
import { generateLabelMeJSON } from '../shared/utils/labelmeExport';
import { generateTextReport } from '../features/export/utils/textReportExport';
import { generateClinicalReport } from '../features/export/utils/clinicalReportExport';

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'roi' | 'measure' | 'secondary'>('select');

  // -- Unified State Hooks --
  const {
    state: annotationState,
    actions: annotationActions,
    history: undoHistory
  } = useCapillaryData();

  const {
    loops, secondaries, roi, rulers, polygons, scale, rotation
  } = annotationState;

  const {
    setLoops, setSecondaries, setRoi, setRulers, setPolygons, setScale, setRotation, reset: resetAnnotations
  } = annotationActions;

  const [selectedMorphology, setSelectedMorphology] = useState<Loop['morphology']>('Normal');
  const [selectedSecondaryType, setSelectedSecondaryType] = useState<SecondaryAnnotation['type']>('Hemorrhage');
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  const {
    files,
    currentFileIndex,
    patientId,
    subdirectories,
    selectedSubdirectory,
    setSelectedSubdirectory,
    loadDirectory,
    selectFile: selectProjectFile,
    updateFile,
    hasFiles,
    nextFile,
    prevFile
  } = useProjectFiles();

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [fileBrowserHeight, setFileBrowserHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [previousTool, setPreviousTool] = useState<'select' | 'roi' | 'secondary'>('select');
  const [enhancementType, setEnhancementType] = useState<'none' | 'full' | 'clahe'>('none');
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAligning, setIsAligning] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [hue, setHue] = useState(0);
  const [annotationMode, setAnnotationMode] = useState<'simple' | 'polygon'>('simple');
  const [activePolygon, setActivePolygon] = useState<Polygon | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);
      const img = new Image();
      img.onload = () => setImageDimensions({ width: img.width, height: img.height });
      img.src = url;
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

  const showNotification = useCallback((message: string) => {
    setNotificationMessage(message);
  }, []);

  const saveCurrentAnnotations = useCallback(() => {
    if (currentFileIndex >= 0 && hasFiles) {
      updateFile(currentFileIndex, {
        isAnnotated: loops.length > 0 || secondaries.length > 0 || rulers.length > 0 || (polygons && polygons.length > 0) || roi !== null,
        annotations: { loops, secondaries, rulers, polygons, roi, scale, rotation }
      });
    }
  }, [currentFileIndex, hasFiles, loops, secondaries, rulers, polygons, roi, scale, rotation, updateFile]);

  const handlePreviousImage = useCallback(() => {
    if (!hasFiles) return showNotification('No images loaded');
    saveCurrentAnnotations();
    const prev = prevFile();
    if (prev) {
      loadFile(files.indexOf(prev), files);
      showNotification(`Image "${prev.filename}" selected`);
    }
  }, [hasFiles, prevFile, saveCurrentAnnotations, showNotification, files]);

  const handleNextImage = useCallback(() => {
    if (!hasFiles) return showNotification('No images loaded');
    saveCurrentAnnotations();
    const next = nextFile();
    if (next) {
      loadFile(files.indexOf(next), files);
      showNotification(`Image "${next.filename}" selected`);
    }
  }, [hasFiles, nextFile, saveCurrentAnnotations, showNotification, files]);

  const handlePreviousTool = useCallback(() => {
    if (annotationMode === 'polygon') return;
    const tools: Array<{ type: 'loop' | 'secondary'; morphology?: Loop['morphology']; secondaryType?: SecondaryAnnotation['type'] }> = [
      { type: 'loop', morphology: 'Normal' }, { type: 'loop', morphology: 'Tortuous' }, { type: 'loop', morphology: 'Enlarged' }, { type: 'loop', morphology: 'Giant' }, { type: 'loop', morphology: 'Ramified' }, { type: 'loop', morphology: 'Bizarre' }, { type: 'secondary', secondaryType: 'Hemorrhage' }, { type: 'secondary', secondaryType: 'Avascular' },
    ];
    const currentIndex = tools.findIndex(tool => (tool.type === 'loop' && tool.morphology === selectedMorphology && activeTool === 'select') || (tool.type === 'secondary' && tool.secondaryType === selectedSecondaryType && activeTool === 'secondary'));
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
  }, [annotationMode, selectedMorphology, activeTool, selectedSecondaryType, showNotification]);

  const handleNextTool = useCallback(() => {
    if (annotationMode === 'polygon') return;
    const tools: Array<{ type: 'loop' | 'secondary'; morphology?: Loop['morphology']; secondaryType?: SecondaryAnnotation['type'] }> = [
      { type: 'loop', morphology: 'Normal' }, { type: 'loop', morphology: 'Tortuous' }, { type: 'loop', morphology: 'Enlarged' }, { type: 'loop', morphology: 'Giant' }, { type: 'loop', morphology: 'Ramified' }, { type: 'loop', morphology: 'Bizarre' }, { type: 'secondary', secondaryType: 'Hemorrhage' }, { type: 'secondary', secondaryType: 'Avascular' },
    ];
    const currentIndex = tools.findIndex(tool => (tool.type === 'loop' && tool.morphology === selectedMorphology && activeTool === 'select') || (tool.type === 'secondary' && tool.secondaryType === selectedSecondaryType && activeTool === 'secondary'));
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
  }, [annotationMode, selectedMorphology, activeTool, selectedSecondaryType, showNotification]);

  const handleRulerToggle = useCallback(() => {
    if (activeTool !== 'measure') {
      setPreviousTool(activeTool);
      setActiveTool('measure');
      showNotification('Ruler tool selected');
    } else {
      setActiveTool(previousTool);
      showNotification(previousTool === 'select' ? `${selectedMorphology} loop marker selected` : previousTool === 'secondary' ? `${selectedSecondaryType} marker selected` : 'ROI tool selected');
    }
  }, [activeTool, previousTool, selectedMorphology, selectedSecondaryType, showNotification]);

  useKeyboardShortcuts({
    onPreviousImage: handlePreviousImage,
    onNextImage: handleNextImage,
    onUndo: () => { if (undoHistory.canUndo) { undoHistory.undo(); showNotification("Undo"); } },
    onRedo: () => { if (undoHistory.canRedo) undoHistory.redo(); },
    onPreviousTool: handlePreviousTool,
    onNextTool: handleNextTool,
    onToggleRuler: handleRulerToggle,
    canUndo: undoHistory.canUndo,
    canRedo: undoHistory.canRedo
  });

  const getCurrentExportFiles = useCallback(() => {
    if (files.length === 0) return [];
    const exportFiles = [...files];
    if (currentFileIndex >= 0 && currentFileIndex < files.length) {
      exportFiles[currentFileIndex] = {
        ...exportFiles[currentFileIndex],
        annotations: { loops, secondaries, rulers, polygons, roi, scale, rotation }
      };
    }
    return exportFiles;
  }, [files, currentFileIndex, loops, secondaries, rulers, polygons, roi, scale, rotation]);

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
    const exportData = { imageName: image?.name, scale, roi, loops, secondaries, rulers };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    await saveFile(blob, 'capillary_data.json', [{ description: 'JSON Data', accept: { 'application/json': ['.json'] } }]);
  };

  const handleExportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filename = getFilenameWithoutExtension();
      await saveFile(blob, `${filename}_annotated.png`, [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]);
    });
  };

  const handleDeleteLoop = (id: string) => setLoops(loops.filter(loop => loop.id !== id));
  const handleDeleteSecondary = (id: string) => setSecondaries(secondaries.filter(s => s.id !== id));
  const handleDeleteRuler = (id: string) => setRulers(rulers.filter(ruler => ruler.id !== id));
  const handleDeletePolygon = (id: string) => {
    setPolygons(polygons.filter(p => p.id !== id));
    if (activePolygon && activePolygon.id === id) setActivePolygon(null);
  };

  const handleToggleEnhancement = async (type: 'full' | 'clahe') => {
    if (!image) return;
    try {
      if (enhancementType !== type) {
        setIsEnhancing(true);
        // Only re-process if we don't already have an enhanced image, or if switching types
        // Actually, we should re-process if switching between 'full' and 'clahe'
        // Simplified: just always clear and re-process if switching to a new active enhancement
        let result: string;
        if (type === 'clahe') {
          result = await applyClaheOnly(image);
        } else {
          result = await enhanceImage(image);
        }
        setEnhancedImageUrl(result);
        setEnhancementType(type);
        setIsEnhancing(false);
        showNotification(`${type === 'full' ? 'Full Enhancement' : 'CLAHE'} enabled`);
      } else {
        setEnhancementType('none');
        showNotification('Original view restored');
      }
    } catch (error) { console.error(error); setIsEnhancing(false); alert('Enhancement failed.'); }
  };

  const handleAutoAlign = async () => {
    if (!image) return;
    setIsAligning(true);
    try {
      const img = new Image();
      img.src = imageUrl!;
      await new Promise(resolve => { img.onload = resolve; });
      const angle = await calculateSkewAngle(img);
      setRotation(angle);
      showNotification(`Auto-aligned: ${angle.toFixed(1)}°`);
    } catch (error) { console.error(error); alert("Auto-align failed."); }
    finally { setIsAligning(false); }
  };

  const handleChangeImage = () => {
    if ((loops.length > 0 || secondaries.length > 0 || rulers.length > 0 || roi !== null) && !window.confirm('Clear annotations?')) return;
    setImage(null); setImageUrl(null); setLoops([]); setSecondaries([]); setRulers([]); setRoi(null); setEnhancementType('none'); setEnhancedImageUrl(null);
  };

  const handleDirectorySelect = (newFiles: FileEntry[], patientIdentifier: string, subdirs: string[]) => {
    loadDirectory(newFiles, patientIdentifier, subdirs);
    if (newFiles.length > 0) loadFile(0, newFiles);
  };

  const loadFile = (index: number, fileList: FileEntry[] = files) => {
    if (index < 0 || index >= fileList.length) return;
    const fileEntry = fileList[index];
    setImage(fileEntry.file);
    selectProjectFile(index);
    if (fileEntry.annotations) resetAnnotations(fileEntry.annotations);
    else resetAnnotations();
    setEnhancementType('none'); setEnhancedImageUrl(null); setBrightness(0); setContrast(0); setHue(0);
  };

  const handleBatchPDFExport = async () => {
    const exportFiles = getCurrentExportFiles();
    if (exportFiles.length === 0) return alert('No files loaded.');
    try { await generateBatchPDF(exportFiles, patientId || 'Unknown Patient'); }
    catch (error) { console.error(error); alert('Error generating PDF.'); }
  };

  const handleTextReportExport = async () => {
    const exportFiles = getCurrentExportFiles();
    if (exportFiles.length === 0) return alert('No files loaded.');
    try { await generateTextReport(exportFiles, patientId || 'Unknown Patient'); showNotification("Text report exported successfully!"); }
    catch (error) { console.error(error); alert('Error generating text report.'); }
  };

  const handleClinicalReportExport = async () => {
    const exportFiles = getCurrentExportFiles();
    if (exportFiles.length === 0) return alert('No files loaded.');
    try { await generateClinicalReport(exportFiles, patientId || 'Unknown Patient'); showNotification("Clinical report exported successfully!"); }
    catch (error) { console.error(error); alert('Error generating clinical report.'); }
  };

  const handleBatchImageExport = async () => {
    const exportFiles = getCurrentExportFiles();
    if (exportFiles.length === 0) return alert('No files loaded.');
    try { await generateZipArchive(exportFiles, patientId || 'Unknown Patient'); showNotification("Annotated images exported successfully!"); }
    catch (error) { console.error(error); alert('Error generating ZIP archive.'); }
  };

  const handleExportLabelMe = async () => {
    if (!image) return;
    const labelMeData = generateLabelMeJSON(getFilenameWithoutExtension() + '.jpg', imageDimensions.width, imageDimensions.height, polygons);
    await saveFile(new Blob([JSON.stringify(labelMeData, null, 2)], { type: 'application/json' }), `${getFilenameWithoutExtension()}_labelme.json`, [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]);
    showNotification("LabelMe JSON exported successfully!");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold">Nailfold Capillaroscopy Annotator</h1>
        {image && <button onClick={handleChangeImage} className="text-sm text-gray-400 hover:text-white">Change Image</button>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col border-r border-gray-700 w-48">
          <div style={{ height: `${fileBrowserHeight}px` }} className="flex-shrink-0 overflow-hidden">
            <FileBrowser
              files={files}
              currentFileIndex={currentFileIndex}
              patientId={patientId}
              subdirectories={subdirectories}
              selectedSubdirectory={selectedSubdirectory}
              onFileSelect={(i) => { saveCurrentAnnotations(); loadFile(i); }}
              onDirectorySelect={handleDirectorySelect}
              onSubdirectoryChange={setSelectedSubdirectory}
            />
          </div>

          <div
            className={`h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
            onMouseDown={(e) => {
              setIsResizing(true);
              const startY = e.clientY;
              const startHeight = fileBrowserHeight;
              const move = (e: MouseEvent) => setFileBrowserHeight(Math.max(200, Math.min(window.innerHeight - 300, startHeight + e.clientY - startY)));
              const up = () => { setIsResizing(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
              document.addEventListener('mousemove', move);
              document.addEventListener('mouseup', up);
            }}
          />

          <div className="flex-1 overflow-hidden">
            <MorphologyTally loops={loops} secondaries={secondaries} />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-hidden relative" ref={containerRef}>
            {!imageUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-4">
                <div className="max-w-xl w-full"><ImageUpload onImageUpload={setImage} /></div>
                <button onClick={() => setImageUrl('/demo.png')} className="text-blue-400 hover:text-blue-300 underline">Load Demo Image</button>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <NotificationOverlay message={notificationMessage} onDismiss={() => setNotificationMessage(null)} />
                <AnnotationCanvas
                  imageUrl={enhancementType !== 'none' && enhancedImageUrl ? enhancedImageUrl : imageUrl}
                  filename={getFilenameWithoutExtension()}
                  width={canvasSize.width} height={canvasSize.height}
                  activeTool={activeTool} roi={roi} onRoiChange={setRoi}
                  loops={loops} onLoopsChange={handleLoopsChange}
                  secondaries={secondaries} onSecondariesChange={setSecondaries}
                  rulers={rulers} onRulersChange={setRulers}
                  scale={scale} rotation={rotation}
                  brightness={brightness} contrast={contrast} hue={hue}
                  selectedMorphology={selectedMorphology}
                  selectedSecondaryType={selectedSecondaryType}
                  hoveredAnnotationId={hoveredAnnotationId}
                  annotationMode={annotationMode}
                  polygons={polygons} onPolygonsChange={setPolygons}
                  activePolygon={activePolygon} onActivePolygonChange={setActivePolygon}
                />
              </div>
            )}
          </main>
        </div>

        <Sidebar
          activeTool={activeTool} setActiveTool={setActiveTool}
          loops={loops} secondaries={secondaries} rulers={rulers}
          scale={scale} onScaleChange={setScale}
          rotation={rotation} onRotationChange={setRotation}
          brightness={brightness} onBrightnessChange={setBrightness}
          contrast={contrast} onContrastChange={setContrast}
          hue={hue} onHueChange={setHue}
          selectedMorphology={selectedMorphology} onMorphologyChange={setSelectedMorphology}
          selectedSecondaryType={selectedSecondaryType} onSecondaryTypeChange={setSelectedSecondaryType}
          onDeleteLoop={handleDeleteLoop} onDeleteSecondary={handleDeleteSecondary} onDeleteRuler={handleDeleteRuler}
          onExport={handleExport} onExportImage={handleExportImage}
          onBatchPDFExport={handleBatchPDFExport} onExportTextReport={handleTextReportExport}
          onExportClinicalReport={handleClinicalReportExport} onBatchImageExport={handleBatchImageExport}
          hasMultipleFiles={files.length > 0} onHoverAnnotation={setHoveredAnnotationId}
          enhancementType={enhancementType} isEnhancing={isEnhancing} onToggleEnhancement={handleToggleEnhancement}
          hasImage={!!image} onAutoAlign={handleAutoAlign} isAligning={isAligning}
          annotationMode={annotationMode} setAnnotationMode={setAnnotationMode}
          polygons={polygons} onDeletePolygon={handleDeletePolygon}
          onExportLabelMe={handleExportLabelMe}
        />
      </div>
    </div>
  );
}

export default App;
