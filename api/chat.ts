import { HfInference } from '@huggingface/inference';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import knowledge from '../public/data/knowledge.json';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { message } = req.body;
  const context = JSON.stringify(knowledge).slice(0, 12000); // stay under token limit
  
  const response = await hf.textGeneration({
    model: 'microsoft/Phi-3-mini-4k-instruct'
    inputs: `Context: ${context}\n\nUser: ${message}\n\nAnswer as Campus Compass AI:`,
    parameters: { max_new_tokens: 500 }
  });
  
  res.status(200).json({ reply: response.generated_text });
}