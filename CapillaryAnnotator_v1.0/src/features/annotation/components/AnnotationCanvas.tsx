import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Group, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { Loop, ROI, RulerLine, SecondaryAnnotation } from '../../../shared/types';
import { RulerTool } from '../../measurement/components/RulerTool';
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
    hue
}) => {
    const [image] = useImage(imageUrl);
    const stageRef = useRef<Konva.Stage>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
    const [labelPos, setLabelPos] = useState({ x: 20, y: 20 });
    const isDragging = useRef(false);
    const lastPointerPos = useRef<{ x: number; y: number } | null>(null);

    // Generate dynamic cursor based on active tool
    const cursorStyle = React.useMemo(() => {
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

        return 'default';
    }, [activeTool, selectedMorphology, selectedSecondaryType]);

    // Reset zoom/pan when image changes
    useEffect(() => {
        setStageScale(1);
        setStagePos({ x: 0, y: 0 });
    }, [imageUrl]);

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
        if (!lastPointerPos.current) return;

        const stage = e.target.getStage();
        if (!stage) return;

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
    }, []);

    const handleMouseUp = useCallback(() => {
        lastPointerPos.current = null;
        // Don't reset isDragging.current here, we need to check it in onClick
        // It will be reset on next mouseDown
    }, []);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Allow clicks on Stage or the background Image, but not on interactive elements (rulers, loops, ROI)
        const target = e.target;
        const targetType = target.getType();
        const targetClassName = target.getClassName();
        const isClickable = targetType === 'Stage' || targetClassName === 'Image';

        if (!isClickable || isDragging.current) { // Prevent click actions if dragged
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

    const imageNodeRef = useRef<Konva.Image>(null);

    // Cache image when filters change
    useEffect(() => {
        if (imageNodeRef.current) {
            imageNodeRef.current.cache();
        }
    }, [image, brightness, contrast, hue]);

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
                        {image && (
                            <KonvaImage
                                image={image}
                                ref={imageNodeRef}
                                filters={[Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL]}
                                brightness={brightness}
                                contrast={contrast}
                                hue={hue}
                                saturation={0}
                                luminance={0}
                            />
                        )}

                        {/* Secondary Annotations */}
                        {secondaries.map((s) => {
                            const isHovered = hoveredAnnotationId === s.id;
                            const size = isHovered ? 16 : 12;
                            const offset = size / 2;

                            return (
                                <Rect
                                    key={s.id}
                                    x={s.x}
                                    y={s.y}
                                    width={size / stageScale}
                                    height={size / stageScale}
                                    offsetX={offset / stageScale}
                                    offsetY={offset / stageScale}
                                    fill={s.type === 'Hemorrhage' ? '#991b1b' : '#6b7280'}
                                    rotation={s.type === 'Hemorrhage' ? 45 : 0}
                                    stroke={isHovered ? "yellow" : "white"}
                                    strokeWidth={(isHovered ? 2 : 1) / stageScale}
                                    draggable={activeTool === 'secondary'}
                                    onDragEnd={(e) => {
                                        const newSecondaries = secondaries.map(sec =>
                                            sec.id === s.id ? { ...sec, x: e.target.x(), y: e.target.y() } : sec
                                        );
                                        onSecondariesChange(newSecondaries);
                                    }}
                                />
                            );
                        })}

                        {/* Loops */}
                        {loops.map((loop) => (
                            <Circle
                                key={loop.id}
                                x={loop.x}
                                y={loop.y}
                                radius={(hoveredAnnotationId === loop.id ? 8 : 5) / stageScale}
                                fill={MORPHOLOGY_COLORS[loop.morphology] || MORPHOLOGY_COLORS.Normal}
                                stroke={hoveredAnnotationId === loop.id ? "yellow" : "white"}
                                strokeWidth={(hoveredAnnotationId === loop.id ? 3 : 1) / stageScale}
                                shadowColor="black"
                                shadowBlur={hoveredAnnotationId === loop.id ? 10 : 0}
                                shadowOpacity={0.5}
                                draggable={activeTool === 'select'}
                                onDragEnd={(e) => {
                                    const newLoops = loops.map(l =>
                                        l.id === loop.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                                    );
                                    onLoopsChange(newLoops);
                                }}
                            />
                        ))}

                        {/* Rulers */}
                        {rulers.map((ruler) => (
                            <RulerTool
                                key={ruler.id}
                                {...ruler}
                                scale={scale}
                                onChange={(id, x1, y1, x2, y2) => {
                                    const newRulers = rulers.map(r =>
                                        r.id === id ? { ...r, x1, y1, x2, y2 } : r
                                    );
                                    onRulersChange(newRulers);
                                }}
                            />
                        ))}

                        {/* Temporary ruler start point indicator */}
                        {rulerStart && activeTool === 'measure' && (
                            <Circle
                                x={rulerStart.x}
                                y={rulerStart.y}
                                radius={6 / stageScale}
                                fill="#3b82f6"
                                stroke="white"
                                strokeWidth={2 / stageScale}
                            />
                        )}
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

                    {/* Filename Label - Draggable (Outside rotation group to stay upright) */}
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
                </Layer>
            </Stage>
        </div>
    );
};
