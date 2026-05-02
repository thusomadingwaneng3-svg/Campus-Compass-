import { HfInference } from '@huggingface/inference';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const filePath = path.join(process.cwd(), 'public', 'data', 'knowledge.json');
    const knowledge = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // FILTER THE JSON - only send relevant data to stay under 8k tokens
    const lowerMsg = message.toLowerCase();
    
    const allInstitutions = [
     ...knowledge.institutions,
     ...(knowledge.private_institutions || []),
     ...(knowledge.tvet_colleges || [])
    ];

    const relevantInstitutions = allInstitutions.filter(i => {
      const nameMatch = lowerMsg.includes(i.name.toLowerCase());
      const shortMatch = i.short && lowerMsg.includes(i.short.toLowerCase());
      // Handle common abbreviations
      const vutMatch = lowerMsg.includes('vut') && i.short === 'VUT';
      const uctMatch = lowerMsg.includes('uct') && i.short === 'UCT';
      const witsMatch = lowerMsg.includes('wits') && i.short === 'WITS';
      return nameMatch || shortMatch || vutMatch || uctMatch || witsMatch;
    }).slice(0, 3);

    const relevantBursaries = lowerMsg.includes('nsfas') || lowerMsg.includes('bursary') || lowerMsg.includes('fund')
     ? knowledge.bursaries 
      : [];
      
    const relevantFaqs = knowledge.faqs.filter(f => {
      const keywords = f.q.toLowerCase().split(' ');
      return keywords.some(word => word.length > 3 && lowerMsg.includes(word));
    }).slice(0, 2);

    const context = JSON.stringify({
      institutions: relevantInstitutions,
      bursaries: relevantBursaries,
      faqs: relevantFaqs
    });

    console.log('VUT in context:', context.includes('VUT'));
    console.log('Context size:', context.length);

    const response = await hf.chatCompletion({
      model: 'meta-llama/Meta-Llama-3-8B-Instruct',
      messages: [
        {
          role: 'system',
          content: `You are Campus Compass AI for South African students. Answer using ONLY this JSON data: ${context}

STRICT RULES:
1. Reply in natural sentences. Never output JSON, brackets [], or {"key":"value"} format.
2. If asked about VUT: "VUT email: info@vut.ac.za, phone: 016 950 9000. Applications close: 30 September 2025."
3. If asked about NSFAS: "NSFAS: 31 January 2026. Apply at nsfas.org.za."
4. If answer not in JSON: reply "Not in my database for 2026."
5. Maximum 50 words. Be direct. No apologies or extra text.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 120,
      temperature: 0.1
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('Empty response from model');

    return res.status(200).json({ reply: reply.trim() });

  } catch (err: any) {
    console.error('API Error:', err.message);
    return res.status(500).json({ error: 'AI request failed', details: err.message });
  }
}