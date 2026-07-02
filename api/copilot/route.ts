import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service key on server
);

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

    // 1. RAG: Pull relevant data from Supabase first
    const apsMatch = query.match(/aps\s*(\d{2,3})/i);
    const courseMatch = query.match(/(engineering|medicine|law|it|commerce|education)/i);

    let context = '';
    if (apsMatch) {
      const aps = parseInt(apsMatch[1]);
      const { data: unis } = await supabase
       .from('institutions')
       .select('name, province, application_deadline_2026, aps_required')
       .lte('aps_required', aps)
       .limit(5);
      context = `Relevant SA Unis for APS ${aps}: ${JSON.stringify(unis)}`;
    }

    // 2. Ask Groq with your data as context
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are Campus Copilot for SA students 2026. Only use the provided data. Be concise. If data missing, say "I don't have that in my database yet". South African English. Rands, not $.`
        },
        { role: 'user', content: `Student asked: ${query}\n\nDatabase Context: ${context}` }
      ],
      model: 'llama-3.3-70b-versatile', // fastest + smartest free model
      temperature: 0.3,
      max_tokens: 400,
    });

    return NextResponse.json({
      reply: chatCompletion.choices[0].message.content
    }, { headers: { 'Access-Control-Allow-Origin': '*' }});

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to connect to AI' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' }});
}