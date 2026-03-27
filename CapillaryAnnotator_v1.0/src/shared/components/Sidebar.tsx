import React from 'react';
import type { Loop, RulerLine, SecondaryAnnotation, Polygon } from '../types';
import { AnnotationTools } from '../../features/sidebar/components/AnnotationTools';
import { CalibrationPanel } from '../../features/sidebar/components/CalibrationPanel';
import { ImageControls } from '../../features/sidebar/components/ImageControls';
import { AnnotationList } from '../../features/sidebar/components/AnnotationList';
import { ExportPanel } from '../../features/sidebar/components/ExportPanel';

interface SidebarProps {
    activeTool: 'select' | 'roi' | 'measure' | 'secondary';
    setActiveTool: (tool: 'select' | 'roi' | 'measure' | 'secondary') => void;
    loops: Loop[];
    secondaries: SecondaryAnnotation[];
    rulers: RulerLine[];
    scale: number;
    onScaleChange: (scale: number) => void;
    rotation: number;
    onRotationChange: (rotation: number) => void;
    brightness: number;
    onBrightnessChange: (brightness: number) => void;
    contrast: number;
    onContrastChange: (contrast: number) => void;
    hue: number;
    onHueChange: (hue: number) => void;
    selectedMorphology: Loop['morphology'];
    onMorphologyChange: (morphology: Loop['morphology']) => void;
    selectedSecondaryType: SecondaryAnnotation['type'];
    onSecondaryTypeChange: (type: SecondaryAnnotation['type']) => void;
    onDeleteLoop: (id: string) => void;
    onDeleteSecondary: (id: string) => void;
    onDeleteRuler: (id: string) => void;
    onExport: () => void;
    onExportImage: () => void;
    onBatchPDFExport: () => void;
    onBatchImageExport: () => void;
    hasMultipleFiles: boolean;
    onHoverAnnotation: (id: string | null) => void;
    enhancementType: 'none' | 'full' | 'clahe';
    isEnhancing: boolean;
    onToggleEnhancement: (type: 'full' | 'clahe') => void;
    hasImage: boolean;
    onAutoAlign: () => void;
    isAligning: boolean;
    annotationMode: 'simple' | 'polygon';
    setAnnotationMode: (mode: 'simple' | 'polygon') => void;
    polygons: Polygon[];
    onDeletePolygon: (id: string) => void;
    onExportLabelMe: () => void;
    onExportTextReport: () => void;
    onExportClinicalReport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    return (
        <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col h-full text-white">
            <AnnotationTools
                activeTool={props.activeTool}
                setActiveTool={props.setActiveTool}
                annotationMode={props.annotationMode}
                setAnnotationMode={props.setAnnotationMode}
                selectedMorphology={props.selectedMorphology}
                onMorphologyChange={props.onMorphologyChange}
                selectedSecondaryType={props.selectedSecondaryType}
                onSecondaryTypeChange={props.onSecondaryTypeChange}
            />

            <CalibrationPanel
                scale={props.scale}
                onScaleChange={props.onScaleChange}
            />

            <ImageControls
                rotation={props.rotation}
                onRotationChange={props.onRotationChange}
                onAutoAlign={props.onAutoAlign}
                isAligning={props.isAligning}
                hasImage={props.hasImage}
                brightness={props.brightness}
                onBrightnessChange={props.onBrightnessChange}
                contrast={props.contrast}
                onContrastChange={props.onContrastChange}
                hue={props.hue}
                onHueChange={props.onHueChange}
            />

            <AnnotationList
                annotationMode={props.annotationMode}
                loops={props.loops}
                secondaries={props.secondaries}
                rulers={props.rulers}
                polygons={props.polygons}
                scale={props.scale}
                onDeleteLoop={props.onDeleteLoop}
                onDeleteSecondary={props.onDeleteSecondary}
                onDeleteRuler={props.onDeleteRuler}
                onDeletePolygon={props.onDeletePolygon}
                onHoverAnnotation={props.onHoverAnnotation}
            />

            <ExportPanel
                onExport={props.onExport}
                onExportImage={props.onExportImage}
                onBatchPDFExport={props.onBatchPDFExport}
                onBatchImageExport={props.onBatchImageExport}
                onExportLabelMe={props.onExportLabelMe}
                onExportTextReport={props.onExportTextReport}
                onExportClinicalReport={props.onExportClinicalReport}
                hasMultipleFiles={props.hasMultipleFiles}
                annotationMode={props.annotationMode}
                onToggleEnhancement={props.onToggleEnhancement}
                enhancementType={props.enhancementType}
                isEnhancing={props.isEnhancing}
                hasImage={props.hasImage}
            />
        </div>
    );
};
