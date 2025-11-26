import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Group, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { Loop, ROI, RulerLine, SecondaryAnnotation } from '../types';
import { RulerTool } from './RulerTool';

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
}

const URLImage: React.FC<{ src: string }> = ({ src }) => {
    const [image] = useImage(src);
    return <KonvaImage image={image} />;
};


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
    hoveredAnnotationId
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
    const [labelPos, setLabelPos] = useState({ x: 20, y: 20 });

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

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Allow clicks on Stage or the background Image, but not on interactive elements (rulers, loops, ROI)
        const target = e.target;
        const targetType = target.getType();
        const targetClassName = target.getClassName();
        const isClickable = targetType === 'Stage' || targetClassName === 'Image';

        if (!isClickable) {
            return;
        }

        const stage = e.target.getStage();
        if (!stage) return;

        // Get pointer relative to the image (accounting for zoom/pan)
        const transform = stage.getAbsoluteTransform().copy();
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

    return (
        <div className="bg-gray-900 overflow-hidden">
            <Stage
                width={width}
                height={height}
                draggable
                onWheel={handleWheel}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                onClick={handleStageClick}
                ref={stageRef}
            >
                <Layer>
                    <URLImage src={imageUrl} />

                    {/* ROI Box - Fixed Size 1mm x 1mm (1000 microns) */}
                    {roi && (
                        <Rect
                            x={roi.x}
                            y={roi.y}
                            width={1000 * scale}
                            height={1000 * scale}
                            stroke="yellow"
                            strokeWidth={2 / stageScale}
                            draggable={activeTool === 'roi'}
                            listening={activeTool === 'roi'}
                            onDragEnd={(e) => {
                                onRoiChange({
                                    x: e.target.x(),
                                    y: e.target.y()
                                });
                            }}
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
                            fill={(() => {
                                switch (loop.morphology) {
                                    case 'Normal': return '#3b82f6';
                                    case 'Tortuous': return '#10b981';
                                    case 'Enlarged': return '#8b5cf6';
                                    case 'Giant': return '#ec4899';
                                    case 'Ramified': return '#f59e0b';
                                    case 'Bizarre': return '#ef4444';
                                    default: return '#3b82f6';
                                }
                            })()}
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

                    {/* Filename Label - Draggable */}
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
