const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Sports-Feeds-Bot/1.0)'
  }
});

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
  ]
};

async function fetchFeed(feedInfo) {
  try {
    console.log(`Fetching: ${feedInfo.name}`);
    const feed = await parser.parseURL(feedInfo.url);

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
    console.error(`Error fetching ${feedInfo.name}: ${error.message}`);
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

  for (const [category, feedList] of Object.entries(feeds)) {
    console.log(`\nProcessing category: ${category}`);
    const categoryFeeds = [];

    for (const feedInfo of feedList) {
      const feedData = await fetchFeed(feedInfo);
      categoryFeeds.push(feedData);
      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    }

    allData.categories[category] = categoryFeeds;
  }

  fs.writeFileSync(
    path.join(dataDir, 'feeds.json'),
    JSON.stringify(allData, null, 2)
  );

  console.log('\nFeeds saved to data/feeds.json');
}

main().catch(console.error);
