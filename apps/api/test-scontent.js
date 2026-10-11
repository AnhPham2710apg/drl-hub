const fs = require('fs');

const html = fs.readFileSync('fb_dump.html', 'utf8');

// Tìm các chuỗi ảnh trong JSON
const regex = /https:[^"'\\]+scontent[^"'\\]+/g;
const matches = html.match(regex);
console.log('scontent matches:', matches ? matches.length : 0);
if (matches) {
  for (let m of matches.slice(0, 5)) {
    const cleanUrl = m.replace(/\\u0025/g, '%').replace(/\\/g, '');
    console.log('Image:', cleanUrl.substring(0, 120));
  }
}
