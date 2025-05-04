const frameInput = document.getElementById('frameInput');
const photoInput = document.getElementById('photoInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

let frameImage = new Image();
let photoImages = [];
let currentIndex = 0;

frameInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  frameImage.onload = drawImages;
  frameImage.src = url;
});

photoInput.addEventListener('change', (e) => {
  photoImages = Array.from(e.target.files).map(file => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return img;
  });

  // Only draw first one when ready
  if (photoImages.length > 0) {
    photoImages[0].onload = drawImages;
    currentIndex = 0;
  }
});

function drawImages() {
  const photo = photoImages[currentIndex];

  // Target max size
  const maxWidth = 400;
  const maxHeight = 400;
  
  let width = photo.width;
  let height = photo.height;
  
  // Scale down if too large
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const scale = Math.min(widthRatio, heightRatio);
  
    width = width * scale;
    height = height * scale;
  }
  
  // Center it
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  
  ctx.drawImage(photo, x, y, width, height);
  
}

nextBtn.addEventListener('click', () => {
  if (currentIndex < photoImages.length - 1) {
    currentIndex++;
    drawImages();
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    drawImages();
  }
});
const downloadBtn = document.getElementById('downloadBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `framed-photo-${currentIndex + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

downloadAllBtn.addEventListener('click', () => {
  if (!frameImage.src || photoImages.length === 0) return;

  // Temporarily hide buttons to avoid download glitches
  toggleButtons(false);

  let i = 0;

  function downloadNext() {
    if (i >= photoImages.length) {
      toggleButtons(true);
      return;
    }

    currentIndex = i;
    drawImages();

    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `framed-photo-${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      i++;
      downloadNext();
    }, 500); // Delay to allow canvas to render
  }

  downloadNext();
});

function toggleButtons(show) {
  downloadBtn.disabled = !show;
  downloadAllBtn.disabled = !show;
  nextBtn.disabled = !show;
  prevBtn.disabled = !show;
}
