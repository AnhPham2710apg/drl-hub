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
  
  // Tìm từ khóa "HẠT GIỐNG ĐỎ"
  const idx = html.indexOf('HẠT GIỐNG ĐỎ');
  console.log('Index of HẠT GIỐNG ĐỎ:', idx);
  if (idx !== -1) {
    const chunk = html.substring(idx - 100, idx + 1000);
    console.log('Chunk around match:\n', chunk);
  }
}
test();
