const fs = require('fs');

const html = fs.readFileSync('fb_dump.html', 'utf8');

// Facebook lưu trữ Unicode dạng \u0111, \u00e0...
function decodeUnicode(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

const decoded = decodeUnicode(html);
const target = 'HẠT GIỐNG ĐỎ';
const idx = decoded.indexOf(target);
console.log('Decoded search for:', target, 'Index:', idx);

if (idx !== -1) {
  console.log('--- FOUND TEXT IN PAYLOAD ---');
  console.log(decoded.substring(idx - 100, idx + 2000));
} else {
  console.log('Target still not found. Let us search for 1526825616138522 (fbid)');
  const fbidIdx = decoded.indexOf('1526825616138522');
  console.log('fbid index:', fbidIdx);
  if (fbidIdx !== -1) {
    console.log(decoded.substring(fbidIdx - 100, fbidIdx + 1000));
  }
}
