const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Sports-Feeds-Bot/1.0)'
  }
});

const FETCH_TIMEOUT = 10000; // 10 second hard timeout per feed

const feeds = {
  Yankees: [
    { name: 'Pinstripe Alley', url: 'https://www.pinstripealley.com/rss/current.xml' },
    { name: 'NY Post Yankees', url: 'https://nypost.com/tag/new-york-yankees/feed/' }
  ],
  Giants: [
    { name: 'Big Blue View', url: 'https://www.bigblueview.com/rss/current.xml' },
    { name: 'Big Blue Interactive', url: 'https://bigblueinteractive.com/feed' }
  ],
  Knicks: [
    { name: 'Posting and Toasting', url: 'https://www.postingandtoasting.com/rss/current.xml' },
    { name: 'NY Post Knicks', url: 'https://nypost.com/tag/new-york-knicks/feed/' }
  ],
  Rangers: [
    { name: 'Forever Blueshirts', url: 'https://foreverblueshirts.com/feed' }
  ],
  UFC: [
    { name: 'MMA Fighting', url: 'https://www.mmafighting.com/rss/current.xml' },
    { name: 'MMA Junkie', url: 'https://mmajunkie.usatoday.com/feed' },
    { name: 'Bloody Elbow', url: 'https://www.bloodyelbow.com/rss/current.xml' }
  ],
  'World News': [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best' },
    { name: 'AP News', url: 'https://apnews.com/world-news.rss' }
  ]
};

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    })
  ]);
}

async function fetchFeed(feedInfo) {
  const start = Date.now();
  try {
    console.log(`Fetching: ${feedInfo.name}...`);
    const feed = await withTimeout(
      parser.parseURL(feedInfo.url),
      FETCH_TIMEOUT
    );
    console.log(`✓ ${feedInfo.name} (${Date.now() - start}ms)`);

    const items = feed.items.slice(0, 15).map(item => ({
      title: item.title || 'No title',
      link: item.link || '#',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      description: item.contentSnippet || item.content || ''
    }));

    return {
      name: feedInfo.name,
      url: feedInfo.url,
      siteUrl: feed.link || feedInfo.url,
      items,
      lastFetched: new Date().toISOString()
    };
  } catch (error) {
    console.error(`✗ ${feedInfo.name} (${Date.now() - start}ms): ${error.message}`);
    return {
      name: feedInfo.name,
      url: feedInfo.url,
      siteUrl: feedInfo.url,
      items: [],
      lastFetched: new Date().toISOString(),
      error: error.message
    };
  }
}

async function main() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const allData = {
    lastUpdated: new Date().toISOString(),
    categories: {}
  };

  // Flatten all feeds with their category
  const allFeeds = Object.entries(feeds).flatMap(([category, feedList]) =>
    feedList.map(feed => ({ ...feed, category }))
  );

  console.log(`Fetching ${allFeeds.length} feeds in parallel...\n`);
  const results = await Promise.all(allFeeds.map(fetchFeed));

  // Group results back by category
  for (const result of results) {
    const feed = allFeeds.find(f => f.name === result.name);
    if (!allData.categories[feed.category]) {
      allData.categories[feed.category] = [];
    }
    allData.categories[feed.category].push(result);
  }

  fs.writeFileSync(
    path.join(dataDir, 'feeds.json'),
    JSON.stringify(allData, null, 2)
  );

  console.log('\nFeeds saved to data/feeds.json');
}

main().catch(console.error);
