// === Core Element References ===
const frameInput = document.getElementById('frameInput');
const photoInput = document.getElementById('photoInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
// Prevent page scrolling when touching the canvas\ ncanvas.style.touchAction = 'none';
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const photoCounter = document.getElementById('photoCounter');
const previewContainer = document.getElementById('previewThumbnails');

let frameImage = new Image();
let photoImages = [];
let currentIndex = 0;
let targetArea = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let fitMode = 'fit'; // 'fit' or 'cover'

// === Pointer Event Handlers (Mouse & Touch) ===
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);

// === Mobile Touch Support ===
canvas.addEventListener('touchstart', onPointerDown);
canvas.addEventListener('touchmove', onPointerMove);
canvas.addEventListener('touchend', onPointerUp);

function onPointerDown(e) {
  if (!frameImage.src) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const { clientX, clientY } = e.touches ? e.touches[0] : e;
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // fit/cover switch zone
  if (y > canvas.height - 50) {
    if (x > 20 && x < 80) fitMode = 'fit';
    if (x > 120 && x < 190) fitMode = 'cover';
    drawImages();
    return;
  }

  startX = x;
  startY = y;
  isDrawing = true;
}

function onPointerMove(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const { clientX, clientY } = e.touches ? e.touches[0] : e;
  const currentX = clientX - rect.left;
  const currentY = clientY - rect.top;
  const width = currentX - startX;
  const height = currentY - startY;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1e90ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, width, height);
  drawFitModeOptions();
}

function onPointerUp(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches ? e.changedTouches[0] : e;
  const endX = touch.clientX - rect.left;
  const endY = touch.clientY - rect.top;

  targetArea = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
  isDrawing = false;
  drawImages();
}

// === Drawing & Rendering ===
function drawImages(suppressBox = false) {
  const photo = photoImages[currentIndex];
  if (!frameImage.src) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

  if (photo && targetArea) {
    const imgW = photo.width;
    const imgH = photo.height;
    const boxW = targetArea.width;
    const boxH = targetArea.height;

    if (fitMode === 'fit') {
      let width = imgW;
      let height = imgH;
      const scale = Math.min(boxW / imgW, boxH / imgH);
      width *= scale;
      height *= scale;
      const x = targetArea.x + (boxW - width) / 2;
      const y = targetArea.y + (boxH - height) / 2;
      ctx.drawImage(photo, x, y, width, height);
    } else {
      const scale = Math.max(boxW / imgW, boxH / imgH);
      const drawW = boxW;
      const drawH = boxH;
      const cropW = boxW / scale;
      const cropH = boxH / scale;
      const sx = (imgW - cropW) / 2;
      const sy = (imgH - cropH) / 2;
      ctx.drawImage(photo, sx, sy, cropW, cropH, targetArea.x, targetArea.y, drawW, drawH);
    }
  }

  if (targetArea && !suppressBox) {
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);
  }

  drawFitModeOptions();
  highlightActiveThumbnail();
}

function drawFitModeOptions() {
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#000';

  ctx.beginPath();
  ctx.arc(30, canvas.height - 35, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  if (fitMode === 'fit') {
    ctx.beginPath();
    ctx.arc(30, canvas.height - 35, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillText('Fit', 45, canvas.height - 30);

  ctx.beginPath();
  ctx.arc(130, canvas.height - 35, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  if (fitMode === 'cover') {
    ctx.beginPath();
    ctx.arc(130, canvas.height - 35, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillText('Cover', 145, canvas.height - 30);
}

function highlightActiveThumbnail() {
  const thumbs = document.querySelectorAll('#previewThumbnails img');
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle('active', index === currentIndex);
  });
}

function updateCounter() {
  photoCounter.textContent = photoImages.length > 0
    ? `Photo ${currentIndex + 1} of ${photoImages.length}`
    : '';
}

function updateNavButtons() {
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === photoImages.length - 1;
}

function toggleButtons(show) {
  downloadBtn.disabled = !show;
  downloadAllBtn.disabled = !show;
  nextBtn.disabled = !show;
  prevBtn.disabled = !show;
}

function renderPreviews() {
  previewContainer.innerHTML = '';
  photoImages.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    if (index === currentIndex) thumb.classList.add('active');
    thumb.addEventListener('click', () => {
      currentIndex = index;
      drawImages();
      updateCounter();
      updateNavButtons();
    });
    previewContainer.appendChild(thumb);
  });
}

// === Upload Handlers ===
frameInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  frameImage.onload = () => {
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
    photoImages[0].onload = () => {
      drawImages();
      updateCounter();
      updateNavButtons();
      renderPreviews();
    };
  }
});

// === Navigation ===
nextBtn.addEventListener('click', () => {
  if (currentIndex < photoImages.length - 1) {
    currentIndex++;
    drawImages();
    updateCounter();
    updateNavButtons();
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    drawImages();
    updateCounter();
    updateNavButtons();
  }
});

// === Download ===
downloadBtn.addEventListener('click', () => {
  drawImages(true);
  const link = document.createElement('а');
  link.download = `framed-photo-${currentIndex + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  drawImages();
});

downloadAllBtn.addEventListener('click', () => {
  if (!frameImage.src || photoImages.length === 0) return;
  const originalText = downloadAllBtn.textContent;
  downloadAllBtn.textContent = 'Processing...';
  toggleButtons(false);
  let i = 0;
  function downloadNext() {
    if (i >= photoImages.length) {
      downloadAllBtn.textContent = originalText;
      toggleButtons(true);
      return;
    }
    currentIndex = i;
    drawImages(true);
    updateCounter();
    updateNavButtons();
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

// === Drag & Drop ===
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  canvas.classList.add('dragover');
});

canvas.addEventListener('dragleave', () => {
  canvas.classList.remove('dragover');
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  canvas.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length === 0) return;
  const frameFile = files[0];
  const frameUrl = URL.createObjectURL(frameFile);
  frameImage.onload = drawImages;
  frameImage.src = frameUrl;
  photoImages = files.slice(1).map(file => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return img;
  });
  if (photoImages.length > 0) {
    currentIndex = 0;
    photoImages[0].onload = () => {
      drawImages();
      updateCounter();
      updateNavButtons();
      renderPreviews();
    };
  }
});
