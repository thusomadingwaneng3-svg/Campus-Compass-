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
    const context = JSON.stringify(knowledge).slice(0, 3000);

    // Llama 3 8B works on featherless-ai free tier
    const response = await hf.chatCompletion({
      model: 'meta-llama/Meta-Llama-3-8B-Instruct',
      messages: [
        {
          role: 'system',
          content: `You are Campus Compass AI. Answer SA university questions using this data: ${context}. Keep answers under 80 words.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('Empty response from model');

    return res.status(200).json({ reply: reply.trim() });

  } catch (err: any) {
    console.error('API Error:', err.message, err.httpResponse?.body);
    return res.status(500).json({ error: 'AI request failed', details: err.message });
  }
}