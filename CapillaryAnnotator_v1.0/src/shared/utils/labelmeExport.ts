import type { Polygon } from '../types';

export interface LabelMeShape {
    label: string;
    points: number[][];
    group_id: null;
    description: string;
    shape_type: "polygon";
    flags: Record<string, any>;
}

export interface LabelMeJSON {
    version: string;
    flags: Record<string, any>;
    shapes: LabelMeShape[];
    imagePath: string;
    imageData: null;
    imageHeight: number;
    imageWidth: number;
}

export const generateLabelMeJSON = (
    filename: string,
    width: number,
    height: number,
    polygons: Polygon[]
): LabelMeJSON => {
    const shapes: LabelMeShape[] = polygons.map(poly => ({
        label: poly.label || 'Capillary',
        points: poly.points.map(p => [p.x, p.y]),
        group_id: null,
        description: "",
        shape_type: "polygon",
        flags: {}
    }));

    return {
        version: "5.0.1",
        flags: {},
        shapes: shapes,
        imagePath: filename,
        imageData: null, // We don't embed image data to keep files small
        imageHeight: height,
        imageWidth: width
    };
};
