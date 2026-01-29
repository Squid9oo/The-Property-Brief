const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function getPosts(folder) {
  const dir = path.join(__dirname, 'content', folder);
  
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  return files.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: body } = matter(content);
    
    return {
      id: file.replace('.md', ''),
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      tag: data.tag || '',
      summary: data.summary || '',
      body: body || '',
      image: data.image || null,
      videoId: data.videoId || null,
      pdf: data.pdf || null,
      pdfPreview: data.pdfPreview || null
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

const posts = {
  news: getPosts('news'),
  strategies: getPosts('strategies')
};

fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
console.log('✅ Generated posts.json');
console.log('   News:', posts.news.length);
console.log('   Strategies:', posts.strategies.length);
