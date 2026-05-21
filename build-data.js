const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, 'public', 'data');
const SCHOOLS_DIR = path.join(ROOT_DIR, 'schools');
const INDEX_PATH = path.join(SCHOOLS_DIR, 'index.json');
const OUT_FILE = path.join(ROOT_DIR, 'knowledge-lite.json');

function buildLite() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('ERROR: schools/index.json not found at', INDEX_PATH);
    process.exit(1);
  }

  const knowledge = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'knowledge.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

  // Load all school files
  let allSchools = [];
  for (const prov of Object.keys(index)) {
    const file = index[prov].file; // e.g. /data/schools/schools_eastern_cape.json
    const filePath = path.join(__dirname, 'public', file); // resolve to public/data/schools/...

    if (!fs.existsSync(filePath)) {
      console.warn('Missing school file:', filePath);
      continue;
    }

    const schools = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allSchools = allSchools.concat(schools);
  }

  console.log(`Loaded ${allSchools.length} schools`);

  // Build lite version - only keep searchable fields
  const liteSchools = allSchools.map(s => ({
    id: s.id,
    name: s.name,
    short: s.short || s.name,
    city: s.city || s.location || '',
    province: s.province || '',
    type: 'High School',
    lat: s.lat || s.latitude || null,
    lng: s.lng || s.longitude || null,
    phone: s.phone || s.contact || '',
    email: s.email || '',
    _type: 'school'
  }));

  const lite = {
    institutions: knowledge.institutions || [],
    tvet_colleges: knowledge.tvet_colleges || [],
    private_institutions: knowledge.private_institutions || [],
    schools: liteSchools,
    national_emergency: knowledge.national_emergency || {}
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(lite));
  console.log(`Built knowledge-lite.json with ${liteSchools.length} schools`);
  console.log('File size:', (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2), 'MB');
}

buildLite();