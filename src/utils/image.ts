export interface ProcessedImage {
  previewUrl: string;
  base64: string;
  mimeType: string;
  name: string;
}

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.7;

function compressImageElement(img: HTMLImageElement, fileName: string): ProcessedImage {
  let { width, height } = img;
  if (!width || !height) {
    throw new Error("유효한 이미지 크기를 읽을 수 없습니다.");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지를 처리할 수 있는 그래픽 컨텍스트를 생성하지 못했습니다.");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

  return {
    previewUrl: dataUrl,
    base64,
    mimeType: "image/jpeg",
    name: fileName,
  };
}

export function fileToProcessedImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const looksLikeImageByName = /\.(jpe?g|png|webp|gif|bmp|avif|jfif)$/i.test(file.name);
    if (file.type && !file.type.startsWith("image/")) {
      reject(new Error("이미지 파일(JPG, PNG, WEBP)만 업로드할 수 있습니다."));
      return;
    }
    if (!file.type && !looksLikeImageByName) {
      reject(new Error("이미지 파일(JPG, PNG, WEBP)만 업로드할 수 있습니다."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const result = compressImageElement(img, file.name);
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("선택한 이미지를 불러오지 못했습니다."));
    };
    img.src = objectUrl;
  });
}

export async function urlToProcessedImage(url: string, label: string): Promise<ProcessedImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("예시 이미지를 불러오지 못했습니다.");
  }
  const blob = await response.blob();
  const file = new File([blob], `${label}.jpg`, { type: blob.type || "image/jpeg" });
  return fileToProcessedImage(file);
}
