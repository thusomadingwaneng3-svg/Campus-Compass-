import { ExpoRequest, ExpoResponse } from 'expo-router/server';

type UserContext = {
  name?: string;
  aps?: string;
  course?: string;
  campus?: string;
};

const SEARCH_TIMEOUT_MS = 7000;
const OPENAI_TIMEOUT_MS = 8000;

export async function POST(req: ExpoRequest) {
  try {
    const { message, userContext }: { message: string; userContext: UserContext } = await req.json();

    if (!message) {
      return ExpoResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const q = message.toLowerCase();
    const needsSearch = q.includes('deadline') || q.includes('open') || q.includes('bursary') ||
                       q.includes('nsfas') || q.includes('apply') || q.includes('closing date') ||
                       q.includes('when') || q.includes('closing');

    let searchResults = '';

    if (needsSearch && process.env.SERPER_API_KEY) {
      searchResults = await searchWeb(message).catch(() => '');
    }

    const reply = await callOpenAI(message, userContext, searchResults);

    return ExpoResponse.json({ content: reply });

  } catch (e: any) {
    console.error('Copilot API error:', e);
    return ExpoResponse.json(
      { content: 'Sorry, I had an issue. Try again in a minute.' },
      { status: 200 }
    );
  }
}

async function searchWeb(query: string): Promise<string> {
  if (!process.env.SERPER_API_KEY) return '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: `${query} 2026 site:.za`,
        num: 5
      })
    });

    clearTimeout(timeout);

    if (!res.ok) return '';

    const data = await res.json();

    const snippets = (data.organic || [])
      .slice(0, 3)
      .map((r: any) => `${r.title}\n${r.snippet}\nSource: ${r.link}`)
      .join('\n\n');

    return snippets;
  } catch (e) {
    console.error('Serper error:', e);
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI(
  message: string,
  userContext: UserContext,
  searchResults: string
): Promise<string> {

  if (!process.env.OPENAI_API_KEY) {
    return 'OpenAI key not set. Check Vercel env vars.';
  }

  const systemPrompt = `You are Campus Copilot for South African students in 2026.

User profile:
- Name: ${userContext.name || 'Not set'}
- APS: ${userContext.aps || 'Not set'}
- Course: ${userContext.course || 'Not set'}
- Campus: ${userContext.campus || 'Not set'}

Rules:
1. Use the web search results below for deadlines and current info. Always cite the source link.
2. If info is missing, say so. Do not make up deadlines.
3. Be concise, practical, SA English. No fluff.
4. If user asks to apply, pre-fill what you can from their profile.
5. If APS is missing, tell them to use the APS calculator first.

Current web results:
${searchResults || 'No search results available.'}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error:', err);
      return searchResults 
        ? `I can’t reach AI right now, but here’s what I found:\n\n${searchResults}`
        : 'AI is down right now. Try again in a minute.';
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || 'No response from AI.';

  } catch (e: any) {
    console.error('OpenAI fetch error:', e);
    return searchResults 
      ? `Request timed out. Here’s what I found:\n\n${searchResults}`
      : 'Request timed out. Try again.';
  } finally {
    clearTimeout(timeout);
  }
}