const axios = require('axios');
const fs = require('fs');

async function test() {
  const url = 'https://www.facebook.com/photo.php?fbid=1526825616138522&set=a.545830524238041&type=3';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    },
  });
  const html = res.data;
  
  // Tìm các đoạn url ảnh trong html
  const imgMatches = html.match(/https:\/\/[^"'\\]+fbcdn\.net[^"'\\]+/g);
  console.log('Found fbcdn images count:', imgMatches ? imgMatches.length : 0);
  if (imgMatches) {
    console.log('Sample image 1:', imgMatches[0].replace(/\\u0025/g, '%').replace(/\\/g, ''));
  }

  // Tìm toàn bộ text bài viết trong JSON payload của Facebook
  const textMatches = html.match(/"text":"([^"]{50,})"/g);
  console.log('Found text matches count:', textMatches ? textMatches.length : 0);
  if (textMatches) {
    for (let i = 0; i < Math.min(textMatches.length, 5); i++) {
      console.log(`Text match ${i}:`, textMatches[i].substring(0, 150));
    }
  }
}
test();
