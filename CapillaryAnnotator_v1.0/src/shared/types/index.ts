export interface Loop {
    id: string;
    x: number;
    y: number;
    morphology: 'Normal' | 'Tortuous' | 'Enlarged' | 'Giant' | 'Ramified' | 'Bizarre';
    diameter: number;
    isOutermost: boolean;
}

export interface SecondaryAnnotation {
    id: string;
    x: number;
    y: number;
    type: 'Hemorrhage' | 'Avascular';
}

export interface ROI {
    x: number;
    y: number;
}

export interface RulerLine {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Polygon {
    id: string;
    points: Point[];
    label: string;
    morphology: Loop['morphology']; // Same morphology types as Loop
    isClosed: boolean;
}

export interface FileEntry {
    file: File;
    filename: string;
    isAnnotated: boolean;
    thumbnail?: string;
    annotations?: {
        loops: Loop[];
        secondaries: SecondaryAnnotation[];
        rulers: RulerLine[];
        polygons?: Polygon[]; // Added polygons
        roi: ROI | null;
        scale: number;
        rotation?: number; // Rotation in degrees
    };
}

export interface MorphologyStats {
    Normal: number;
    Tortuous: number;
    Enlarged: number;
    Giant: number;
    Ramified: number;
    Bizarre: number;
}

export interface SecondaryStats {
    Hemorrhage: number;
    Avascular: number;
}


