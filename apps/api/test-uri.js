const fs = require('fs');

const html = fs.readFileSync('fb_dump.html', 'utf8');

// Tìm các chuỗi uri trong JSON
const regex = /"uri":"([^"]+)"/g;
let m;
let found = 0;
while ((m = regex.exec(html)) !== null) {
  const uri = m[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
  if (uri.includes('.jpg') || uri.includes('.png') || uri.includes('fbcdn') || uri.includes('scontent')) {
    console.log('URI match:', uri.substring(0, 150));
    found++;
    if (found > 5) break;
  }
}
console.log('Total URI matches found:', found);
