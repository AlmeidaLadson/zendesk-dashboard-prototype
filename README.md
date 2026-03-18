# SKA Zendesk Dashboard

Dashboard interno de suporte para a equipe SKA (DirectaMES). Consome a API do Zendesk e exibe os dados em tempo real em duas visões: operacional (N1) e gerencial.

---

## O problema que resolve

A equipe de suporte da SKA usa o Zendesk para gerenciar chamados, mas a interface padrão do Zendesk não oferece:
- Visão consolidada da fila em tempo real
- Busca por chamados similares já resolvidos
- Indicadores gerenciais (SLA, CSAT, desempenho por agente, base de conhecimento)

Este dashboard preenche essa lacuna com uma interface focada no fluxo de trabalho real da equipe.

---

## Como foi construído

Aplicação web leve sem framework frontend:

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express |
| Frontend | HTML + CSS + JavaScript puro |
| Dados | API REST do Zendesk v2 |
| Cache | Em memória (TTL 5 min tickets abertos, 30 min resolvidos) |

O servidor detecta automaticamente o modo de operação:
- **Sem `.env`** → sobe em **modo MOCK** com 18 tickets e 30 resoluções simuladas
- **Com `.env` preenchido** → conecta ao Zendesk real (**modo LIVE**)

---

## Instalação

**Pré-requisito:** Node.js 18+

```bash
cd zendesk-dashboard-prototype
npm install
npm start
```

Acesse:
- **N1:** http://localhost:3000/
- **Gerencial:** http://localhost:3000/gerencial.html

Para desenvolvimento com hot-reload:
```bash
npm run dev
```

---

## Conectar ao Zendesk real

Crie um arquivo `.env` na raiz do projeto:

```env
ZENDESK_SUBDOMAIN=skasuporte
ZENDESK_EMAIL=seu-email@ska.com.br
ZENDESK_TOKEN=seu_token_aqui
```

Para gerar o token: **Zendesk Admin → Apps e Integrações → APIs → Adicionar token de API**

Após reiniciar o servidor, o badge no header muda de **MOCK** (laranja) para **LIVE** (verde).

---

## Estrutura de arquivos

```
zendesk-dashboard-prototype/
├── server.js          # Backend: API, cache, integração Zendesk
├── mock.js            # Dados simulados: 18 tickets abertos, 30 resolvidos, 5 agentes
├── package.json       # Dependências
├── .env               # Credenciais (não versionado)
└── public/
    ├── index.html     # Visão N1
    ├── gerencial.html # Visão Gerencial
    └── style.css      # Design system compartilhado
```

---

## Visão N1 — Agentes de suporte

**URL:** `http://localhost:3000/`

### KPIs no topo

| Card | O que mostra |
|------|-------------|
| Tickets abertos | Total na fila agora |
| Sem agente | Sem responsável (alarme se > 0) |
| Resolvidos hoje | Fechados no dia corrente |
| SLA em risco | Breach em menos de 60 min |
| 1ª Resposta Média | Tempo médio até primeira resposta (últimos 7 dias) |

Todos os KPIs exibem **indicador de tendência** (▲/▼) comparando com o ciclo anterior de atualização.

### Busca de Resolução

Cole o problema do ticket atual no campo de busca. O sistema compara com os 30 tickets resolvidos usando similaridade por palavras-chave e sinônimos técnicos (OEE, agente, integração, banco, etc.) e retorna até 5 resultados com percentual de match.

- Busca com **debounce automático** (dispara ao digitar)
- **Histórico** das últimas 8 buscas salvo no navegador
- **Atalho:** pressione `/` para focar o campo

### Fila Aberta

Tabela com todos os tickets abertos, ordenados por data. Clique no assunto para abrir o **modal de detalhe** com metadados, resolução documentada e histórico completo da conversa.

### Carga por Agente

Barra proporcional por agente. Agentes sem tickets aparecem em **verde** com label "livre".

### Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `/` | Focar campo de busca |
| `Esc` | Fechar modal |
| `R` | Atualizar dados manualmente |

**Atualização automática:** dados a cada 5 min · tempos recalculados localmente a cada 30s

---

## Visão Gerencial — Supervisores

**URL:** `http://localhost:3000/gerencial.html`

Seletor de período no header: **7 / 30 / 90 dias** (afeta KPIs do período e tabela de desempenho).

### KPIs — Estado atual

| Card | O que mostra |
|------|-------------|
| Tickets abertos | Total em aberto |
| SLA violados | Breach já ocorrido |
| Tempo médio 1ª resp | Média em minutos (últimos 7 dias) |
| CSAT | Satisfação do cliente em % (últimos 30 dias) |
| Idade média em aberto | Tempo médio dos tickets na fila |

### KPIs — Período selecionado

| Card | O que mostra |
|------|-------------|
| Resolvidos no período | Tickets com status solved |
| Tempo médio resolução | Horas desde abertura até resolução |
| Reabertos | Voltaram de solved para open |
| Sem agente (máx) | Pico de tickets não atribuídos |
| Base de conhecimento | % de resolvidos com nota interna documentada (verde ≥ 70%, amarelo 40–69%, vermelho < 40%) |
| Taxa de resolução | Resolvidos / (resolvidos + abertos) |

### Seções analíticas

- **Volume por Cliente** — clique em um cliente para filtrar toda a página por aquela organização
- **Problemas recorrentes** — top 5 tags dos tickets resolvidos; tags com > 3 ocorrências marcadas como "recorrente" em vermelho
- **Tempo em Aberto** — distribuição em 4 faixas (< 4h, 4–24h, 1–3 dias, > 3 dias)
- **Status de SLA** — % cumprido + contagem absoluta (ok / em risco / violados)
- **Distribuição de Prioridade** — clique em uma prioridade para filtrar a tabela de Tickets Críticos
- **Desempenho da Equipe** — por agente: resolvidos, tempo médio de resolução, tempo médio de 1ª resposta, ticket mais antigo em aberto
- **Tickets Críticos** — filtros rápidos: Todos / SLA em risco / SLA violado / Sem agente / Mais de 3 dias

### Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `R` | Atualizar dados |
| `7` | Período 7 dias |
| `3` | Período 30 dias |
| `9` | Período 90 dias |

---

## Como documentar resoluções no Zendesk

A resolução exibida no dashboard vem dos **comentários do ticket**, extraída em cascata:

1. **Última nota interna do agente** (`public: false`) — prioridade principal
2. **Último comentário público do agente** (`public: true`) — fallback

### Fluxo ao fechar um chamado

**1. Responder ao cliente (comentário público)**
> "Identificamos e corrigemos o problema. O sistema já está operando normalmente."

**2. Registrar a resolução técnica (nota interna)**
Adicione uma nota interna com:
- Causa raiz identificada
- Passos executados (scripts SQL, configurações alteradas)
- Como validar que a solução funcionou

> Notas internas são invisíveis ao cliente e aparecem destacadas em amarelo no Zendesk.

---

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `ZENDESK_SUBDOMAIN` | Sim (LIVE) | `skasuporte` | Subdomínio da conta |
| `ZENDESK_EMAIL` | Sim (LIVE) | — | E-mail do usuário de API |
| `ZENDESK_TOKEN` | Sim (LIVE) | — | Token de API gerado no Zendesk |
| `REFRESH_INTERVAL_MINUTES` | Não | `5` | TTL do cache em minutos |
| `PORT` | Não | `3000` | Porta HTTP do servidor |
