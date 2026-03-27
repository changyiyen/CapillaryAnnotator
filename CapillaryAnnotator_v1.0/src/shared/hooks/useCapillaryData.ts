import { useState, useCallback, useEffect, useRef } from 'react';
import type { Loop, ROI, RulerLine, SecondaryAnnotation, Polygon } from '../types';
import { useUndo } from './useUndo';
import { updateLoopClassifications } from '../../features/annotation/utils/geometry';

export interface AnnotationState {
    loops: Loop[];
    secondaries: SecondaryAnnotation[];
    roi: ROI | null;
    rulers: RulerLine[];
    polygons: Polygon[];
    scale: number;
    rotation: number;
}

export interface CapillaryDataActions {
    setLoops: (loops: Loop[]) => void;
    addLoop: (loop: Loop) => void;
    deleteLoop: (id: string) => void;
    setSecondaries: (secondaries: SecondaryAnnotation[]) => void;
    addSecondary: (secondary: SecondaryAnnotation) => void;
    deleteSecondary: (id: string) => void;
    setRulers: (rulers: RulerLine[]) => void;
    addRuler: (ruler: RulerLine) => void;
    deleteRuler: (id: string) => void;
    setPolygons: (polygons: Polygon[]) => void;
    deletePolygon: (id: string) => void;
    setRoi: (roi: ROI | null) => void;
    setScale: (scale: number) => void;
    setRotation: (rotation: number) => void;
    reset: (newState?: Partial<AnnotationState>) => void;
}

const INITIAL_STATE: AnnotationState = {
    loops: [],
    secondaries: [],
    roi: null,
    rulers: [],
    polygons: [],
    scale: 1.82,
    rotation: 0,
};

export function useCapillaryData() {
    // We keep local state for immediate UI updates, but sync with history
    const [loops, setLoopsState] = useState<Loop[]>([]);
    const [secondaries, setSecondariesState] = useState<SecondaryAnnotation[]>([]);
    const [roi, setRoiState] = useState<ROI | null>(null);
    const [rulers, setRulersState] = useState<RulerLine[]>([]);
    const [polygons, setPolygonsState] = useState<Polygon[]>([]);
    const [scale, setScaleState] = useState(1.82);
    const [rotation, setRotationState] = useState(0);

    const {
        state: historyState,
        set: setHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        reset: resetHistory
    } = useUndo<AnnotationState>(INITIAL_STATE);

    const isUndoingRef = useRef(false);

    // Sync history -> local state (Undo/Redo)
    useEffect(() => {
        if (isUndoingRef.current) {
            setLoopsState(historyState.loops);
            setSecondariesState(historyState.secondaries);
            setRoiState(historyState.roi);
            setRulersState(historyState.rulers);
            setPolygonsState(historyState.polygons);
            setScaleState(historyState.scale);
            setRotationState(historyState.rotation);

            setTimeout(() => {
                isUndoingRef.current = false;
            }, 0);
        }
    }, [historyState]);

    // Sync local state -> history (Updates)
    useEffect(() => {
        if (!isUndoingRef.current) {
            // We debounce the history push to prevent "explosion" from sliders (rotation/scale)
            // and rapid movements.
            const timer = setTimeout(() => {
                const currentState: AnnotationState = {
                    loops,
                    secondaries,
                    roi,
                    rulers,
                    polygons,
                    scale,
                    rotation
                };
                setHistory(currentState);
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [loops, secondaries, roi, rulers, polygons, scale, rotation, setHistory]);


    // --- Actions ---

    const setLoops = useCallback((newLoops: Loop[]) => {
        const classified = updateLoopClassifications(newLoops);
        setLoopsState(classified);
    }, []);

    const addLoop = useCallback((loop: Loop) => {
        setLoopsState(prev => {
            const newLoops = [...prev, loop];
            return updateLoopClassifications(newLoops);
        });
    }, []);

    const deleteLoop = useCallback((id: string) => {
        setLoopsState(prev => prev.filter(l => l.id !== id));
    }, []);

    const setSecondaries = useCallback((newSecondaries: SecondaryAnnotation[]) => {
        setSecondariesState(newSecondaries);
    }, []);

    const addSecondary = useCallback((secondary: SecondaryAnnotation) => {
        setSecondariesState(prev => [...prev, secondary]);
    }, []);

    const deleteSecondary = useCallback((id: string) => {
        setSecondariesState(prev => prev.filter(s => s.id !== id));
    }, []);

    const setRulers = useCallback((newRulers: RulerLine[]) => {
        setRulersState(newRulers);
    }, []);

    const addRuler = useCallback((ruler: RulerLine) => {
        setRulersState(prev => [...prev, ruler]);
    }, []);

    const deleteRuler = useCallback((id: string) => {
        setRulersState(prev => prev.filter(r => r.id !== id));
    }, []);

    const setPolygons = useCallback((newPolygons: Polygon[]) => {
        setPolygonsState(newPolygons);
    }, []);

    const deletePolygon = useCallback((id: string) => {
        setPolygonsState(prev => prev.filter(p => p.id !== id));
    }, []);

    const setRoi = useCallback((newRoi: ROI | null) => {
        setRoiState(newRoi);
    }, []);

    const setScale = useCallback((newScale: number) => {
        setScaleState(newScale);
    }, []);

    const setRotation = useCallback((newRotation: number) => {
        setRotationState(newRotation);
    }, []);

    // Perform an undo operation
    const performUndo = useCallback(() => {
        isUndoingRef.current = true;
        undo();
    }, [undo]);

    // Perform a redo operation
    const performRedo = useCallback(() => {
        isUndoingRef.current = true;
        redo();
    }, [redo]);

    const reset = useCallback((newState?: Partial<AnnotationState>) => {
        const nextState = { ...INITIAL_STATE, ...newState };

        setLoopsState(nextState.loops);
        setSecondariesState(nextState.secondaries);
        setRoiState(nextState.roi);
        setRulersState(nextState.rulers);
        setPolygonsState(nextState.polygons);
        setScaleState(nextState.scale);
        setRotationState(nextState.rotation);

        // Also reset history to this point
        resetHistory(nextState);
    }, [resetHistory]);

    return {
        state: {
            loops,
            secondaries,
            roi,
            rulers,
            polygons,
            scale,
            rotation
        },
        actions: {
            setLoops,
            addLoop,
            deleteLoop,
            setSecondaries,
            addSecondary,
            deleteSecondary,
            setRulers,
            addRuler,
            deleteRuler,
            setPolygons,
            deletePolygon,
            setRoi,
            setScale,
            setRotation,
            reset
        },
        history: {
            undo: performUndo,
            redo: performRedo,
            canUndo,
            canRedo
        }
    };
}
