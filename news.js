const FEEDS = [
  { name: 'Canal Rural', url: 'https://www.canalrural.com.br/feed/' },
  { name: 'Notícias Agrícolas', url: 'https://www.noticiasagricolas.com.br/noticias.rss' }
];

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}
function category(title) {
  const t = title.toLowerCase();
  if (/soja|milho|algod|café|arroz|safr|plantio|colheit/.test(t)) return 'Lavoura';
  if (/boi|gado|pecu|carne|leite|suín|aves/.test(t)) return 'Pecuária';
  if (/chuva|clima|seca|tempo|geada|temperatura/.test(t)) return 'Clima';
  if (/dólar|mercado|preço|cotação|exporta|economia|juros/.test(t)) return 'Mercado';
  return 'Agronegócio';
}
async function getFeed(feed) {
  const response = await fetch(feed.url, { headers: { 'User-Agent': 'PortalServmaq/1.0 (news reader)' } });
  if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(([_, item]) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link') || (item.match(/<link\s*\/?>\s*([^\s<]+)/i) || [])[1] || '';
    const pubDate = tag(item, 'pubDate');
    const description = tag(item, 'description');
    return { title, link, description: description.slice(0, 260), source: feed.name, publishedAt: pubDate, category: category(title) };
  }).filter(item => item.title && /^https?:\/\//i.test(item.link));
}
exports.handler = async () => {
  const results = await Promise.allSettled(FEEDS.map(getFeed));
  const items = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const unique = [...new Map(items.map(item => [item.link, item])).values()];
  unique.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  const errors = results.filter(result => result.status === 'rejected').length;
  return {
    statusCode: unique.length ? 200 : 502,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    body: JSON.stringify({ items: unique.slice(0, 18), updatedAt: new Date().toISOString(), sources: FEEDS.map(f => f.name), partial: errors > 0 })
  };
};
