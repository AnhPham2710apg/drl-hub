const fs = require('fs');
const content = fs.readFileSync('fb_dump.html', 'utf8');
const lines = content.split('\n');
console.log('Total lines in dump:', lines.length);
for (let line of lines) {
  if (line.includes('meta') && (line.includes('description') || line.includes('image') || line.includes('title'))) {
    console.log('META LINE:', line.substring(0, 300));
  }
}
