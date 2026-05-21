import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

// Changed from 'public/data' to 'api/data'
const dataDir = path.join(process.cwd(), 'api', 'data');

function loadData() {
  try {
    return {
      funding: JSON.parse(fs.readFileSync(path.join(dataDir, 'funding.json'), 'utf8')),
      bursaries: JSON.parse(fs.readFileSync(path.join(dataDir, 'africa_bursaries.json'), 'utf8')),
      emergency: JSON.parse(fs.readFileSync(path.join(dataDir, 'africa_emergency.json'), 'utf8')),
      schools: JSON.parse(fs.readFileSync(path.join(dataDir, 'schools_africa.json'), 'utf8')),
      knowledge: JSON.parse(fs.readFileSync(path.join(dataDir, 'knowledge.json'), 'utf8')),
      nonSa: JSON.parse(fs.readFileSync(path.join(dataDir, 'africa_non_sa.json'), 'utf8')),
    };
  } catch (e) {
    console.error('loadData error:', e);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/plain');

  try {
    if (req.method!== 'POST') {
      return res.status(200).send('Campus Compass USSD API is live');
    }

    const text = req.body?.text || '';
    const data = loadData();

    if (!data) {
      return res.status(200).send('END Server error. Check JSON files.');
    }

    let levels = String(text).split('*').filter(x => x!== '');
    let lastInput = levels[levels.length - 1] || '';

    if (lastInput === '0' && levels.length > 1) {
      levels.pop();
      lastInput = levels[levels.length - 1] || '';
    }

    let response = '';

    if (levels.length === 0) {
      response = 'CON Campus Compass\n1. Find Campus\n2. Funding/Bursaries\n3. Emergency\n4. Knowledge';
    } else if (levels.length === 1) {
      if (lastInput === '1') {
        response = 'CON 0. Back\nEnter city/province:';
      } else if (lastInput === '2') {
        response = 'CON 0. Back\n1. Bursaries\n2. Funding\n3. Non-SA';
      } else if (lastInput === '3') {
        response = 'CON 0. Back\n1. SA Emergency\n2. Africa Emergency';
      } else if (lastInput === '4') {
        response = 'CON 0. Back\nEnter topic to search:';
      } else {
        response = 'END Invalid option';
      }
    } else {
      if (levels[0] === '1') {
        const query = lastInput.toLowerCase();
        const results = data.schools.filter(s =>
          s.name?.toLowerCase().includes(query) ||
          s.city?.toLowerCase().includes(query)
        ).slice(0, 3);

        response = results.length === 0
        ? 'END 0. Back\nNo campuses found'
          : 'END 0. Back\n' + results.map(s => `${s.name}, ${s.city}`).join('\n');
      } else if (levels[0] === '2') {
        if (lastInput === '1') {
          const results = data.bursaries.slice(0, 3);
          response = 'END 0. Back\n' + results.map(b => b.name).join('\n');
        } else if (lastInput === '2') {
          const results = data.funding.slice(0, 3);
          response = 'END 0. Back\n' + results.map(f => f.name).join('\n');
        } else if (lastInput === '3') {
          const results = data.nonSa.slice(0, 3);
          response = 'END 0. Back\n' + results.map(n => `${n.name}, ${n.country}`).join('\n');
        } else {
          response = 'END Invalid option';
        }
      } else if (levels[0] === '3') {
        if (lastInput === '1') {
          const results = data.emergency.filter(e => e.country === 'South Africa').slice(0, 3);
          response = 'END 0. Back\n' + results.map(e => `${e.service}: ${e.number}`).join('\n');
        } else if (lastInput === '2') {
          const results = data.emergency.filter(e => e.country!== 'South Africa').slice(0, 3);
          response = 'END 0. Back\n' + results.map(e => `${e.country}: ${e.number}`).join('\n');
        } else {
          response = 'END Invalid option';
        }
      } else if (levels[0] === '4') {
        const query = lastInput.toLowerCase();
        const results = data.knowledge.filter(k =>
          k.topic?.toLowerCase().includes(query)
        ).slice(0, 3);

        response = results.length === 0
        ? 'END 0. Back\nNo info found'
          : 'END 0. Back\n' + results.map(k => `${k.topic}: ${k.summary}`).join('\n');
      }
    }

    if (response.length > 160) {
      response = response.substring(0, 157) + '...';
    }

    return res.status(200).send(response);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(200).send('END Service temporarily unavailable');
  }
}