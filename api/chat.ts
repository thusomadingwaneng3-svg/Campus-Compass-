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

    // Read knowledge.json the Vercel way
    const filePath = path.join(process.cwd(), 'public', 'data', 'knowledge.json');
    const knowledge = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const context = JSON.stringify(knowledge).slice(0, 3500); // Phi-3 context limit
    
    const response = await hf.textGeneration({
      model: 'microsoft/Phi-3-mini-4k-instruct', // ← comma added
      inputs: `You are Campus Compass AI for SA students. Use this data: ${context}\n\nUser: ${message}\nAnswer:`,
      parameters: { 
        max_new_tokens: 200, 
        temperature: 0.2,
        return_full_text: false // Don't repeat the prompt
      }
    });
    
    const reply = response.generated_text;
    if (!reply) throw new Error('Empty response from model');
    
    return res.status(200).json({ reply: reply.trim() });

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'AI request failed', details: err.message });
  }
}