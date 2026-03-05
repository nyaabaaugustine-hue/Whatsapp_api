const fs = require('fs');

function buildConversations(raw) {
  const messages = raw.filter(r => r.eventType === 'message' && r.sessionId);
  const bySession = {};
  for (const m of messages) {
    const sid = m.sessionId;
    if (!bySession[sid]) bySession[sid] = [];
    bySession[sid].push(m);
  }
  const convos = Object.entries(bySession).map(([sid, msgs]) => {
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return {
      session_id: sid,
      started_at: msgs[0]?.timestamp || new Date().toISOString(),
      last_message_at: msgs[msgs.length - 1]?.timestamp || new Date().toISOString(),
      message_count: msgs.length,
      messages: msgs.map(mm => ({
        session_id: sid,
        role: mm.data?.sender === 'user' ? 'user' : 'assistant',
        content: mm.data?.text || '',
        metadata: null,
        created_at: mm.timestamp || new Date().toISOString(),
      })),
    };
  });
  return convos;
}

function buildConversationsFromSessions(sessions) {
  return sessions.map(session => ({
    session_id: session.id,
    started_at: session.startTime.toISOString(),
    last_message_at: session.lastActivity.toISOString(),
    message_count: session.messages.length,
    lead_temperature: session.leadTemperature,
    intent: session.intent,
    user_name: session.userInfo.name,
    user_phone: session.userInfo.phone,
    user_email: session.userInfo.email,
    messages: session.messages.map(msg => ({
      session_id: session.id,
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
      metadata: null,
      created_at: msg.timestamp.toISOString(),
    })),
  }));
}

function buildEventsFromLogs(logs) {
  return logs.map(log => ({
    session_id: 'unknown',
    event_type: log.intent || 'event',
    event_data: { messageText: log.messageText, recommended_car_id: log.recommended_car_id },
    lead_temperature: log.lead_temperature,
    intent: log.intent,
    created_at: log.timestamp.toISOString(),
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'drivemond2026';
  const key = req.headers['x-admin-key'];
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const type = (req.query?.type || req.url.split('type=')[1] || '').toString();
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      if (type.includes('conversations')) {
        const { data: sessions, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && sessions && sessions.length > 0) {
          const conversationsWithMessages = await Promise.all(
            sessions.map(async (session) => {
              const { data: messages } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', session.session_id)
                .order('message_timestamp', { ascending: true });

              return {
                session_id: session.session_id,
                started_at: session.start_time,
                last_message_at: session.last_activity,
                message_count: messages?.length || 0,
                lead_temperature: session.lead_temperature,
                intent: session.intent,
                user_name: session.user_name,
                user_phone: session.user_phone,
                user_email: session.user_email,
                messages: (messages || []).map(msg => ({
                  session_id: session.session_id,
                  role: msg.sender === 'user' ? 'user' : 'assistant',
                  content: msg.text,
                  metadata: null,
                  created_at: msg.message_timestamp,
                })),
              };
            })
          );
          return res.status(200).json(conversationsWithMessages);
        }
      }

      if (type.includes('events')) {
        const { data: logs, error } = await supabase
          .from('tracking_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && logs && logs.length > 0) {
          const events = logs.map(log => ({
            session_id: log.session_id || 'unknown',
            event_type: log.intent || 'event',
            event_data: { messageText: log.message_text, recommended_car_id: log.recommended_car_id },
            lead_temperature: log.lead_temperature,
            intent: log.intent,
            created_at: log.created_at,
          }));
          return res.status(200).json(events);
        }
      }

      if (type.includes('stats')) {
        const [sessionsRes, logsRes, bookingsRes] = await Promise.all([
          supabase.from('chat_sessions').select('*', { count: 'exact' }),
          supabase.from('tracking_logs').select('*'),
          supabase.from('bookings').select('*', { count: 'exact' }),
        ]);

        const sessions = sessionsRes.data || [];
        const logs = logsRes.data || [];
        const bookingsCount = bookingsRes.count || 0;

        const hotLeads = sessions.filter(s => s.lead_temperature === 'hot').length;
        const warmLeads = sessions.filter(s => s.lead_temperature === 'warm').length;
        const coldLeads = sessions.filter(s => s.lead_temperature === 'cold').length;
        
        const totalMessages = logs.filter(l => l.intent === 'message' || l.message_text).length;

        const stats = {
          totalSessions: sessions.length,
          totalMessages,
          hotLeads,
          warmLeads,
          coldLeads,
          bookings: bookingsCount,
        };
        return res.status(200).json(stats);
      }
    }
  } catch (err) {
    console.error('Supabase error, falling back to file:', err);
  }

  const LOG_FILE = '/tmp/abena_events.jsonl';
  const lines = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean) : [];
  const raw = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const events = raw.map((r) => ({
    session_id: r.sessionId || 'unknown',
    event_type: r.eventType || 'event',
    event_data: r.data || null,
    lead_temperature: r.data?.lead_temperature || (r.eventType === 'booking' ? 'hot' : 'unknown'),
    intent: r.data?.intent || '',
    created_at: r.timestamp || new Date().toISOString(),
  }));

  let convosCache = null;
  const getConvos = () => {
    if (!convosCache) convosCache = buildConversations(raw);
    return convosCache;
  };

  if (type.includes('events')) {
    return res.status(200).json(events);
  }

  if (type.includes('conversations')) {
    const convos = getConvos();
    return res.status(200).json(convos);
  }

  if (type.includes('stats')) {
    const conversations = getConvos();
    const hotLeads = events.filter(e => e.lead_temperature === 'hot').length;
    const warmLeads = events.filter(e => e.lead_temperature === 'warm').length;
    const coldLeads = events.filter(e => e.lead_temperature === 'cold').length;
    const bookings = events.filter(e => e.event_type === 'booking').length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.message_count, 0);
    const out = {
      totalSessions: conversations.length,
      totalMessages,
      hotLeads, warmLeads, coldLeads,
      bookings,
    };
    return res.status(200).json(out);
  }

  return res.status(400).json({ error: 'Bad request' });
}
