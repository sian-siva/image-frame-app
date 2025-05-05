//Js

// === Core Element References ===
const frameInput = document.getElementById('frameInput');
const photoInput = document.getElementById('photoInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.style.touchAction = 'none';
const fitModeSelect = document.getElementById('fitModeSelect');
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');
const downloadBtn = document.getElementById('downloadBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const photoCounter = document.getElementById('photoCounter');
const previewContainer = document.getElementById('previewThumbnails');

// State variables
let frameImage = new Image();
let photoImages = [];
let currentIndex = 0;
let targetArea = null;
let isDrawing = false;
let isDraggingPhoto = false;
let startX = 0;
let startY = 0;
let dragStart = { x: 0, y: 0 };
let coverOffset = { x: 0, y: 0 };
let fitMode = 'fit';

// Pointer event handlers
enablePointerEvents();

function enablePointerEvents() {
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown);
  canvas.addEventListener('touchmove', onPointerMove);
  canvas.addEventListener('touchend', onPointerUp);
}

function getPointerPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const { clientX, clientY } = e.touches ? e.touches[0] : e;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function onPointerDown(e) {
  if (!frameImage.src) return;
  e.preventDefault();
  const pos = getPointerPosition(e);
  const x = pos.x;
  const y = pos.y;

  // If in cover mode and photo loaded inside area, start dragging photo
  if (fitMode === 'cover' && targetArea && photoImages[currentIndex]) {
    if (x >= targetArea.x && x <= targetArea.x + targetArea.width &&
        y >= targetArea.y && y <= targetArea.y + targetArea.height) {
      isDraggingPhoto = true;
      dragStart = { x, y };
      return;
    }
  }

  // Else start drawing selection box
  isDrawing = true;
  startX = x;
  startY = y;
}

function onPointerMove(e) {
  if (!isDrawing && !isDraggingPhoto) return;
  e.preventDefault();
  const pos = getPointerPosition(e);
  const x = pos.x;
  const y = pos.y;

  if (isDraggingPhoto) {
    // Move the crop offset
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    coverOffset.x += dx;
    coverOffset.y += dy;
    dragStart = { x, y };
    drawImages();
    return;
  }

  // Drawing selection box preview
  const width = x - startX;
  const height = y - startY;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1e90ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, width, height);
}

function onPointerUp(e) {
  if (isDraggingPhoto) {
    isDraggingPhoto = false;
    return;
  }
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPointerPosition(e);
  const endX = pos.x;
  const endY = pos.y;

  targetArea = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };
  isDrawing = false;
  // Reset offset when new area selected
  coverOffset = { x: 0, y: 0 };
  drawImages();
}

function resizeCanvasToImage(img) {
  canvas.width = img.width;
  canvas.height = img.height;
}

function drawImages(suppressBox = false) {
  const photo = photoImages[currentIndex];
  if (!frameImage.src) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

  if (photo && targetArea) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);
    ctx.clip();

    const imgW = photo.width;
    const imgH = photo.height;
    const boxW = targetArea.width;
    const boxH = targetArea.height;

    if (fitMode === 'fit') {
      const scale = Math.min(boxW / imgW, boxH / imgH);
      const w = imgW * scale;
      const h = imgH * scale;
      const x = targetArea.x + (boxW - w) / 2;
      const y = targetArea.y + (boxH - h) / 2;
      ctx.drawImage(photo, x, y, w, h);

    } else if (fitMode === 'fill') {
      const scale = Math.max(boxW / imgW, boxH / imgH);
      const w = imgW * scale;
      const h = imgH * scale;
      const x = targetArea.x + (boxW - w) / 2;
      const y = targetArea.y + (boxH - h) / 2;
      ctx.drawImage(photo, x, y, w, h);

    } else if (fitMode === 'cover') {
      const scale = Math.max(boxW / imgW, boxH / imgH);
      const cropW = boxW / scale;
      const cropH = boxH / scale;
      let sx = (imgW - cropW) / 2 + coverOffset.x;
      let sy = (imgH - cropH) / 2 + coverOffset.y;
      sx = Math.max(0, Math.min(sx, imgW - cropW));
      sy = Math.max(0, Math.min(sy, imgH - cropH));
      ctx.drawImage(photo, sx, sy, cropW, cropH, targetArea.x, targetArea.y, boxW, boxH);

    } else if (fitMode === 'tile') {
      for (let yy = targetArea.y; yy < targetArea.y + boxH; yy += imgH) {
        for (let xx = targetArea.x; xx < targetArea.x + boxW; xx += imgW) {
          ctx.drawImage(photo, xx, yy, imgW, imgH);
        }
      }
    }
    ctx.restore();
  }

  if (targetArea && !suppressBox) {
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);
  }
  highlightActiveThumbnail();
  updateCounter();
}

function updateCounter() {
  photoCounter.textContent = photoImages.length > 0 ? `Photo ${currentIndex + 1} / ${photoImages.length}` : '';
}

function highlightActiveThumbnail() {
  const thumbs = document.querySelectorAll('#previewThumbnails img');
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle('active', index === currentIndex);
  });
}

function renderPreviews() {
  previewContainer.innerHTML = '';
  photoImages.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    if (index === currentIndex) thumb.classList.add('active');
    thumb.addEventListener('click', () => {
      currentIndex = index;
      coverOffset = { x: 0, y: 0 };
      drawImages();
    });
    previewContainer.appendChild(thumb);
  });
}

frameInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  frameImage.onload = () => {
    resizeCanvasToImage(frameImage);
    drawImages();
    targetArea = null;
  };
  frameImage.src = url;
});

photoInput.addEventListener('change', (e) => {
  photoImages = Array.from(e.target.files).map(file => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return img;
  });
  if (photoImages.length > 0) {
    currentIndex = 0;
    coverOffset = { x: 0, y: 0 };
    photoImages[0].onload = () => {
      drawImages();
      renderPreviews();
    };
  }
});

prevArrow.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    coverOffset = { x: 0, y: 0 };
    drawImages();
  }
});

nextArrow.addEventListener('click', () => {
  if (currentIndex < photoImages.length - 1) {
    currentIndex++;
    coverOffset = { x: 0, y: 0 };
    drawImages();
  }
});

fitModeSelect.addEventListener('change', (e) => {
  fitMode = e.target.value;
  coverOffset = { x: 0, y: 0 };
  drawImages();
});

downloadBtn.addEventListener('click', () => {
  drawImages(true);
  const link = document.createElement('a');
  link.download = `framed-photo-${currentIndex + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  drawImages();
});

downloadAllBtn.addEventListener('click', () => {
  if (!frameImage.src || photoImages.length === 0) return;
  const originalText = downloadAllBtn.textContent;
  downloadAllBtn.textContent = 'Processing...';
  let i = 0;

  function downloadNext() {
    if (i >= photoImages.length) {
      downloadAllBtn.textContent = originalText;
      return;
    }
    currentIndex = i;
    coverOffset = { x: 0, y: 0 };
    drawImages(true);
    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `framed-photo-${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      i++;
      downloadNext();
    }, 500);
  }
  downloadNext();
});
