/**
 * Image Enhancement Utilities for Capillaroscopy
 * 
 * Implements CLAHE (Contrast Limited Adaptive Histogram Equalization)
 * and other enhancement techniques to improve capillary visibility.
 */

/**
 * Main enhancement function - applies full pipeline to image
 */
export async function enhanceImage(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    // Create canvas for processing
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Draw original image
                    ctx.drawImage(img, 0, 0);
                    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Apply enhancement pipeline
                    imageData = applyCLAHE(imageData, 2.5, 8);
                    imageData = adjustBrightnessContrast(imageData);
                    imageData = sharpenImage(imageData, 0.6);

                    // Put enhanced image back
                    ctx.putImageData(imageData, 0, 0);

                    // Convert to data URL
                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(imageFile);
    });
}

/**
 * CLAHE - Contrast Limited Adaptive Histogram Equalization
 * Enhances local contrast while preventing noise amplification
 */
function applyCLAHE(
    imageData: ImageData,
    clipLimit: number = 2.5,
    tileSize: number = 8
): ImageData {
    const { width, height, data } = imageData;
    const enhanced = new Uint8ClampedArray(data);

    // Convert to grayscale for processing (luminance)
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Luminance formula
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    // Calculate tile dimensions
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);

    // Process each tile
    const lookupTables: number[][][] = [];
    for (let ty = 0; ty < tilesY; ty++) {
        lookupTables[ty] = [];
        for (let tx = 0; tx < tilesX; tx++) {
            const x0 = tx * tileSize;
            const y0 = ty * tileSize;
            const x1 = Math.min(x0 + tileSize, width);
            const y1 = Math.min(y0 + tileSize, height);

            // Calculate histogram for this tile
            const hist = new Array(256).fill(0);
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    hist[gray[y * width + x]]++;
                }
            }

            // Clip histogram
            const tilePixels = (x1 - x0) * (y1 - y0);
            const clipVal = Math.floor((clipLimit * tilePixels) / 256);
            let clipped = 0;

            for (let i = 0; i < 256; i++) {
                if (hist[i] > clipVal) {
                    clipped += hist[i] - clipVal;
                    hist[i] = clipVal;
                }
            }

            // Redistribute clipped pixels
            const redistBatch = Math.floor(clipped / 256);
            let residual = clipped - redistBatch * 256;

            for (let i = 0; i < 256; i++) {
                hist[i] += redistBatch;
                if (residual > 0) {
                    hist[i]++;
                    residual--;
                }
            }

            // Create cumulative distribution function
            const cdf = new Array(256).fill(0);
            cdf[0] = hist[0];
            for (let i = 1; i < 256; i++) {
                cdf[i] = cdf[i - 1] + hist[i];
            }

            // Normalize to create lookup table
            const lut = new Array(256).fill(0);
            const cdfMin = cdf.find(v => v > 0) || 0;
            const cdfRange = tilePixels - cdfMin;

            for (let i = 0; i < 256; i++) {
                if (cdfRange > 0) {
                    lut[i] = Math.round(((cdf[i] - cdfMin) / cdfRange) * 255);
                } else {
                    lut[i] = i;
                }
            }

            lookupTables[ty][tx] = lut;
        }
    }

    // Apply interpolated lookup tables
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Find tile position
            const tx = Math.min(Math.floor(x / tileSize), tilesX - 1);
            const ty = Math.min(Math.floor(y / tileSize), tilesY - 1);

            // Get lookup table for this tile
            const lut = lookupTables[ty][tx];
            const oldVal = gray[y * width + x];
            const newVal = lut[oldVal];

            // Apply to all color channels while preserving color ratios
            const idx = (y * width + x) * 4;
            const oldLum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

            if (oldLum > 0) {
                const ratio = newVal / oldLum;
                enhanced[idx] = Math.min(255, Math.round(data[idx] * ratio));
                enhanced[idx + 1] = Math.min(255, Math.round(data[idx + 1] * ratio));
                enhanced[idx + 2] = Math.min(255, Math.round(data[idx + 2] * ratio));
            } else {
                enhanced[idx] = newVal;
                enhanced[idx + 1] = newVal;
                enhanced[idx + 2] = newVal;
            }
            enhanced[idx + 3] = data[idx + 3]; // Alpha
        }
    }

    return new ImageData(enhanced, width, height);
}

/**
 * Adjust brightness and contrast based on histogram analysis
 */
function adjustBrightnessContrast(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const enhanced = new Uint8ClampedArray(data);

    // Calculate histogram for luminance
    const hist = new Array(256).fill(0);
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        hist[lum]++;
    }

    // Find 1st and 99th percentile for auto-levels
    const totalPixels = width * height;
    const lowPercentile = Math.floor(totalPixels * 0.01);
    const highPercentile = Math.floor(totalPixels * 0.99);

    let cumSum = 0;
    let minVal = 0;
    let maxVal = 255;

    for (let i = 0; i < 256; i++) {
        cumSum += hist[i];
        if (cumSum >= lowPercentile && minVal === 0) {
            minVal = i;
        }
        if (cumSum >= highPercentile) {
            maxVal = i;
            break;
        }
    }

    // Avoid division by zero
    const range = maxVal - minVal;
    if (range === 0) return imageData;

    // Apply auto-levels (stretch histogram)
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const val = data[i + c];
            enhanced[i + c] = Math.max(0, Math.min(255,
                Math.round(((val - minVal) / range) * 255)
            ));
        }
        enhanced[i + 3] = data[i + 3]; // Alpha
    }

    return new ImageData(enhanced, width, height);
}

/**
 * Sharpen image using unsharp mask technique
 */
function sharpenImage(imageData: ImageData, amount: number = 0.5): ImageData {
    const { width, height, data } = imageData;
    const enhanced = new Uint8ClampedArray(data);

    // Simple 3x3 sharpening kernel
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    // Apply convolution (skip edges for simplicity)
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;

                // Apply kernel
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        const kIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kIdx];
                    }
                }

                // Blend with original based on amount
                const idx = (y * width + x) * 4 + c;
                const sharpened = Math.max(0, Math.min(255, sum));
                enhanced[idx] = Math.round(data[idx] * (1 - amount) + sharpened * amount);
            }
        }
    }

    return new ImageData(enhanced, width, height);
}
