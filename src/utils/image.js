// Normalize an uploaded profile photo to a crisp, high-resolution square.
//
// Why: raw uploads vary wildly in size/quality, and small ones look blocky
// when shown on ID cards or printed forms. This renders every photo onto a
// high-DPI square canvas with high-quality smoothing (center-cropped "cover"),
// so avatars stay sharp everywhere. Large photos downscale cleanly; tiny ones
// are smoothed instead of pixelated.
//
// Returns a Promise that resolves to a JPEG data URL.
export function processProfileImage(file, { size = 800, quality = 0.95 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        try {
          const s = Math.max(1, Math.round(size));
          const canvas = document.createElement("canvas");
          canvas.width = s;
          canvas.height = s;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          // Cover: scale to fill the square, then center-crop the overflow.
          const scale = Math.max(s / img.width, s / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (err) { reject(err); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
