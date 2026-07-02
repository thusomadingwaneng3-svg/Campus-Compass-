import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Move supabase.ts to root/lib/

export async function POST(req: Request) {
  const { query } = await req.json();

  // Basic parsing. V93.1 we’ll use OpenAI to extract fields
  const apsMatch = query.match(/aps\s*(\d+)/i);
  const aps = apsMatch? parseInt(apsMatch[1]) : 999;
  const budgetMatch = query.match(/<r(\d+)/i);
  const budget = budgetMatch? parseInt(budgetMatch[1]) * 1000 : 9999;

  const { data: unis } = await supabase
   .from('institutions')
   .select('name, min_aps, application_deadline_2026, website')
   .lte('min_aps', aps)
   .limit(3);

  const { data: burs } = await supabase
   .from('bursaries')
   .select('name, deadline, amount, region')
   .eq('region', 'SA')
   .limit(3);

  const reply = `**Top 3 Unis for APS ${aps}:**\n${unis?.map(u => `• ${u.name} | Min APS: ${u.min_aps} | Closes: ${u.application_deadline_2026}`).join('\n') || 'None found'}\n\n**Top 3 SA Bursaries:**\n${burs?.map(b => `• ${b.name} | R${b.amount || '?' } | Closes: ${b.deadline}`).join('\n') || 'None found'}\n\nReply with "Engineering" or "Medicine" to filter.`;

  return NextResponse.json({ reply });
}