'use strict';

// Tempo base do mock — usa o momento em que o servidor sobe para calcular datas relativas
const now = () => new Date();
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
const minutesFromNow = (m) => new Date(Date.now() + m * 60000).toISOString();
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

const AGENTS = [
  { id: 101, name: 'Lucas Almeida', email: 'lucas@ska.com.br' },
  { id: 102, name: 'Marina Souza',  email: 'marina@ska.com.br' },
  { id: 103, name: 'Rafael Costa', email: 'rafael@ska.com.br' },
];

// Comentários por ticket — usados como fallback de resolução (camada 2)
const COMMENTS = {
  475925: [
    { id: 1, author_id: 201, public: true, body: 'Bom dia, os indicadores de OEE continuam zerados após a atualização 2.57 T5.', created_at: hoursAgo(4) },
    { id: 2, author_id: 101, public: true, body: 'Verificamos a causa: o script de migração não rodou corretamente. Vamos rodar o script 2.57 novamente e atualizar o Agente CEP. Aguarde.', created_at: hoursAgo(3) },
    { id: 3, author_id: 201, public: true, body: 'Ok, aguardando.', created_at: hoursAgo(2) },
    { id: 4, author_id: 101, public: true, body: 'Script executado. Por favor verifique os indicadores agora.', created_at: hoursAgo(1) },
  ],
  473708: [
    { id: 5, author_id: 202, public: true, body: 'A inspeção CEP não está entrando em atraso mesmo passado o horário.', created_at: daysAgo(1) },
    { id: 6, author_id: 101, public: true, body: 'Verificando configuração do agendamento. Qual o intervalo configurado?', created_at: hoursAgo(20) },
    { id: 7, author_id: 202, public: true, body: 'Está configurado para 30 minutos.', created_at: hoursAgo(18) },
    { id: 8, author_id: 101, public: true, body: 'Identificamos que o campo de data de referência estava null para algumas inspeções. Rodar o script de fix de NULL na coluna DT_REFERENCIA.', created_at: hoursAgo(12) },
  ],
  474883: [
    { id: 9, author_id: 203, public: true, body: 'O OEE no Viewer mostra 85% mas na tela de Produção aparece 72%. Qual está correto?', created_at: daysAgo(2) },
    { id: 10, author_id: 102, public: true, body: 'Investigando. O Viewer usa cache de 1 hora. Pode ser diferença de atualização.', created_at: hoursAgo(40) },
  ],
  474010: [
    { id: 11, author_id: 204, public: true, body: 'Após troca de turno às 22h, o estado da máquina injetora aparece duplicado no painel.', created_at: daysAgo(3) },
    { id: 12, author_id: 101, public: true, body: 'Verificando o log do coletor. Parece que a transição de turno gerou dois registros simultâneos.', created_at: daysAgo(2) },
  ],
  475315: [
    { id: 13, author_id: 205, public: true, body: 'O relatório mensal não abre, dá timeout após 30 segundos.', created_at: daysAgo(4) },
    { id: 14, author_id: 103, public: true, body: 'Identificamos query pesada sem índice. Aguardando janela de manutenção para otimizar.', created_at: daysAgo(3) },
  ],
  469037: [
    { id: 15, author_id: 201, public: true, body: 'Toda segunda-feira de manhã o sistema fica lento por 1-2 horas.', created_at: daysAgo(2) },
    { id: 16, author_id: 102, public: true, body: 'Verificamos que o job de backup semanal roda às 06h e consome muita CPU. Vamos alterar o horário.', created_at: hoursAgo(30) },
  ],
  475926: [
    { id: 17, author_id: 206, public: true, body: 'O coletor perdeu conexão com o MES após reiniciar o servidor. Não reconecta automaticamente.', created_at: hoursAgo(6) },
    { id: 18, author_id: 103, public: true, body: 'Verificando configuração de reconexão no coletor. Pode ser timeout de sessão TCP.', created_at: hoursAgo(4) },
  ],
  474762: [
    { id: 19, author_id: 207, public: true, body: 'Ao tentar justificar uma parada programada, aparece erro "Registro não encontrado".', created_at: hoursAgo(8) },
    { id: 20, author_id: 102, public: true, body: 'Verificando. Parece que a parada foi criada antes da última atualização e houve mudança na estrutura da tabela.', created_at: hoursAgo(6) },
  ],
};

const OPEN_TICKETS = [
  {
    id: 475925,
    subject: 'Indicadores zerados após atualização para 2.57 T5',
    description: 'Após rodar o agente e atualizar a suite, os indicadores de OEE e desempenho continuam zerados na tela principal e no Viewer.',
    status: 'open',
    priority: 'urgent',
    tags: ['indicadores', 'oee', 'agente', 'franklin_join', 'atualizacao'],
    assignee_id: 101,
    requester_id: 201,
    organization_name: 'Franklin Join',
    created_at: hoursAgo(3.5),
    updated_at: hoursAgo(1),
    via: { channel: 'email' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(45), stage: 'active' }
      ]
    }
  },
  {
    id: 473708,
    subject: 'Inspeção CEP não entra em atraso',
    description: 'As inspeções programadas não estão sendo marcadas como atrasadas mesmo após o horário limite passar.',
    status: 'open',
    priority: 'high',
    tags: ['inspecao', 'cep', 'atraso', 'franklin_join'],
    assignee_id: 101,
    requester_id: 202,
    organization_name: 'Franklin Join',
    created_at: hoursAgo(26),
    updated_at: hoursAgo(12),
    via: { channel: 'email' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(180), stage: 'active' }
      ]
    }
  },
  {
    id: 474883,
    subject: 'Divergência OEE Viewer vs Produção',
    description: 'O valor de OEE exibido no Viewer TV difere do valor mostrado na tela de Produção em mais de 10 pontos percentuais.',
    status: 'open',
    priority: 'high',
    tags: ['oee', 'viewer', 'divergencia', 'neoortho'],
    assignee_id: null,
    requester_id: 203,
    organization_name: 'Neoortho',
    created_at: hoursAgo(50),
    updated_at: hoursAgo(40),
    via: { channel: 'email' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesAgo(30), stage: 'breached' }
      ]
    }
  },
  {
    id: 474010,
    subject: 'Estado de máquina duplicado após troca de turno',
    description: 'Após a virada do turno às 22h, o estado da máquina injetora fica duplicado no painel de acompanhamento.',
    status: 'open',
    priority: 'normal',
    tags: ['estado_maquina', 'turno', 'duplicado', 'neoortho'],
    assignee_id: null,
    requester_id: 204,
    organization_name: 'Neoortho',
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
    via: { channel: 'web' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(240), stage: 'active' }
      ]
    }
  },
  {
    id: 475315,
    subject: 'Relatório não abre — timeout no servidor',
    description: 'Ao tentar abrir o relatório mensal de desempenho, o sistema trava e retorna timeout após 30 segundos.',
    status: 'open',
    priority: 'normal',
    tags: ['relatorio', 'timeout', 'performance', 'ge'],
    assignee_id: 103,
    requester_id: 205,
    organization_name: 'GE',
    created_at: daysAgo(4.5),
    updated_at: daysAgo(3),
    via: { channel: 'phone' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(360), stage: 'active' }
      ]
    }
  },
  {
    id: 469037,
    subject: 'Lentidão no operacional — segunda-feira manhã',
    description: 'Todo início de semana o sistema fica extremamente lento entre 06h e 08h, prejudicando o primeiro turno.',
    status: 'open',
    priority: 'high',
    tags: ['lentidao', 'aws', 'servidor', 'performance', 'franklin_join'],
    assignee_id: 102,
    requester_id: 201,
    organization_name: 'Franklin Join',
    created_at: hoursAgo(34),
    updated_at: hoursAgo(30),
    via: { channel: 'email' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(90), stage: 'active' }
      ]
    }
  },
  {
    id: 475926,
    subject: 'Coletor não conecta ao MES após reinicialização',
    description: 'O coletor de dados perdeu conexão com o servidor MES após reinício do servidor de chão de fábrica.',
    status: 'open',
    priority: 'normal',
    tags: ['coletor', 'conexao', 'mes', 'flexicotton'],
    assignee_id: 103,
    requester_id: 206,
    organization_name: 'Flexicotton',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(4),
    via: { channel: 'email' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(300), stage: 'active' }
      ]
    }
  },
  {
    id: 474762,
    subject: 'Erro ao justificar parada programada',
    description: 'Operador recebe "Registro não encontrado" ao tentar adicionar justificativa em parada programada existente.',
    status: 'open',
    priority: 'low',
    tags: ['parada', 'justificativa', 'erro', 'signode'],
    assignee_id: 102,
    requester_id: 207,
    organization_name: 'Signode',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(6),
    via: { channel: 'web' },
    custom_fields: [{ id: 99001, value: null }],
    sla_policy: {
      policy_metrics: [
        { metric: 'first_reply_time', breach_at: minutesFromNow(480), stage: 'active' }
      ]
    }
  },
];

const SOLVED_TICKETS = [
  {
    id: 471123,
    subject: 'Divergência no cálculo de OEE — usando dia em vez de turno',
    status: 'solved',
    priority: 'high',
    tags: ['oee', 'calculo', 'turno', 'franklin_join'],
    assignee_id: 101,
    organization_name: 'Franklin Join',
    created_at: daysAgo(60),
    updated_at: daysAgo(59),
    via: { channel: 'email' },
  },
  {
    id: 470708,
    subject: 'Lentidão extrema — AWS com consumo alto de CPU',
    status: 'solved',
    priority: 'urgent',
    tags: ['aws', 'cpu', 'lentidao', 'servidor', 'neoortho'],
    assignee_id: 102,
    organization_name: 'Neoortho',
    created_at: daysAgo(32),
    updated_at: daysAgo(31),
    via: { channel: 'phone' },
  },
  {
    id: 468762,
    subject: 'Quantidade da ordem de produção não atualiza via integração',
    status: 'solved',
    priority: 'normal',
    tags: ['integracao', 'ordem', 'json', 'franklin_join'],
    assignee_id: 101,
    organization_name: 'Franklin Join',
    created_at: daysAgo(90),
    updated_at: daysAgo(89),
    via: { channel: 'email' },
  },
  {
    id: 467531,
    subject: 'Estado de máquina travado em "Ociosa" após fim de turno',
    status: 'solved',
    priority: 'high',
    tags: ['estado_maquina', 'ociosa', 'turno', 'cremer'],
    assignee_id: 103,
    organization_name: 'Cremer',
    created_at: daysAgo(45),
    updated_at: daysAgo(44),
    via: { channel: 'email' },
  },
  {
    id: 466240,
    subject: 'Inspeção CEP com NULL na contagem de defeitos',
    status: 'solved',
    priority: 'normal',
    tags: ['inspecao', 'cep', 'null', 'contagem', 'flexicotton'],
    assignee_id: 102,
    organization_name: 'Flexicotton',
    created_at: daysAgo(20),
    updated_at: daysAgo(19),
    via: { channel: 'web' },
  },
  {
    id: 465189,
    subject: 'Erro de script SQL — separador decimal incorreto',
    status: 'solved',
    priority: 'normal',
    tags: ['sql', 'script', 'decimal', 'banco', 'signode'],
    assignee_id: 101,
    organization_name: 'Signode',
    created_at: daysAgo(15),
    updated_at: daysAgo(14),
    via: { channel: 'email' },
  },
  {
    id: 464078,
    subject: 'Lentidão na troca de turno — query de fechamento sem índice',
    status: 'solved',
    priority: 'high',
    tags: ['lentidao', 'turno', 'sql', 'indice', 'altona'],
    assignee_id: 103,
    organization_name: 'Altona',
    created_at: daysAgo(28),
    updated_at: daysAgo(27),
    via: { channel: 'phone' },
  },
  {
    id: 463019,
    subject: 'Agente não atualiza indicadores após restart do IIS',
    status: 'solved',
    priority: 'urgent',
    tags: ['agente', 'indicadores', 'iis', 'restart', 'bundy'],
    assignee_id: 102,
    organization_name: 'Bundy',
    created_at: daysAgo(10),
    updated_at: daysAgo(9),
    via: { channel: 'email' },
  },
  {
    id: 461987,
    subject: 'Backup de banco corrompido — restore necessário',
    status: 'solved',
    priority: 'urgent',
    tags: ['backup', 'banco', 'restore', 'sql', 'franklin_monte'],
    assignee_id: 101,
    organization_name: 'Franklin Monte',
    created_at: daysAgo(55),
    updated_at: daysAgo(54),
    via: { channel: 'phone' },
  },
  {
    id: 460854,
    subject: 'Divergência no Viewer — dados do turno anterior aparecendo',
    status: 'solved',
    priority: 'normal',
    tags: ['viewer', 'oee', 'divergencia', 'turno', 'neoortho'],
    assignee_id: 103,
    organization_name: 'Neoortho',
    created_at: daysAgo(18),
    updated_at: daysAgo(17),
    via: { channel: 'web' },
  },
  {
    id: 459741,
    subject: 'Erro ao justificar parada — FK violada no banco',
    status: 'solved',
    priority: 'high',
    tags: ['parada', 'justificativa', 'banco', 'fk', 'ge'],
    assignee_id: 102,
    organization_name: 'GE',
    created_at: daysAgo(22),
    updated_at: daysAgo(21),
    via: { channel: 'email' },
  },
  {
    id: 458632,
    subject: 'Certificado digital expirado — agente sem comunicação HTTPS',
    status: 'solved',
    priority: 'urgent',
    tags: ['certificado', 'https', 'ssl', 'agente', 'cremer'],
    assignee_id: 101,
    organization_name: 'Cremer',
    created_at: daysAgo(35),
    updated_at: daysAgo(34),
    via: { channel: 'email' },
  },
  {
    id: 457521,
    subject: 'Acesso negado ao servidor AWS — permissão IAM revogada',
    status: 'solved',
    priority: 'high',
    tags: ['aws', 'acesso', 'iam', 'permissao', 'franklin_fund'],
    assignee_id: 103,
    organization_name: 'Franklin Fund',
    created_at: daysAgo(12),
    updated_at: daysAgo(11),
    via: { channel: 'email' },
  },
  {
    id: 456418,
    subject: 'Versão desatualizada do agente — divergência de funcionalidades',
    status: 'solved',
    priority: 'normal',
    tags: ['agente', 'versao', 'atualizacao', 'suite', 'flexicotton'],
    assignee_id: 102,
    organization_name: 'Flexicotton',
    created_at: daysAgo(8),
    updated_at: daysAgo(7),
    via: { channel: 'web' },
  },
  {
    id: 455307,
    subject: 'Ponto de controle configurado incorretamente — OEE zerado',
    status: 'solved',
    priority: 'high',
    tags: ['ponto_controle', 'oee', 'configuracao', 'signode'],
    assignee_id: 101,
    organization_name: 'Signode',
    created_at: daysAgo(25),
    updated_at: daysAgo(24),
    via: { channel: 'phone' },
  },
];

// Comentários para tickets resolvidos
// Padrão: comentário público com resposta educada ao cliente + nota interna com detalhe técnico
const SOLVED_COMMENTS = {
  471123: [
    { id: 100, author_id: 201, public: true,  body: 'O OEE está mostrando valores errados, parece estar calculando o dia inteiro ao invés do turno.', created_at: daysAgo(61) },
    { id: 101, author_id: 101, public: true,  body: 'Problema identificado e corrigido. Sistema operando normalmente.', created_at: daysAgo(60) },
    { id: 102, author_id: 101, public: false, body: 'Procedure P_CALCULAR_INDICES estava usando DT_ABERTURA do dia inteiro em vez de CD_TURNO. Rodado script ALTER_P_CALCULAR_INDICES.sql no banco do cliente. Validado no relatório de OEE após rodar o agente — valores por turno corretos.', created_at: daysAgo(60) },
    { id: 103, author_id: 201, public: true,  body: 'Funcionou! OEE agora mostra corretamente por turno.', created_at: daysAgo(59) },
  ],
  470708: [
    { id: 104, author_id: 203, public: true,  body: 'Sistema extremamente lento, CPU da AWS em 100%.', created_at: daysAgo(32) },
    { id: 105, author_id: 102, public: true,  body: 'Problema identificado e corrigido. Sistema operando normalmente.', created_at: daysAgo(31) },
    { id: 106, author_id: 102, public: false, body: 'Serviço de relatórios estava executando em loop sem intervalo de espera, consumindo 100% de CPU. Reiniciados os serviços na AWS afetada. Aumentado o intervalo de execução do job de relatórios de 0s para 300s no appsettings.json. Agentes migrados para AWS secundária (eu-west-1) enquanto a principal se estabiliza. Card Azure DevOps #4521 aberto para investigação de longo prazo.', created_at: daysAgo(31) },
  ],
  468762: [
    { id: 107, author_id: 202, public: true,  body: 'A quantidade da ordem de produção não atualiza via integração.', created_at: daysAgo(91) },
    { id: 108, author_id: 101, public: true,  body: 'Comportamento verificado e orientação enviada. Chamado encerrado.', created_at: daysAgo(89) },
    { id: 109, author_id: 101, public: false, body: 'Comportamento esperado por design: não é possível alterar quantidade de ordem em execução via integração JSON. Verificados logs de integração na pasta Backup no servidor — payload correto, porém ordem já estava em produção. Orientado cliente a alterar somente quando a ordem não estiver em execução. Validado payload JSON da chamada de API com cliente.', created_at: daysAgo(89) },
  ],
  467531: [
    { id: 110, author_id: 204, public: true,  body: 'Estado da máquina travado em "Ociosa" após fim de turno.', created_at: daysAgo(46) },
    { id: 111, author_id: 103, public: true,  body: 'Problema identificado e corrigido. Sistema operando normalmente.', created_at: daysAgo(44) },
    { id: 112, author_id: 103, public: false, body: 'Causa raiz: sinal de fim de turno chegou antes do coletor processar a última coleta, deixando o registro em estado OCIOSA sem DT_FIM. Rodado script de reset: UPDATE MES.PRD SET CD_ESTADO = NULL WHERE DT_FIM IS NOT NULL AND CD_ESTADO = \'OCIOSA\'. Reiniciado serviço do coletor após. Estados normalizados.', created_at: daysAgo(44) },
  ],
  466240: [
    { id: 113, author_id: 205, public: true,  body: 'Inspeção CEP com NULL na contagem de defeitos.', created_at: daysAgo(21) },
    { id: 114, author_id: 102, public: true,  body: 'Problema identificado e corrigido. Sistema operando normalmente.', created_at: daysAgo(19) },
    { id: 115, author_id: 102, public: false, body: 'Campo QT_DEFEITOS estava nulo para inspeções criadas com template anterior à versão 2.50. Rodado: UPDATE MES.INSP SET QT_DEFEITOS = 0 WHERE QT_DEFEITOS IS NULL AND DT_INSPECAO > \'2025-01-01\'. Total de 47 registros corrigidos. Orientado cliente a preencher o campo ao criar inspeção via novo template.', created_at: daysAgo(19) },
  ],
  465189: [
    { id: 116, author_id: 206, public: true,  body: 'Erro ao executar script SQL — separador decimal.', created_at: daysAgo(16) },
    { id: 117, author_id: 101, public: true,  body: 'Problema identificado e corrigido. Script reexecutado com sucesso.', created_at: daysAgo(14) },
    { id: 118, author_id: 101, public: false, body: 'Script de atualização usava ponto como separador decimal, mas o SQL Server do cliente está configurado com locale pt-BR (vírgula). Corrigido o script substituindo ponto por vírgula nos valores numéricos. Reexecutado com SET LANGUAGE Brazilian antes do bloco. Validado resultado nas tabelas afetadas.', created_at: daysAgo(14) },
  ],
  464078: [
    { id: 119, author_id: 207, public: true,  body: 'Lentidão intensa durante a troca de turno.', created_at: daysAgo(29) },
    { id: 120, author_id: 103, public: true,  body: 'Problema identificado e corrigido. Tempo de troca de turno normalizado.', created_at: daysAgo(27) },
    { id: 121, author_id: 103, public: false, body: 'Procedure P_FECHAR_TURNO fazia full scan na tabela MES.PRD (>2M linhas) sem usar índice na coluna CD_TURNO. Criado índice: CREATE INDEX IX_PRD_TURNO ON MES.PRD (CD_TURNO, DT_INICIO). Tempo de fechamento de turno reduziu de 45s para 2s. Monitorado por dois ciclos de troca consecutivos sem recorrência.', created_at: daysAgo(27) },
  ],
  463019: [
    { id: 122, author_id: 201, public: true,  body: 'Agente não atualiza indicadores após restart do IIS.', created_at: daysAgo(11) },
    { id: 123, author_id: 102, public: true,  body: 'Problema identificado e corrigido. Agente operando normalmente após restart.', created_at: daysAgo(9) },
    { id: 124, author_id: 102, public: false, body: 'Após restart do IIS o pool de conexões do Agente CEP não reconectava ao banco — ficava em loop de erro silencioso. Configurado reconexão automática no pool: MinPool=5, MaxPool=100, ConnectTimeout=30 no appsettings.json do IIS. Reiniciado o serviço SKA.Agente. Testado restart do IIS duas vezes — agente reconecta automaticamente em < 10s.', created_at: daysAgo(9) },
  ],
  461987: [
    { id: 125, author_id: 202, public: true,  body: 'Backup de banco corrompido, sistema sem acesso aos dados.', created_at: daysAgo(56) },
    { id: 126, author_id: 101, public: true,  body: 'Banco restaurado. Sistema operando normalmente.', created_at: daysAgo(54) },
    { id: 127, author_id: 101, public: false, body: 'Backup automático gerou arquivo .bak corrompido (checksum inválido). Usado backup D-2 disponível no storage. Executado: RESTORE DATABASE MES FROM DISK = \'backup_d2.bak\' WITH REPLACE. Após restore, rodados scripts de migração pendentes em ordem: 001_fix.sql, 002_indices.sql. Validada integridade com DBCC CHECKDB — sem erros. Investigar e corrigir job de backup automático.', created_at: daysAgo(54) },
  ],
  460854: [
    { id: 128, author_id: 203, public: true,  body: 'Viewer mostrando dados do turno anterior.', created_at: daysAgo(19) },
    { id: 129, author_id: 103, public: true,  body: 'Problema identificado e corrigido. Viewer exibindo dados do turno atual.', created_at: daysAgo(17) },
    { id: 130, author_id: 103, public: false, body: 'Cache do Viewer configurado com TTL de 7200s (2h). Dados do turno anterior permaneciam visíveis até expirar. Alterado TTL para 900s (15min) em viewer.config.json → "cacheTTL": 900. Reiniciado serviço do Viewer para aplicar. Verificada atualização correta em dois ciclos de troca de turno.', created_at: daysAgo(17) },
  ],
  459741: [
    { id: 131, author_id: 204, public: true,  body: 'Erro ao justificar parada — sistema não aceita o registro.', created_at: daysAgo(23) },
    { id: 132, author_id: 102, public: true,  body: 'Problema identificado e corrigido. Justificativas sendo registradas normalmente.', created_at: daysAgo(21) },
    { id: 133, author_id: 102, public: false, body: 'Foreign key em MES.JUSTIFICATIVA_PARADA apontava para registro deletado em MES.TIPO_PARADA. INSERT falhava silenciosamente na UI sem mensagem de erro ao usuário. Solução: INSERT INTO MES.TIPO_PARADA VALUES (999, \'LEGADO\', 1). Associadas as justificativas órfãs ao novo tipo via UPDATE. Aberto bug #5102 no Azure DevOps para implementar cascata de delete corretamente.', created_at: daysAgo(21) },
  ],
  458632: [
    { id: 134, author_id: 205, public: true,  body: 'Agente sem comunicação — certificado digital com problema.', created_at: daysAgo(36) },
    { id: 135, author_id: 101, public: true,  body: 'Comunicação restabelecida. Agente operando normalmente.', created_at: daysAgo(34) },
    { id: 136, author_id: 101, public: false, body: 'Certificado SSL do servidor MES expirou em 15/02. Agente CEP usa HTTPS e passou a rejeitar a conexão com erro de handshake. Solicitada renovação à TI do cliente via IIS Manager → Bindings → Edit → Select Certificate. Enquanto aguardava, configurada exceção temporária no agente: "skipCertValidation": true (TEMPORÁRIO — remover após renovação). Certificado renovado e exceção removida em seguida.', created_at: daysAgo(34) },
  ],
  457521: [
    { id: 137, author_id: 206, public: true,  body: 'Acesso negado ao servidor AWS — sistema inacessível.', created_at: daysAgo(13) },
    { id: 138, author_id: 103, public: true,  body: 'Acesso restabelecido. Sistema operando normalmente.', created_at: daysAgo(11) },
    { id: 139, author_id: 103, public: false, body: 'Rotação automática de credenciais AWS revogou as permissões IAM do usuário de serviço svc-directames. Solicitada à TI reatribuição das políticas AmazonEC2FullAccess e AmazonRDSFullAccess. Atualizadas as chaves em appsettings.json → AWSAccessKey e AWSSecretKey. Configurar alerta de expiração de credenciais IAM para evitar recorrência.', created_at: daysAgo(11) },
  ],
  456418: [
    { id: 140, author_id: 207, public: true,  body: 'Funcionalidades divergindo entre Suite e Agente.', created_at: daysAgo(9) },
    { id: 141, author_id: 102, public: true,  body: 'Problema identificado e corrigido. Suite e Agente na mesma versão.', created_at: daysAgo(7) },
    { id: 142, author_id: 102, public: false, body: 'Suite estava na versão 2.55 mas o Agente CEP estava na 2.52. Incompatibilidade de contrato de API causava falha silenciosa no cálculo de indicadores. Atualizado o Agente: baixado SKA.Agente.2.55.zip do repositório, parado serviço, substituídos binários, iniciado serviço. Adicionada nota na base de conhecimento: Suite e Agente devem ser sempre atualizados juntos.', created_at: daysAgo(7) },
  ],
  455307: [
    { id: 143, author_id: 201, public: true,  body: 'OEE zerado durante o turno diurno.', created_at: daysAgo(26) },
    { id: 144, author_id: 101, public: true,  body: 'Problema identificado e corrigido. OEE calculando corretamente.', created_at: daysAgo(24) },
    { id: 145, author_id: 101, public: false, body: 'Ponto de controle estava associado ao CD_TURNO 3 (noturno) em vez do CD_TURNO 1 (diurno). OEE ficava zerado durante o turno diurno pois o sistema buscava dados do turno incorreto. Corrigido em: Configurações → Pontos de Controle → editar → CD_TURNO = 1. Reiniciado o agente após alteração. Validado OEE correto por dois turnos consecutivos.', created_at: daysAgo(24) },
  ],
};

// Merge all comments
const ALL_COMMENTS = { ...COMMENTS, ...SOLVED_COMMENTS };

function getMockData() {
  return {
    openTickets: OPEN_TICKETS,
    solvedTickets: SOLVED_TICKETS,
    agents: AGENTS,
    comments: ALL_COMMENTS,
  };
}

function buildMockKPIs(openTickets, solvedTickets) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const slaBreached = openTickets.filter(t => {
    const metric = t.sla_policy?.policy_metrics?.[0];
    return metric && new Date(metric.breach_at).getTime() < now;
  });

  const slaAtRisk = openTickets.filter(t => {
    const metric = t.sla_policy?.policy_metrics?.[0];
    if (!metric) return false;
    const breachTime = new Date(metric.breach_at).getTime();
    return breachTime > now && breachTime - now < 60 * 60 * 1000;
  });

  const unassigned = openTickets.filter(t => !t.assignee_id);
  const solvedToday = solvedTickets.filter(t => new Date(t.updated_at) >= todayStart);

  // Tempo médio de primeira resposta (simulado em minutos)
  const avgFirstReply = 47;

  // CSAT simulado
  const csat = 92;

  // Tempo médio de resolução em horas
  const avgResolution = solvedTickets.reduce((acc, t) => {
    const created = new Date(t.created_at).getTime();
    const updated = new Date(t.updated_at).getTime();
    return acc + (updated - created) / 3600000;
  }, 0) / (solvedTickets.length || 1);

  return {
    open: openTickets.length,
    unassigned: unassigned.length,
    solvedToday: solvedToday.length,
    slaAtRisk: slaAtRisk.length,
    slaBreached: slaBreached.length,
    avgFirstReplyMinutes: avgFirstReply,
    csat: csat,
    avgResolutionHours: Math.round(avgResolution * 10) / 10,
    reopened: 1,
  };
}

function buildMockClients(tickets) {
  const counts = {};
  tickets.forEach(t => {
    const name = t.organization_name || 'Sem organização';
    counts[name] = (counts[name] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { getMockData, buildMockKPIs, buildMockClients };
