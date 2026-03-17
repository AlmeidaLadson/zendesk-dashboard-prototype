'use strict';

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const { getMockData, buildMockKPIs, buildMockClients } = require('./mock');

const app = express();
app.use(express.static('public'));

const MOCK_MODE = !process.env.ZENDESK_TOKEN;
const BASE = `https://${process.env.ZENDESK_SUBDOMAIN || 'skasuporte'}.zendesk.com/api/v2`;
const AUTH = 'Basic ' + Buffer.from(
  `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_TOKEN}`
).toString('base64');
const HEADERS = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

const CACHE_TTL = (parseInt(process.env.REFRESH_INTERVAL_MINUTES) || 5) * 60 * 1000;
const SOLVED_TTL = 30 * 60 * 1000;

// Cache em memória
const cache = {
  open: { data: null, ts: 0 },
  agents: { data: null, ts: 0 },
  kpis: { data: null, ts: 0 },
  clients: { data: null, ts: 0 },
};

// Base de resoluções (refresh a cada 30min)
let resolutionDB = { data: null, ts: 0 };

// ─── Fetch autenticado com tratamento de erros ───────────────────────────────

async function fetchZendesk(path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  } catch (e) {
    throw new Error('NETWORK_ERROR');
  }
  if (res.status === 401) throw new Error('CREDENCIAIS_INVALIDAS');
  if (res.status === 403) throw new Error('SEM_PERMISSAO');
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

function errorMessage(err) {
  if (err.message === 'CREDENCIAIS_INVALIDAS')
    return 'Credenciais inválidas. Verifique email e token no arquivo .env';
  if (err.message === 'SEM_PERMISSAO')
    return 'Token sem permissão de leitura. Verifique as permissões no Zendesk Admin';
  if (err.message === 'NETWORK_ERROR')
    return 'Não foi possível conectar. Verifique o subdomínio no .env';
  return `Erro ao buscar dados: ${err.message}`;
}

// ─── Construção da base de resoluções (cascata 2 camadas) ───────────────────

async function fetchResolutionForTicket(ticket, agentIds) {
  try {
    const data = await fetchZendesk(`/tickets/${ticket.id}/comments`);
    const comments = data.comments || [];

    // Camada 1: última nota interna do agente (public: false)
    const internalNotes = comments.filter(c => !c.public && agentIds.has(c.author_id));
    if (internalNotes.length > 0) {
      return internalNotes[internalNotes.length - 1].body;
    }

    // Camada 2: último comentário público do agente (fallback)
    const publicComments = comments.filter(c => c.public && agentIds.has(c.author_id));
    if (publicComments.length > 0) {
      return publicComments[publicComments.length - 1].body;
    }
  } catch (_) { /* silencioso */ }

  return null;
}

async function buildResolutionDB() {
  const now = Date.now();
  if (resolutionDB.data && now - resolutionDB.ts < SOLVED_TTL) return resolutionDB.data;

  if (MOCK_MODE) {
    const mock = getMockData();
    resolutionDB.data = mock.solvedTickets.map(t => {
      const ticketComments = mock.comments[t.id] || [];
      const agentIds = new Set(mock.agents.map(a => a.id));

      // Camada 1: última nota interna do agente
      const internalNotes = ticketComments.filter(c => !c.public && agentIds.has(c.author_id));
      // Camada 2: último comentário público do agente
      const publicComments = ticketComments.filter(c => c.public && agentIds.has(c.author_id));
      const resolution = internalNotes.length > 0
        ? internalNotes[internalNotes.length - 1].body
        : publicComments.length > 0
          ? publicComments[publicComments.length - 1].body
          : null;

      const agent = mock.agents.find(a => a.id === t.assignee_id);
      return {
        id: t.id,
        subject: t.subject,
        tags: t.tags || [],
        organization_name: t.organization_name,
        resolution,
        solved_at: t.updated_at,
        agent_name: agent ? agent.name : 'N/A',
      };
    });
    resolutionDB.ts = now;
    return resolutionDB.data;
  }

  try {
    const [solvedData, usersData] = await Promise.all([
      fetchZendesk('/tickets.json?status=solved&sort_by=updated_at&sort_order=desc&per_page=100'),
      fetchZendesk('/users.json?role=agent'),
    ]);

    const agentIds = new Set((usersData.users || []).map(u => u.id));
    const agentMap = {};
    (usersData.users || []).forEach(u => { agentMap[u.id] = u.name; });

    const items = [];
    for (const ticket of (solvedData.tickets || [])) {
      const resolution = await fetchResolutionForTicket(ticket, agentIds);
      items.push({
        id: ticket.id,
        subject: ticket.subject,
        tags: ticket.tags || [],
        organization_name: ticket.organization_name,
        resolution,
        solved_at: ticket.updated_at,
        agent_name: agentMap[ticket.assignee_id] || 'N/A',
      });
    }

    resolutionDB.data = items;
    resolutionDB.ts = now;
    return items;
  } catch (err) {
    console.error('Erro ao construir base de resoluções:', err.message);
    return resolutionDB.data || [];
  }
}

// ─── Cache helper ───────────────────────────────────────────────────────────

function isFresh(entry, ttl) {
  return entry.data && Date.now() - entry.ts < ttl;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({ mock: MOCK_MODE });
});

app.get('/api/tickets/open', async (req, res) => {
  if (isFresh(cache.open, CACHE_TTL)) return res.json({ tickets: cache.open.data, mock: MOCK_MODE });

  if (MOCK_MODE) {
    const mock = getMockData();
    cache.open = { data: mock.openTickets, ts: Date.now() };
    return res.json({ tickets: mock.openTickets, mock: true });
  }

  try {
    const data = await fetchZendesk('/tickets.json?status=open&sort_by=created_at&sort_order=asc&per_page=100');
    // Enriquecer com organization_name via sidebar (API v2 inclui organization_id)
    cache.open = { data: data.tickets, ts: Date.now() };
    res.json({ tickets: data.tickets, mock: false });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.get('/api/tickets/solved', async (req, res) => {
  try {
    const db = await buildResolutionDB();
    res.json({ tickets: db, mock: MOCK_MODE });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.get('/api/tickets/:id/comments', async (req, res) => {
  const id = req.params.id;

  if (MOCK_MODE) {
    const mock = getMockData();
    const comments = mock.comments[id] || [];
    return res.json({ comments, mock: true });
  }

  try {
    const data = await fetchZendesk(`/tickets/${id}/comments`);
    res.json({ comments: data.comments || [], mock: false });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.get('/api/agents', async (req, res) => {
  if (isFresh(cache.agents, CACHE_TTL)) return res.json({ agents: cache.agents.data, mock: MOCK_MODE });

  if (MOCK_MODE) {
    const mock = getMockData();
    const openTickets = mock.openTickets;
    const agentsWithCount = mock.agents.map(agent => ({
      ...agent,
      open_count: openTickets.filter(t => t.assignee_id === agent.id).length,
    }));
    cache.agents = { data: agentsWithCount, ts: Date.now() };
    return res.json({ agents: agentsWithCount, mock: true });
  }

  try {
    const [usersData, openData] = await Promise.all([
      fetchZendesk('/users.json?role=agent'),
      isFresh(cache.open, CACHE_TTL)
        ? Promise.resolve({ tickets: cache.open.data })
        : fetchZendesk('/tickets.json?status=open&per_page=100'),
    ]);

    const openTickets = openData.tickets || [];
    const agentsWithCount = (usersData.users || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      open_count: openTickets.filter(t => t.assignee_id === agent.id).length,
    }));

    cache.agents = { data: agentsWithCount, ts: Date.now() };
    res.json({ agents: agentsWithCount, mock: false });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.get('/api/kpis', async (req, res) => {
  if (isFresh(cache.kpis, CACHE_TTL)) return res.json({ ...cache.kpis.data, mock: MOCK_MODE });

  if (MOCK_MODE) {
    const mock = getMockData();
    const kpis = buildMockKPIs(mock.openTickets, mock.solvedTickets);
    cache.kpis = { data: kpis, ts: Date.now() };
    return res.json({ ...kpis, mock: true });
  }

  try {
    const [openData, solvedData] = await Promise.all([
      isFresh(cache.open, CACHE_TTL)
        ? Promise.resolve({ tickets: cache.open.data })
        : fetchZendesk('/tickets.json?status=open&per_page=100'),
      fetchZendesk('/tickets.json?status=solved&sort_by=updated_at&sort_order=desc&per_page=50'),
    ]);

    const openTickets = openData.tickets || [];
    const solvedTickets = solvedData.tickets || [];
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const slaBreached = openTickets.filter(t => {
      const metric = t.sla_policy?.policy_metrics?.[0];
      return metric && new Date(metric.breach_at).getTime() < now;
    }).length;

    const slaAtRisk = openTickets.filter(t => {
      const metric = t.sla_policy?.policy_metrics?.[0];
      if (!metric) return false;
      const breachTime = new Date(metric.breach_at).getTime();
      return breachTime > now && breachTime - now < 60 * 60 * 1000;
    }).length;

    const solvedToday = solvedTickets.filter(t => new Date(t.updated_at) >= todayStart).length;
    const unassigned = openTickets.filter(t => !t.assignee_id).length;

    const avgResolution = solvedTickets.reduce((acc, t) => {
      const created = new Date(t.created_at).getTime();
      const updated = new Date(t.updated_at).getTime();
      return acc + (updated - created) / 3600000;
    }, 0) / (solvedTickets.length || 1);

    const kpis = {
      open: openTickets.length,
      unassigned,
      solvedToday,
      slaAtRisk,
      slaBreached,
      avgFirstReplyMinutes: null,
      csat: null,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      reopened: 0,
    };

    cache.kpis = { data: kpis, ts: Date.now() };
    res.json({ ...kpis, mock: false });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.get('/api/clients', async (req, res) => {
  if (isFresh(cache.clients, CACHE_TTL)) return res.json({ clients: cache.clients.data, mock: MOCK_MODE });

  if (MOCK_MODE) {
    const mock = getMockData();
    const clients = buildMockClients(mock.openTickets);
    cache.clients = { data: clients, ts: Date.now() };
    return res.json({ clients, mock: true });
  }

  try {
    const openData = isFresh(cache.open, CACHE_TTL)
      ? { tickets: cache.open.data }
      : await fetchZendesk('/tickets.json?status=open&per_page=100');

    const clients = buildMockClients(openData.tickets || []);
    cache.clients = { data: clients, ts: Date.now() };
    res.json({ clients, mock: false });
  } catch (err) {
    res.status(502).json({ error: errorMessage(err) });
  }
});

// ─── Inicialização ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const mode = MOCK_MODE ? 'MOCK (sem credenciais Zendesk)' : 'LIVE (Zendesk conectado)';
  console.log(`\nDashboard SKA rodando em http://localhost:${PORT}`);
  console.log(`Modo: ${mode}`);
  console.log(`N1:        http://localhost:${PORT}/`);
  console.log(`Gerencial: http://localhost:${PORT}/gerencial.html\n`);

  // Pré-carregar base de resoluções ao iniciar
  buildResolutionDB()
    .then(db => console.log(`Base de resoluções carregada: ${db.length} tickets`))
    .catch(err => console.error('Erro ao pré-carregar resoluções:', err.message));

  // Refresh periódico da base de resoluções
  setInterval(() => {
    resolutionDB.ts = 0; // forçar rebuild
    buildResolutionDB()
      .then(db => console.log(`[refresh] Base de resoluções: ${db.length} tickets`))
      .catch(err => console.error('[refresh] Erro:', err.message));
  }, SOLVED_TTL);
});
