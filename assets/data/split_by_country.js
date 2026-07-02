// split_by_country.js
const fs = require('fs');

const INPUT_FILE = 'africa_non_sa.json';
const OUTPUT_DIR = './countries';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const schools = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

const byCountry = {};

schools.forEach(school => {
  const country = (school.country || 'unknown').toLowerCase().replace(/\s+/g, '_');
  if (!byCountry[country]) byCountry[country] = [];
  byCountry[country].push(school);
});

Object.entries(byCountry).forEach(([country, list]) => {
  const filename = `${OUTPUT_DIR}/${country}.json`;
  fs.writeFileSync(filename, JSON.stringify(list, null, 2));
  console.log(`Wrote ${list.length} schools to ${filename}`);
});

console.log(`\nDone. Split into ${Object.keys(byCountry).length} country files in ${OUTPUT_DIR}/`);