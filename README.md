# Documentação — SKA Zendesk Dashboard

Dashboard interno de suporte para a equipe SKA (DirectaMES), integrado ao Zendesk. Oferece duas visões: uma operacional para agentes N1 e uma gerencial para supervisores.

---

## O que é o projeto

Uma aplicação web leve (Node.js + HTML puro) que consome a API do Zendesk e exibe os dados em um painel em tempo real. Funciona em **modo MOCK** (dados simulados) enquanto as credenciais reais não estão configuradas, e em **modo LIVE** assim que o arquivo `.env` for preenchido com o token de acesso.

---

## Estrutura de arquivos

```
zendesk-dashboard-prototype/
├── server.js          # Servidor Express — API backend, cache e integração com Zendesk
├── mock.js            # Dados simulados (tickets, agentes, comentários, KPIs)
├── package.json       # Dependências e scripts npm
├── .env               # Credenciais (não versionado — criar manualmente)
└── public/
    ├── index.html     # Visão N1 — painel operacional para agentes
    ├── gerencial.html # Visão Gerencial — painel analítico para supervisores
    └── style.css      # Estilos compartilhados entre as duas visões
```

### `server.js`
Coração do sistema. Responsável por:
- Servir os arquivos estáticos da pasta `public/`
- Expor endpoints REST (`/api/tickets/open`, `/api/tickets/solved`, `/api/agents`, `/api/kpis`, `/api/clients`, `/api/status`)
- Gerenciar um **cache em memória** com TTL de 5 minutos para evitar excesso de chamadas à API do Zendesk
- Detectar automaticamente o modo de operação: se `ZENDESK_TOKEN` não estiver no `.env`, ativa o **modo MOCK**
- Construir uma **base de resoluções** a partir dos comentários dos tickets resolvidos, com refresh a cada 30 minutos

A resolução de cada ticket é extraída com a seguinte cascata de prioridade:
1. **Nota interna do agente** (`public: false`) — fonte principal; invisível ao cliente
2. **Último comentário público do agente** (`public: true`) — fallback caso não haja nota interna

### `mock.js`
Gera dados realistas e dinâmicos para uso sem credenciais:
- 8 tickets abertos com diferentes prioridades, clientes e status de SLA
- 15 tickets resolvidos, cada um com comentários simulados seguindo o padrão de duas camadas:
  - Comentário público (`public: true`): resposta educada ao cliente, sem jargão técnico
  - Nota interna (`public: false`): descrição técnica completa do que foi feito — esta é a resolução exibida no dashboard
- 3 agentes fictícios (Lucas Almeida, Marina Souza, Rafael Costa)
- Funções `buildMockKPIs()` e `buildMockClients()` que calculam métricas a partir dos dados simulados

### `public/index.html` — Visão N1
Interface para os agentes de suporte. Detalhes na seção [Como usar — Visão N1](#visão-n1).

### `public/gerencial.html` — Visão Gerencial
Interface para supervisores e gestores. Detalhes na seção [Como usar — Visão Gerencial](#visão-gerencial).

### `public/style.css`
Folha de estilos compartilhada. Define o design system completo: cores, cards, tabelas, badges de prioridade, indicadores de SLA, modal de detalhe e layout responsivo.

---

## Como instalar

**Pré-requisito:** Node.js 18 ou superior.

```bash
# 1. Entrar na pasta do projeto
cd C:\Users\ladson\ska-dashboard\zendesk-dashboard-prototype

# 2. Instalar as dependências
npm install

# 3. Iniciar o servidor
npm start
```

O dashboard estará disponível em:
- **N1:** http://localhost:3000/
- **Gerencial:** http://localhost:3000/gerencial.html

Sem o arquivo `.env`, o servidor sobe automaticamente em **modo MOCK** com dados simulados — nenhuma configuração adicional é necessária para testar.

Para desenvolvimento com reinício automático ao salvar:
```bash
npm run dev
```

---

## Como usar

### Visão N1

Acesse: `http://localhost:3000/`

Destinada aos **agentes de suporte** que precisam monitorar e atender a fila de tickets em tempo real.

**KPIs no topo:**
| Card | O que mostra |
|------|-------------|
| Tickets abertos | Total atual na fila |
| Sem agente | Tickets sem responsável (alarme visual se > 0) |
| Resolvidos hoje | Tickets fechados no dia corrente |
| SLA em risco | Tickets com breach em menos de 60 minutos |

**Busca de Resolução:**
- Cole o problema do ticket atual no campo de busca e clique em **Buscar** (ou pressione Enter)
- O sistema compara o texto com os tickets resolvidos usando um algoritmo de similaridade por palavras-chave e sinônimos técnicos (OEE, agente, inspeção CEP, etc.)
- Exibe até 5 resultados similares com percentual de similaridade e a resolução documentada
- Clique em qualquer resultado para abrir o detalhe completo

**Fila Aberta:**
- Tabela com todos os tickets abertos ordenados por data de criação
- Colunas: ID, Assunto, Cliente, Prioridade, Tempo aberto (colorido: verde < 2h, amarelo < 8h, vermelho > 8h), Agente, SLA restante
- Clique no assunto de qualquer ticket para abrir o **modal de detalhe**, que mostra metadados, resolução documentada (se houver) e o histórico completo da conversa
- No modal, o botão **Buscar similares** pré-preenche a busca com o assunto do ticket

**Carga por Agente:**
- Barra de progresso proporcional mostrando quantos tickets abertos cada agente tem

Os dados são atualizados automaticamente a cada **5 minutos**. Os tempos abertos e SLA são recalculados localmente a cada **30 segundos** sem consumir a API.

---

### Visão Gerencial

Acesse: `http://localhost:3000/gerencial.html`

Destinada a **supervisores e gestores** que precisam de uma visão analítica da operação de suporte.

**Seletor de período:** botões no header para alternar entre 7, 30 e 90 dias. Afeta os KPIs do período e a tabela de desempenho.

**KPIs — Estado atual:**
| Card | O que mostra |
|------|-------------|
| Tickets abertos | Total em aberto no momento |
| SLA violados | Tickets com breach já ocorrido |
| Tempo médio 1ª resp | Média em minutos (últimos 7 dias) |
| CSAT | Satisfação do cliente em % (últimos 30 dias) |

**KPIs — Período selecionado:**
| Card | O que mostra |
|------|-------------|
| Resolvidos no período | Tickets com status solved dentro do intervalo |
| Tempo médio resolução | Média em horas desde abertura até resolução |
| Reabertos | Tickets que voltaram de solved para open |
| Sem agente (máx) | Pico de tickets não atribuídos no período |
| Base de conhecimento | % de tickets resolvidos com resolução documentada (verde ≥ 70%, amarelo 40–69%, vermelho < 40%) |

**Volume por Cliente:**
- Barras horizontais com o volume de tickets abertos por organização
- Clique em um cliente para **filtrar** todas as seções da página por aquela organização
- Clique em "Limpar filtro" no header da seção para remover o filtro

**Problemas recorrentes:**
- Top 5 tags mais frequentes nos tickets resolvidos do período selecionado
- Barra proporcional à frequência de cada tag
- Tags com mais de 3 ocorrências são destacadas em vermelho com label "recorrente" — sinal de falha de produto, não de suporte

**Tempo em Aberto:**
- Distribuição dos tickets abertos em 4 faixas: < 4h, 4–24h, 1–3 dias, > 3 dias
- Faixas de alerta (amarelo) e crítico (vermelho) para tickets muito antigos

**Status de SLA:**
- Percentual geral de SLA cumprido
- Contagem absoluta de tickets: dentro do prazo, em risco (< 2h) e violados

**Desempenho da Equipe:**
- Tabela por agente com quatro colunas:
  - **Resolvidos no período** — contagem de tickets fechados pelo agente
  - **Tempo médio resolução** — média de horas entre abertura e fechamento dos tickets do agente no período (ex: `3.2h`)
  - **Tempo médio 1ª resp** — tempo médio até a primeira resposta
  - **Ticket mais antigo em aberto** — age do ticket mais antigo ainda na fila do agente

**Tickets Críticos:**
- Lista completa de tickets abertos com filtros rápidos: Todos, SLA em risco, SLA violado, Sem agente, Mais de 3 dias
- Ordenação automática: violados > sem agente > mais antigos

---

## Como conectar ao Zendesk real

Quando o token de API estiver disponível, siga os passos abaixo:

### 1. Criar o arquivo `.env`

Na raiz do projeto (`zendesk-dashboard-prototype/`), crie um arquivo chamado `.env` com o seguinte conteúdo:

```env
# Subdomínio do Zendesk (a parte antes de .zendesk.com)
ZENDESK_SUBDOMAIN=skasuporte

# E-mail do usuário administrador ou agente com permissão de API
ZENDESK_EMAIL=seu-email@ska.com.br

# Token de API gerado no Zendesk Admin
ZENDESK_TOKEN=seu_token_aqui

# (Opcional) Intervalo de atualização do cache em minutos (padrão: 5)
# REFRESH_INTERVAL_MINUTES=5

# (Opcional) Porta do servidor (padrão: 3000)
# PORT=3000
```

### 2. Gerar o token no Zendesk

1. Acesse o Zendesk Admin Center
2. Vá em **Apps e Integrações → APIs → API Zendesk**
3. Habilite o **Acesso por Token de API** (se ainda não estiver habilitado)
4. Clique em **Adicionar token de API**, copie o valor gerado
5. Cole no campo `ZENDESK_TOKEN` do arquivo `.env`

> O token não é exibido novamente após a criação — guarde-o com segurança.

### 3. Reiniciar o servidor

```bash
npm start
```

Se as credenciais estiverem corretas, o badge no header mudará de **MOCK** (laranja) para **LIVE** (verde) e o banner de demonstração desaparecerá. O servidor exibirá no console: `Modo: LIVE (Zendesk conectado)`.

### Mensagens de erro comuns

| Mensagem | Causa | Solução |
|----------|-------|---------|
| Credenciais inválidas | E-mail ou token incorreto | Verificar os valores no `.env` |
| Token sem permissão | Token sem acesso de leitura | Rever permissões no Zendesk Admin |
| Não foi possível conectar | Subdomínio incorreto | Confirmar o subdomínio da conta |

---

## Como documentar resoluções no Zendesk

O dashboard exibe a resolução de cada ticket resolvido. Ela é extraída automaticamente dos comentários — nenhuma configuração extra é necessária, basta seguir o fluxo abaixo ao fechar um chamado.

### Fluxo padrão ao resolver um ticket

**1. Responder ao cliente (comentário público)**

Antes de fechar, envie uma mensagem visível ao cliente confirmando que o problema foi resolvido. Seja cordial e evite jargão técnico:

> "Identificamos a causa do problema e aplicamos a correção necessária. O sistema já está operando normalmente. Caso o problema reapareça, não hesite em nos contatar."

**2. Registrar a resolução técnica (nota interna)**

Logo após, adicione uma **nota interna** com o detalhamento técnico completo do que foi feito. Notas internas têm `public: false` na API do Zendesk e **não são visíveis ao cliente** — aparecem destacadas em amarelo na interface do Zendesk.

A nota deve conter:
- Causa raiz identificada
- Passos exatos executados (scripts SQL, configurações alteradas, arquivos modificados)
- Como validar que a solução funcionou
- Pontos de atenção ou ações pendentes

> **Exemplo de nota interna:**
> "Procedure P_FECHAR_TURNO fazia full scan na tabela MES.PRD sem índice. Criado: `CREATE INDEX IX_PRD_TURNO ON MES.PRD (CD_TURNO, DT_INICIO)`. Tempo de fechamento reduziu de 45s para 2s. Monitorado por dois ciclos sem recorrência."

**Por que nota interna e não campo customizado?**

As notas internas são a forma nativa do Zendesk para comunicação entre agentes — já fazem parte do fluxo de atendimento, ficam no histórico do ticket e não requerem configuração adicional de formulários ou campos. O dashboard prioriza a última nota interna do agente; se não houver, usa o último comentário público como fallback.

---

## Variáveis de ambiente — resumo

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `ZENDESK_SUBDOMAIN` | Sim (para LIVE) | `skasuporte` | Subdomínio da conta Zendesk |
| `ZENDESK_EMAIL` | Sim (para LIVE) | — | E-mail do usuário de API |
| `ZENDESK_TOKEN` | Sim (para LIVE) | — | Token de API do Zendesk |
| `REFRESH_INTERVAL_MINUTES` | Não | `5` | TTL do cache de dados em minutos |
| `PORT` | Não | `3000` | Porta HTTP do servidor |
