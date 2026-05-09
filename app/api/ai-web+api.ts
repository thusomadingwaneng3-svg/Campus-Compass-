import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SERPER_KEY = process.env.SERPER_API_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 1. Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError ||!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Check if user is Pro
    const { data: profile, error: profileError } = await supabase
     .from('profiles')
     .select('is_pro, web_search_count, web_search_reset_date')
     .eq('id', user.id)
     .single();

    if (profileError ||!profile?.is_pro) {
      return Response.json({ error: 'Not a Pro user' }, { status: 403 });
    }

    // 3. Check monthly limit - 5 searches/month for R5 plan
    const today = new Date();
    const resetDate = profile.web_search_reset_date? new Date(profile.web_search_reset_date) : null;
    let searchCount = profile.web_search_count?? 0;

    if (!resetDate || resetDate.getMonth()!== today.getMonth() || resetDate.getFullYear()!== today.getFullYear()) {
      // Reset counter monthly
      await supabase.from('profiles')
       .update({ web_search_count: 0, web_search_reset_date: today.toISOString() })
       .eq('id', user.id);
      searchCount = 0;
    }

    if (searchCount >= 5) {
      return Response.json({
        error: 'Monthly web search limit reached',
        message: 'You’ve used all 5 Pro web searches for this month. Limit resets on the 1st.'
      }, { status: 429 });
    }

    // 4. Parse request
    const { message } = await req.json();
    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    // 5. Check cache first
    const cacheKey = `websearch:${Buffer.from(message).toString('base64').slice(0, 32)}`;
    const { data: cached } = await supabase.from('web_search_cache')
     .select('answer, created_at')
     .eq('key', cacheKey)
     .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
     .single();

    if (cached) {
      return Response.json({
        text: cached.answer,
        cached: true,
        remaining: 5 - searchCount
      });
    }

    // 6. Search the web with Serper
    const searchRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: message, num: 5, gl: 'za', hl: 'en' })
    });

    if (!searchRes.ok) {
      return Response.json({ error: 'Web search failed' }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const context = searchData.organic
     ?.map((r: any, i: number) => `[${i+1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`)
     .join('\n\n') || 'No results found.';

    // 7. Call OpenAI with context
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Thuso AI, a SA student assistant. Answer using ONLY the provided web context.
            Cite sources as [1], [2] at the end of sentences.
            If the answer isn’t in the context, say "I couldn’t find that online".
            Keep answers short, practical, and SA-focused. Date today: 9 May 2026.`
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${message}`
          }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || 'No answer generated.';

    // 8. Save to cache and increment counter
    const newCount = searchCount + 1;
    await supabase.from('web_search_cache').insert({ key: cacheKey, answer: text });
    await supabase.from('profiles')
     .update({ web_search_count: newCount })
     .eq('id', user.id);

    return Response.json({
      text,
      remaining: 5 - newCount
    });

  } catch (err: any) {
    console.error('AI-web error:', err);
    return Response.json({ error: 'Failed to fetch answer' }, { status: 500 });
  }
}