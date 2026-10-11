const axios = require('axios');
const fs = require('fs');

async function test() {
  const url = 'https://www.facebook.com/photo.php?fbid=1526825616138522&set=a.545830524238041&type=3';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    },
  });
  fs.writeFileSync('fb_dump.html', res.data, 'utf8');
  console.log('Saved fb_dump.html');
}
test();
