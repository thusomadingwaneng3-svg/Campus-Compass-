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

    // FILTER THE JSON - don't send 45k tokens
    const lowerMsg = message.toLowerCase();
    
    const relevantInstitutions = [
     ...knowledge.institutions,
     ...(knowledge.private_institutions || []),
     ...(knowledge.tvet_colleges || [])
    ].filter(i => {
      const nameMatch = lowerMsg.includes(i.name.toLowerCase());
      const shortMatch = i.short && lowerMsg.includes(i.short.toLowerCase());
      const vutMatch = lowerMsg.includes('vut') && i.short === 'VUT';
      return nameMatch || shortMatch || vutMatch;
    }).slice(0, 3); // Max 3 institutions to keep prompt small

    const relevantBursaries = lowerMsg.includes('nsfas') || lowerMsg.includes('bursary') 
     ? knowledge.bursaries : [];
      
    const relevantFaqs = knowledge.faqs.filter(f => 
      lowerMsg.includes(f.q.toLowerCase().split(' ')[0]) || 
      lowerMsg.includes(f.q.toLowerCase().split(' ')[1])
    ).slice(0, 2);

    const context = JSON.stringify({
      institutions: relevantInstitutions,
      bursaries: relevantBursaries,
      faqs: relevantFaqs
    });

    console.log('VUT in context:', context.includes('VUT'));
    console.log('Context size:', context.length); // Should be ~500-2000 chars now

    const response = await hf.chatCompletion({
      model: 'meta-llama/Meta-Llama-3-8B-Instruct',
      messages: [
        {
          role: 'system',
          content: `You are Campus Compass AI. Answer using ONLY this JSON: ${context}. If the answer exists, state it directly. If not in JSON, reply "Not in my database for 2026." Be direct. Max 50 words.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 100,
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