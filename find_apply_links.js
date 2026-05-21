const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const INPUT_FILE = 'africa_schools_non_sa.json';
const OUTPUT_FILE = 'africa_schools_non_sa_with_apply.json';
const CONCURRENCY = 5; // hit 5 sites at once so you don't get blocked
const TIMEOUT = 8000;

const APPLY_KEYWORDS = ['apply', 'admission', 'admissions', 'apply-now', 'application', 'prospective', 'prospectus'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function findApplyLink(baseUrl) {
  try {
    let url = baseUrl;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    
    const { data } = await axios.get(url, { 
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0 CampusCompass Bot' }
    });
    
    const $ = cheerio.load(data);
    let foundLink = null;

    // Check nav, footer, and main buttons first
    $('a').each((_, el) => {
      if (foundLink) return;
      
      const href = $(el).attr('href');
      const text = ($(el).text() + ' + $(el).attr('aria-label') || '').toLowerCase();
      
      if (!href) return;
      
      const matches = APPLY_KEYWORDS.some(k => text.includes(k) || href.toLowerCase().includes(k));
      if (matches) {
        try {
          foundLink = new URL(href, url).href; // resolve relative URLs
        } catch {}
      }
    });

    return foundLink;
  } catch (e) {
    return null; // site down, blocked, no apply link
  }
}

async function processBatch(schools) {
  const results = [];
  
  for (let i = 0; i < schools.length; i += CONCURRENCY) {
    const batch = schools.slice(i, i + CONCURRENCY);
    console.log(`Processing ${i + 1}-${Math.min(i + CONCURRENCY, schools.length)} of ${schools.length}`);
    
    const batchResults = await Promise.all(
      batch.map(async (school) => {
        if (!school.website || school.website === 'TBA') {
          return { ...school };
        }
        
        const applyLink = await findApplyLink(school.website);
        await sleep(500); // be nice to servers
        
        return {
         ...school,
          apply_link: applyLink || 'TBA'
        };
      })
    );
    
    results.push(...batchResults);
    await sleep(1000); // pause between batches
  }
  
  return results;
}

async function main() {
  const schools = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${schools.length} schools`);
  
  const updated = await processBatch(schools);
  
  const withApply = updated.filter(s => s.apply_link && s.apply_link !== 'TBA').length;
  console.log(`✅ Found apply links for ${withApply} schools`);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updated, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);