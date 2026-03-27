import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { Loop, ROI, RulerLine, SecondaryAnnotation, Polygon } from '../../../shared/types';
import { CanvasImage } from './canvas/CanvasImage';
import { LoopLayer } from './canvas/LoopLayer';
import { SecondaryLayer } from './canvas/SecondaryLayer';
import { PolygonLayer } from './canvas/PolygonLayer';
import { RulerLayer } from './canvas/RulerLayer';
import { MORPHOLOGY_COLORS, SECONDARY_COLORS } from '../../../shared/constants';

interface AnnotationCanvasProps {
    imageUrl: string;
    filename: string;
    width: number;
    height: number;
    activeTool: 'select' | 'roi' | 'measure' | 'secondary';
    roi: ROI | null;
    onRoiChange: (roi: ROI | null) => void;
    loops: Loop[];
    onLoopsChange: (loops: Loop[]) => void;
    secondaries: SecondaryAnnotation[];
    onSecondariesChange: (secondaries: SecondaryAnnotation[]) => void;
    rulers: RulerLine[];
    onRulersChange: (rulers: RulerLine[]) => void;
    scale: number; // Pixels per micron
    selectedMorphology: Loop['morphology'];
    selectedSecondaryType: SecondaryAnnotation['type'];
    hoveredAnnotationId: string | null;
    rotation?: number;
    brightness: number;
    contrast: number;
    hue: number;
    annotationMode: 'simple' | 'polygon';
    polygons: Polygon[];
    onPolygonsChange: (polygons: Polygon[]) => void;
    activePolygon: Polygon | null;
    onActivePolygonChange: (polygon: Polygon | null) => void;
}


export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
    imageUrl,
    filename,
    width,
    height,
    activeTool,
    roi,
    onRoiChange,
    loops,
    onLoopsChange,
    secondaries,
    onSecondariesChange,
    rulers,
    onRulersChange,
    scale,
    selectedMorphology,
    selectedSecondaryType,
    hoveredAnnotationId,
    rotation = 0,
    brightness,
    contrast,
    hue,
    annotationMode,
    polygons,
    onPolygonsChange,
    activePolygon,
    onActivePolygonChange
}) => {
    // We need useImage here just to get dimensions for centering logic
    const [image] = useImage(imageUrl);
    const stageRef = useRef<Konva.Stage>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [scaleBarPos, setScaleBarPos] = useState<{ x: number; y: number } | null>(null);
    const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
    const [labelPos, setLabelPos] = useState({ x: 20, y: 20 });
    const isDragging = useRef(false);
    const lastPointerPos = useRef<{ x: number; y: number } | null>(null);
    const [isHoveringStartPoint, setIsHoveringStartPoint] = useState(false);
    const [isHoveringScaleBar, setIsHoveringScaleBar] = useState(false);

    // Generate dynamic cursor based on active tool
    const cursorStyle = React.useMemo(() => {
        if (isHoveringScaleBar) {
            return 'grab';
        }
        if (activeTool === 'measure' || activeTool === 'roi') {
            return 'crosshair';
        }

        const createSvgCursor = (color: string, type: 'circle' | 'square' | 'diamond') => {
            const svg = `
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="black" flood-opacity="0.5"/>
                    </filter>
                    ${type === 'circle'
                    ? `<circle cx="12" cy="12" r="5" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>`
                    : type === 'diamond'
                        ? `<rect x="12" y="12" width="10" height="10" transform="translate(0 -7) rotate(45 12 12)" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>`
                        : `<rect x="7" y="7" width="10" height="10" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>`
                }
                    <line x1="12" y1="4" x2="12" y2="20" stroke="white" stroke-width="1" stroke-opacity="0.5" />
                    <line x1="4" y1="12" x2="20" y2="12" stroke="white" stroke-width="1" stroke-opacity="0.5" />
                </svg>
            `.trim();
            return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 12 12, auto`;
        };

        if (activeTool === 'select') {
            const color = MORPHOLOGY_COLORS[selectedMorphology];
            return createSvgCursor(color, 'circle');
        }

        if (activeTool === 'secondary') {
            const color = SECONDARY_COLORS[selectedSecondaryType];
            return createSvgCursor(color, selectedSecondaryType === 'Hemorrhage' ? 'diamond' : 'square');
        }

        if (annotationMode === 'polygon') {
            const color = MORPHOLOGY_COLORS[selectedMorphology];
            return createSvgCursor(color, 'circle');
        }

        return 'default';
    }, [activeTool, selectedMorphology, selectedSecondaryType, annotationMode, isHoveringScaleBar]);

    const lastImageUrl = useRef<string | null>(null);

    // Zoom-to-fit logic on image load
    useEffect(() => {
        if (image && imageUrl !== lastImageUrl.current && width > 0 && height > 0) {
            const padding = 40;
            const availableWidth = width - padding;
            const availableHeight = height - padding;

            const scaleX = availableWidth / image.width;
            const scaleY = availableHeight / image.height;
            
            // Choose the smaller scale to fit the whole image
            const fitScale = Math.min(scaleX, scaleY, 1);

            setStageScale(fitScale);
            setStagePos({
                x: (width - image.width * fitScale) / 2,
                y: (height - image.height * fitScale) / 2
            });

            lastImageUrl.current = imageUrl;
        }
    }, [image, imageUrl, width, height]);

    // Reset ruler start point when switching away from measure tool
    useEffect(() => {
        if (activeTool !== 'measure') {
            setRulerStart(null);
        }
    }, [activeTool]);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Only allow stage dragging if the active tool is not one that places annotations
        // and if the click is on the stage itself or the background image.
        const target = e.target;
        const targetType = target.getType();
        const targetClassName = target.getClassName();
        const isClickable = targetType === 'Stage' || targetClassName === 'Image';

        if (isClickable) {
            isDragging.current = false; // Reset drag flag
            lastPointerPos.current = stage.getPointerPosition();
        }
    }, []);

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Polygon closing hover detection
        if (annotationMode === 'polygon' && activePolygon && activePolygon.points.length > 2) {
            const group = stage.findOne('.imageGroup');
            if (group) {
                const transform = group.getAbsoluteTransform().copy();
                transform.invert();
                const pointer = transform.point(stage.getPointerPosition() || { x: 0, y: 0 });

                const firstPoint = activePolygon.points[0];
                const distanceToStart = Math.sqrt(
                    Math.pow(pointer.x - firstPoint.x, 2) + Math.pow(pointer.y - firstPoint.y, 2)
                );

                // Check if within 10px (scaled)
                const isHovering = distanceToStart < (10 / stageScale);
                if (isHovering !== isHoveringStartPoint) {
                    setIsHoveringStartPoint(isHovering);
                }
            }
        } else if (isHoveringStartPoint) {
            setIsHoveringStartPoint(false);
        }

        if (!lastPointerPos.current) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const dx = pointer.x - lastPointerPos.current.x;
        const dy = pointer.y - lastPointerPos.current.y;

        // Only move if distance is significant (prevent micro-movements from blocking clicks)
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            isDragging.current = true;
            setStagePos(prevPos => ({
                x: prevPos.x + dx,
                y: prevPos.y + dy,
            }));
            lastPointerPos.current = pointer;
        }
    }, [annotationMode, activePolygon, stageScale, isHoveringStartPoint]);

    const handleMouseUp = useCallback(() => {
        lastPointerPos.current = null;
        // Don't reset isDragging.current here, we need to check it in onClick
        // It will be reset on next mouseDown
    }, []);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Allow clicks on Stage or the background Image, but not on interactive elements (rulers, loops, ROI)
        // Exception: allow clicks anywhere when hovering over polygon start point (to close polygon)
        const target = e.target;
        const targetType = target.getType();
        const targetClassName = target.getClassName();
        const isClickable = targetType === 'Stage' || targetClassName === 'Image';

        // Special case: allow clicking to close polygon when start point is highlighted
        const isClosingPolygon = annotationMode === 'polygon' && activePolygon && isHoveringStartPoint;

        if ((!isClickable && !isClosingPolygon) || isDragging.current) { // Prevent click actions if dragged
            return;
        }

        const stage = e.target.getStage();
        if (!stage) return;

        // Get pointer relative to the image (accounting for zoom/pan AND rotation)
        // We need to transform the pointer from Stage coordinates to the Group's local coordinates
        // The Group handles the rotation around the image center

        // Find the group node
        const group = stage.findOne('.imageGroup');
        if (!group) return;

        const transform = group.getAbsoluteTransform().copy();
        transform.invert();
        const pointer = transform.point(stage.getPointerPosition() || { x: 0, y: 0 });

        if (annotationMode === 'polygon') {
            if (!activePolygon) {
                // Start new polygon
                const newPolygon: Polygon = {
                    id: crypto.randomUUID(),
                    points: [{ x: pointer.x, y: pointer.y }],
                    label: selectedMorphology, // Use selected morphology as label
                    morphology: selectedMorphology,
                    isClosed: false
                };
                onActivePolygonChange(newPolygon);
            } else {
                // Close polygon if hovering over start point
                if (activePolygon.points.length > 2 && isHoveringStartPoint) {
                    const closedPolygon = { ...activePolygon, isClosed: true };
                    onPolygonsChange([...polygons, closedPolygon]);
                    onActivePolygonChange(null);
                    setIsHoveringStartPoint(false); // Reset hover state
                } else {
                    // Add point
                    onActivePolygonChange({
                        ...activePolygon,
                        points: [...activePolygon.points, { x: pointer.x, y: pointer.y }]
                    });
                }
            }
            return;
        }

        if (activeTool === 'roi') {
            if (!roi) {
                onRoiChange({ x: pointer.x, y: pointer.y });
            }
            return;
        }

        if (activeTool === 'select') {
            const newLoop: Loop = {
                id: crypto.randomUUID(),
                x: pointer.x,
                y: pointer.y,
                morphology: selectedMorphology,
                diameter: 10,
                isOutermost: false
            };
            onLoopsChange([...loops, newLoop]);
            return;
        }

        if (activeTool === 'secondary') {
            const newSecondary: SecondaryAnnotation = {
                id: crypto.randomUUID(),
                x: pointer.x,
                y: pointer.y,
                type: selectedSecondaryType
            };
            onSecondariesChange([...secondaries, newSecondary]);
            return;
        }

        if (activeTool === 'measure') {
            if (!rulerStart) {
                // First click: set start point
                setRulerStart({ x: pointer.x, y: pointer.y });
            } else {
                // Second click: complete the ruler
                const newRuler: RulerLine = {
                    id: crypto.randomUUID(),
                    x1: rulerStart.x,
                    y1: rulerStart.y,
                    x2: pointer.x,
                    y2: pointer.y
                };
                onRulersChange([...rulers, newRuler]);
                setRulerStart(null); // Reset for next ruler
            }
        }
    };

    // Helper to rotate a point around a center
    const getRotatedPoint = (point: { x: number, y: number }, center: { x: number, y: number }, angleDeg: number) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: dx * Math.cos(angleRad) - dy * Math.sin(angleRad) + center.x,
            y: dx * Math.sin(angleRad) + dy * Math.cos(angleRad) + center.y
        };
    };

    return (
        <div className="bg-gray-900 overflow-hidden">
            <Stage
                width={width}
                height={height}
                onWheel={handleWheel}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                onClick={handleStageClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                ref={stageRef}
                style={{ cursor: cursorStyle }}
            >
                <Layer>
                    <Group
                        name="imageGroup"
                        x={image ? image.width / 2 : 0}
                        y={image ? image.height / 2 : 0}
                        offsetX={image ? image.width / 2 : 0}
                        offsetY={image ? image.height / 2 : 0}
                        rotation={rotation}
                    >
                        <CanvasImage
                            imageUrl={imageUrl}
                            brightness={brightness}
                            contrast={contrast}
                            hue={hue}
                        />

                        <SecondaryLayer
                            secondaries={secondaries}
                            hoveredAnnotationId={hoveredAnnotationId}
                            stageScale={stageScale}
                            activeTool={activeTool}
                            onSecondariesChange={onSecondariesChange}
                        />

                        <LoopLayer
                            loops={loops}
                            hoveredAnnotationId={hoveredAnnotationId}
                            stageScale={stageScale}
                            activeTool={activeTool}
                            onLoopsChange={onLoopsChange}
                        />

                        <RulerLayer
                            rulers={rulers}
                            scale={scale}
                            stageScale={stageScale}
                            activeTool={activeTool}
                            rulerStart={rulerStart}
                            onRulersChange={onRulersChange}
                        />

                        <PolygonLayer
                            polygons={polygons}
                            activePolygon={activePolygon}
                            stageScale={stageScale}
                            isHoveringStartPoint={isHoveringStartPoint}
                        />
                    </Group>

                    {/* ROI Box - Rendered OUTSIDE the rotating group to stay screen-aligned */}
                    {roi && image && (
                        <Rect
                            x={getRotatedPoint(roi, { x: image.width / 2, y: image.height / 2 }, rotation).x}
                            y={getRotatedPoint(roi, { x: image.width / 2, y: image.height / 2 }, rotation).y}
                            width={1000 * scale}
                            height={1000 * scale}
                            stroke="yellow"
                            strokeWidth={2 / stageScale}
                            draggable={activeTool === 'roi'}
                            listening={activeTool === 'roi'}
                            onDragEnd={(e) => {
                                // Transform drag position back to image coordinates (inverse rotation)
                                const currentPos = { x: e.target.x(), y: e.target.y() };
                                const center = { x: image.width / 2, y: image.height / 2 };
                                const originalPos = getRotatedPoint(currentPos, center, -rotation);

                                onRoiChange({
                                    x: originalPos.x,
                                    y: originalPos.y
                                });
                            }}
                        />
                    )}

                    {/* Filename Label */}
                    <Group
                        x={labelPos.x}
                        y={labelPos.y}
                        draggable
                        onDragEnd={(e) => {
                            setLabelPos({ x: e.target.x(), y: e.target.y() });
                        }}
                    >
                        <Rect
                            x={0}
                            y={0}
                            width={filename.length * 8 + 20}
                            height={30}
                            fill="rgba(0, 0, 0, 0.6)"
                            cornerRadius={4}
                        />
                        <KonvaText
                            x={10}
                            y={8}
                            text={filename}
                            fontSize={14}
                            fill="white"
                            fontFamily="Arial"
                        />
                    </Group>

                    {/* Scale Bar - Movable visual reference */}
                    {scale > 0 && (
                        <Group
                            x={scaleBarPos ? scaleBarPos.x : (width - stagePos.x) / stageScale - (100 * scale) - (30 / stageScale)}
                            y={scaleBarPos ? scaleBarPos.y : (height - stagePos.y) / stageScale - (40 / stageScale)}
                            draggable
                            onDragEnd={(e) => {
                                setScaleBarPos({ x: e.target.x(), y: e.target.y() });
                            }}
                            onMouseEnter={() => setIsHoveringScaleBar(true)}
                            onMouseLeave={() => setIsHoveringScaleBar(false)}
                        >
                            {/* Hit area for dragging */}
                            <Rect
                                x={-20 / stageScale}
                                y={-30 / stageScale}
                                width={(100 * scale) + (40 / stageScale)}
                                height={60 / stageScale}
                                fill="black"
                                opacity={0}
                            />
                            <Rect
                                x={0}
                                y={5 / stageScale}
                                width={100 * scale}
                                height={3 / stageScale}
                                fill="white"
                                shadowColor="black"
                                shadowBlur={2 / stageScale}
                                shadowOpacity={0.8}
                            />
                            <KonvaText
                                x={0}
                                y={-12 / stageScale}
                                text="100 µm"
                                fontSize={14 / stageScale}
                                fontStyle="bold"
                                fill="white"
                                shadowColor="black"
                                shadowBlur={2 / stageScale}
                                shadowOpacity={0.8}
                            />
                        </Group>
                    )}
                </Layer>
            </Stage>
        </div>
    );
};
