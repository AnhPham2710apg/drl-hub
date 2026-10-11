const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www.facebook.com/photo.php?fbid=1526825616138522&set=a.545830524238041&type=3';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept-Language': 'vi,en;q=0.9',
      },
      maxRedirects: 5,
    });
    console.log('Status:', res.status, 'HTML length:', res.data.length);
    const $ = cheerio.load(res.data);
    $('meta').each((i, el) => {
      const prop = $(el).attr('property') || $(el).attr('name');
      const content = $(el).attr('content');
      if (prop) {
        console.log(prop, '->', content?.substring(0, 150));
      }
    });
  } catch (e) {
    console.error('Error fetching:', e.message);
  }
}
test();
