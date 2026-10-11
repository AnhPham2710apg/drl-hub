const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www.facebook.com/dk.lch.diachatkhtn/photos/-talk-show-h%E1%BA%A1t-gi%E1%BB%91ng-%C4%91%E1%BB%8F-k%C3%AD-%E1%BB%A9c-ni%E1%BB%81m-tin-s%E1%BB%B1-g%E1%BA%A1ch-n%E1%BB%91i-th%E1%BA%BF-h%E1%BB%87-c%C3%B3-nh%E1%BB%AFng-c%C3%A2u-chuy%E1%BB%87n-l%E1%BB%8B/1526825616138522/';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept-Language': 'vi,en;q=0.9',
    },
  });
  const $ = cheerio.load(res.data);
  const img = $('meta[property="og:image"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const normalDesc = $('meta[name="description"]').attr('content');
  const title = $('meta[property="og:title"]').attr('content');
  
  console.log('Title:', title);
  console.log('og:image:', img);
  console.log('og:description:', ogDesc?.substring(0, 100));
  console.log('meta description:', normalDesc?.substring(0, 100));
}
test();
