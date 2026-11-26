export interface ProcessedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.86;

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지를 읽는 데 실패했습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 불러오지 못했습니다.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('지원되지 않는 이미지 형식입니다.'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallbackMime = file.type || 'image/jpeg';
    const base64 = rawDataUrl.split(',')[1] || '';
    return {dataUrl: rawDataUrl, base64, mimeType: fallbackMime};
  }

  ctx.drawImage(img, 0, 0, width, height);

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const compressedUrl =
    outputMime === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  const base64 = compressedUrl.split(',')[1] || '';
  return {
    dataUrl: compressedUrl,
    base64,
    mimeType: outputMime,
  };
}
