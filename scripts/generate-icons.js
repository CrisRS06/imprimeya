const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#FFB902" rx="${Math.round(size * 0.15)}"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial, sans-serif" font-weight="bold" font-size="${Math.round(size * 0.35)}" fill="#000">
      YA
    </text>
  </svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('\nSVG icons created!');
