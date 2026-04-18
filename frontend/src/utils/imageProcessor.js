const DEFAULTS = {
    resize_mode: 'crop',
    aspect_ratio: '16/9',
    max_width: 1400,
    max_height: 1400,
    quality: 82,
    target_size_kb: 1800,
    output_format: 'jpeg',
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function toInt(value, fallback) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAspectRatio(value) {
    const input = String(value ?? '').trim();

    if (!input) {
        return null;
    }

    if (input.includes('/')) {
        const [left, right] = input.split('/').map((part) => Number.parseFloat(part.trim()));
        if (Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0) {
            return left / right;
        }
    }

    const ratio = Number.parseFloat(input);
    if (Number.isFinite(ratio) && ratio > 0) {
        return ratio;
    }

    return null;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Gagal membaca gambar.'));
        };

        image.src = objectUrl;
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Gagal memproses gambar.'));
                return;
            }

            resolve(blob);
        }, mimeType, quality);
    });
}

function getCropBox(sourceWidth, sourceHeight, resizeMode, aspectRatio) {
    if (resizeMode !== 'crop' || !aspectRatio) {
        return { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight };
    }

    const currentRatio = sourceWidth / sourceHeight;

    if (currentRatio > aspectRatio) {
        const sw = Math.round(sourceHeight * aspectRatio);
        return {
            sx: Math.floor((sourceWidth - sw) / 2),
            sy: 0,
            sw,
            sh: sourceHeight,
        };
    }

    const sh = Math.round(sourceWidth / aspectRatio);
    return {
        sx: 0,
        sy: Math.floor((sourceHeight - sh) / 2),
        sw: sourceWidth,
        sh,
    };
}

export async function processQuestionImage(file, settings = {}) {
    const config = {
        ...DEFAULTS,
        ...settings,
    };

    const image = await loadImage(file);

    const resizeMode = config.resize_mode === 'fit' ? 'fit' : 'crop';
    const aspectRatio = parseAspectRatio(config.aspect_ratio);
    const maxWidth = clamp(toInt(config.max_width, DEFAULTS.max_width), 240, 2800);
    const maxHeight = clamp(toInt(config.max_height, DEFAULTS.max_height), 240, 2800);
    const targetBytes = clamp(toInt(config.target_size_kb, DEFAULTS.target_size_kb), 200, 2048) * 1024;
    const mimeType = config.output_format === 'webp' ? 'image/webp' : 'image/jpeg';

    let quality = clamp((toInt(config.quality, DEFAULTS.quality) || DEFAULTS.quality) / 100, 0.4, 0.95);

    let { sx, sy, sw, sh } = getCropBox(image.width, image.height, resizeMode, aspectRatio);

    const initialScale = Math.min(1, maxWidth / sw, maxHeight / sh);
    let drawWidth = Math.max(1, Math.round(sw * initialScale));
    let drawHeight = Math.max(1, Math.round(sh * initialScale));

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas tidak tersedia di browser ini.');
    }

    let blob;

    for (let attempt = 0; attempt < 8; attempt += 1) {
        canvas.width = drawWidth;
        canvas.height = drawHeight;

        context.clearRect(0, 0, drawWidth, drawHeight);
        context.drawImage(image, sx, sy, sw, sh, 0, 0, drawWidth, drawHeight);

        blob = await canvasToBlob(canvas, mimeType, quality);

        if (blob.size <= targetBytes || (drawWidth <= 320 && drawHeight <= 320)) {
            break;
        }

        quality = clamp(quality - 0.06, 0.4, 0.95);
        drawWidth = Math.max(320, Math.round(drawWidth * 0.9));
        drawHeight = Math.max(320, Math.round(drawHeight * 0.9));
    }

    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const outputName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + `.${extension}`;

    const processedFile = new File([blob], outputName, {
        type: mimeType,
        lastModified: Date.now(),
    });

    return {
        file: processedFile,
        meta: {
            originalSize: file.size,
            processedSize: processedFile.size,
            originalWidth: image.width,
            originalHeight: image.height,
            outputWidth: drawWidth,
            outputHeight: drawHeight,
            outputMimeType: mimeType,
        },
    };
}
