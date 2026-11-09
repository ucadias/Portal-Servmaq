const FEEDS = [
  {
    url: 'https://www.canalrural.com.br/feed/',
    source: 'Canal Rural'
  },
  {
    url: 'https://www.noticiasagricolas.com.br/rss/',
    source: 'Notícias Agrícolas'
  }
];

exports.handler = async () => {
  const results = await Promise.allSettled(
    FEEDS.map(async feed => {
      const response = await fetch(feed.url);
      if (!response.ok) throw new Error('Feed indisponível');

      const xml = await response.text();
      const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

      return entries.map(match => {
        const item = match[1];
        const get = tag => {
          const found = item.match(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
          );
          return found ? found[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
        };

        return {
          title: get('title'),
          link: get('link'),
          description: get('description').replace(/<[^>]*>/g, '').slice(0, 220),
          publishedAt: get('pubDate'),
          source: feed.source,
          category: 'Agronegócio'
        };
      }).filter(item => item.title && item.link);
    })
  );

  const items = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 20);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=600'
    },
    body: JSON.stringify({
      items,
      updatedAt: new Date().toISOString(),
      partial: results.some(result => result.status === 'rejected')
    })
  };
};
