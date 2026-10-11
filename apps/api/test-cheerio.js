const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('fb_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('og:title:', $('meta[property="og:title"]').attr('content'));
console.log('title tag:', $('title').text());
console.log('meta[name="description"]:', $('meta[name="description"]').attr('content'));
console.log('og:description:', $('meta[property="og:description"]').attr('content'));
console.log('og:image:', $('meta[property="og:image"]').attr('content'));
