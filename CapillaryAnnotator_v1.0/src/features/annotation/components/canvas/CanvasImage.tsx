import React, { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

interface CanvasImageProps {
    imageUrl: string;
    brightness: number;
    contrast: number;
    hue: number;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({
    imageUrl,
    brightness,
    contrast,
    hue,
}) => {
    const [image] = useImage(imageUrl);
    const imageNodeRef = useRef<Konva.Image>(null);

    // Cache image when filters change
    useEffect(() => {
        if (imageNodeRef.current && image) {
            imageNodeRef.current.cache();
        }
    }, [image, brightness, contrast, hue]);

    if (!image) return null;

    return (
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
    );
};
