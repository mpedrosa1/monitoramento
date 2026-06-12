# SERVER_WEB.md — Referência para API e Sistema Web

Documento de referência para equipes que implementam clientes (ex.: app mobile) consumindo o backend MMRTEC Monitoramento. Descreve rotas da API, modelos de dados, autenticação, WebSocket e o comportamento funcional do sistema web (páginas, formulários, modais e painéis).

**Versão do stack:** API Go 1.22+ · Next.js 16 · React 19 · MongoDB

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Configuração e URLs](#2-configuração-e-urls)
3. [Autenticação e permissões](#3-autenticação-e-permissões)
4. [API REST — referência completa](#4-api-rest--referência-completa)
5. [WebSocket — monitoramento em tempo real](#5-websocket--monitoramento-em-tempo-real)
6. [Modelos de dados](#6-modelos-de-dados)
7. [Sistema web — rotas e navegação](#7-sistema-web--rotas-e-navegação)
8. [Páginas e painéis](#8-páginas-e-painéis)
9. [Modais e diálogos](#9-modais-e-diálogos)
10. [Formulários e campos](#10-formulários-e-campos)
11. [Fluxos de negócio](#11-fluxos-de-negócio)
12. [Rotas auxiliares do Next.js](#12-rotas-auxiliares-do-nextjs)
13. [Serviços externos](#13-serviços-externos)
14. [Notas para implementação mobile](#14-notas-para-implementação-mobile)

---

## 1. Visão geral

O **MMRTEC Monitoramento** gerencia unidades prisionais, equipamentos de infraestrutura (nobreaks, sensores Modbus/SNMP), colaboradores, veículos, chamados de suporte e missões de campo. O backend coleta métricas (ping, Modbus, SNMP) e envia atualizações em tempo real via WebSocket.

```
┌─────────────┐     REST + WS      ┌──────────────────┐     MongoDB
│  Web/Mobile │ ◄────────────────► │  API Go (:8081)  │ ◄────────────►
└─────────────┘                    └──────────────────┘
                                          │
                                          ▼ collectors (ping/modbus/snmp)
```

**Entidades principais:** Unidade, Equipamento (catálogo), Colaborador, Veículo, Chamado, Missão, DeviceMetric (monitoramento).

**Tipos compartilhados:** definidos em `packages/shared-types/index.ts` (espelhados em `apps/web/src/lib/types.ts`).

---

## 2. Configuração e URLs

### API (Go)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `8081` | Porta HTTP |
| `MONGODB_URI` | — | Connection string MongoDB (vazio = memória) |
| `MONGODB_DATABASE` | `monitoramento` | Nome do banco |
| `JWT_SECRET` | `dev-mmrtec-altere-em-producao` | Secret HS256 |
| `JWT_EXPIRY_HOURS` | `8` | Expiração do token |
| `CORS_ORIGINS` | `http://localhost:3000` | Origens permitidas |
| `COLLECTOR_ENABLED` | `true` | Coleta ping/modbus/snmp |
| `ANTENAS_DB_PATH` | `base/antenas.db` | SQLite de antenas (opcional) |

### Web (Next.js)

| Variável | Padrão recomendado | Descrição |
|----------|-------------------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8081` | Base da API REST |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8081/ws` | WebSocket |

> **Atenção:** o fallback no código web usa porta `8080`; em produção/dev configure sempre `.env.local` com `8081` (ver README).

### Endpoints base

| Serviço | URL |
|---------|-----|
| API REST | `{API_URL}/api/v1/...` |
| Health | `{API_URL}/health` |
| Identificação | `{API_URL}/` → `{"service":"mmrtec-monitoramento-api"}` |
| WebSocket | `{WS_URL}?token={jwt}` |
| Web app | `http://localhost:3000` |

### Formato de erro padrão

```json
{ "error": "mensagem descritiva" }
```

Listas vazias retornam `[]`, nunca `null`. DELETE bem-sucedido → `204 No Content`.

---

## 3. Autenticação e permissões

### Login

```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "usuario@empresa.com", "password": "senha" }
```

**Resposta 200:**

```json
{
  "token": "<jwt>",
  "expiresAt": "2026-06-12T21:00:00Z",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "tipoAcesso": "usuario",
    "cpf": "12345678900",
    "dataAdmissao": "2020-01-15"
  }
}
```

- E-mail comparado **case-insensitive** (corporativo ou pessoal do colaborador).
- Senha inicial ao criar colaborador: `MMR{ano}` a partir de `dataNascimento` (ex.: nascido em 1984 → `MMR1984`).

### Sessão autenticada

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

Retorna o mesmo shape de `user` do login.

### Uso do token

- Header: `Authorization: Bearer <token>`
- WebSocket: query `?token=<jwt>` **ou** header Bearer

### Claims JWT

| Claim | Descrição |
|-------|-----------|
| `sub` | ID do colaborador (ObjectID hex) |
| `email` | E-mail de login |
| `nome` | Nome |
| `tipoAcesso` | Papel no sistema |
| `exp`, `iat`, `iss` | `iss` = `mmrtec-monitoramento` |

### Tipos de acesso (`tipoAcesso`)

| Valor | Label (UI) | Descrição |
|-------|------------|-----------|
| `usuario` | Usuário | Operador de campo — ações limitadas |
| `admin_com_financeiro` | Admin c/ financeiro | CRUD completo + missões |
| `admin_sem_financeiro` | Admin s/ financeiro | Idem (sem distinção funcional no app atual) |
| `desenvolvedor` | Desenvolvedor | CRUD + catálogo de equipamentos |

### Matriz de permissões

| Ação | `usuario` | `admin_*` | `desenvolvedor` |
|------|-----------|-----------|-----------------|
| Ver dashboard, listas, detalhes | ✓ | ✓ | ✓ |
| Criar/editar/excluir cadastros (unidades, colaboradores, veículos, chamados) | ✗ | ✓ | ✓ |
| Catálogo de equipamentos | ✗ | ✗ | ✓ |
| Vincular equipamentos na unidade | ✗ | ✓ | ✓ |
| CRUD na página Missões (editar/excluir) | ✗ | ✓ | ✗ |
| Criar missão / atribuir a chamado | ✗ | ✓ | ✓ |
| Iniciar missão (`planejada` → `em_andamento`) | Atribuído | Atribuído | Atribuído |
| Concluir missão | Atribuído ou admin/dev | ✓ | ✓ |
| Encerrar chamado (`em_andamento` → `encerrado`) | Atribuído ou admin/dev | ✓ | ✓ |

**Middlewares no servidor:**

- `AuthMiddleware` — JWT válido (quase todas as rotas)
- `RequireManageData` — admin ou desenvolvedor
- `RequireManageMissoes` — apenas administradores (PUT/DELETE missão)

---

## 4. API REST — referência completa

Prefixo: `/api/v1`

### Infraestrutura

| Método | Path | Auth | Descrição | Response |
|--------|------|------|-----------|----------|
| GET | `/health` | — | Health check | `{"status":"ok"}` ou `503` |
| GET | `/` | — | Identificação | `{"service":"mmrtec-monitoramento-api"}` |

### Dashboard e monitoramento

| Método | Path | Auth | Query | Response |
|--------|------|------|-------|----------|
| GET | `/dashboard/summary` | JWT | — | `DashboardSummary` |
| GET | `/monitoring/live` | JWT | — | `DeviceMetric[]` |
| GET | `/eventos` | JWT | `limit` (padrão 20) | `EventoMonitoramento[]` |

**DashboardSummary:**

```json
{
  "missoesEmAndamento": 2,
  "ultimosChamados": [ /* Chamado[] */ ],
  "colaboradores": [ /* Colaborador[] */ ],
  "metricas": [ /* DeviceMetric[] */ ]
}
```

### Chamados

| Método | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/chamados` | JWT | `limit` (0 = sem limite) | `Chamado[]` |
| GET | `/chamados/{id}` | JWT | — | `Chamado` |
| POST | `/chamados` | JWT + ManageData | `Chamado` | `201 Chamado` |
| PUT | `/chamados/{id}` | JWT | `Chamado` | `Chamado` |
| DELETE | `/chamados/{id}` | JWT + ManageData | — | `204` |

**Regras PUT chamado:**
- Admin/dev: edição livre.
- Usuário: só pode encerrar (`em_andamento` → `encerrado`) se estiver em `colaboradorIds`.

**Defaults ao criar:** `status = "aberto"`. Se `titulo` vazio → usa `emailAssunto`; se `descricao` vazio → usa `emailCorpo`.

### Unidades

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/unidades` | JWT | — | `Unidade[]` (ordenado por código) |
| POST | `/unidades` | JWT + ManageData | ver abaixo | `201 Unidade` |
| PUT | `/unidades/{id}` | JWT + ManageData | idem | `Unidade` |
| DELETE | `/unidades/{id}` | JWT + ManageData | — | `204` |

> Não existe `GET /unidades/{id}` — obter unidade individual via lista filtrada no cliente.

**Body de unidade (POST/PUT):**

```json
{
  "codigo": "123",
  "nome": "Unidade Exemplo",
  "diretores": ["Diretor A"],
  "telefones": ["11999999999"],
  "emails": ["unidade@sap.sp.gov.br"],
  "endereco": {
    "cep": "01001000",
    "logradouro": "Rua Exemplo",
    "numero": "100",
    "complemento": "",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  },
  "latitude": -23.5505,
  "longitude": -46.6333,
  "areaM2": 15000,
  "areaVertices": [
    { "latitude": -23.551, "longitude": -46.634 }
  ],
  "ip": "10.0.0.1",
  "equipamentos": [{
    "equipamentoId": "<ObjectID>",
    "porta": 502,
    "nomeLocal": "Nobreak principal",
    "paginaWeb": true,
    "portaWeb": 80,
    "maquinaId": "maq-1",
    "maquinaNome": "Sala nobreaks",
    "slaveId": 1
  }],
  "intervaloS": 30,
  "alertaOfflineS": 60
}
```

- `codigo`: apenas dígitos, obrigatório.
- `areaVertices`: mínimo 3 vértices para persistir polígono.
- Defaults: `intervaloS=30`, `alertaOfflineS=60`.

### Colaboradores

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/colaboradores` | JWT | — | `Colaborador[]` |
| POST | `/colaboradores` | JWT + ManageData | `Colaborador` | `201 Colaborador` |
| PUT | `/colaboradores/{id}` | JWT + ManageData | `Colaborador` | `Colaborador` |
| DELETE | `/colaboradores/{id}` | JWT + ManageData | — | `204` |

- Create exige `dataNascimento` (gera senha hash).
- Default: `status=escritorio`, `fotoUrl=/avatar-placeholder.svg`.
- `senhaHash` nunca retornado na API.

### Missões

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/missoes` | JWT | — | `Missao[]` |
| POST | `/missoes` | JWT + ManageData | `Missao` | `201 Missao` |
| PUT | `/missoes/{id}/iniciar` | JWT | — | `Missao` |
| PUT | `/missoes/{id}/concluir` | JWT | ver abaixo | `Missao` |
| PUT | `/missoes/{id}` | JWT + ManageMissoes | `Missao` | `Missao` |
| DELETE | `/missoes/{id}` | JWT + ManageMissoes | — | `204` |

**Concluir missão (body):**

```json
{
  "dataConclusao": "2026-06-12",
  "horaConclusao": "18:30",
  "relatorioConclusao": "Texto do relatório..."
}
```

**Regras:**
- `iniciar`: colaborador atribuído, status `planejada`.
- `concluir`: admin/dev ou colaborador atribuído, missão iniciada.
- Create: `titulo` e `unidadeId` obrigatórios; default `status=em_andamento` se vazio.

### Veículos

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/veiculos` | JWT | — | `Veiculo[]` |
| POST | `/veiculos` | JWT + ManageData | `Veiculo` | `201 Veiculo` |
| PUT | `/veiculos/{id}` | JWT + ManageData | `Veiculo` | `Veiculo` |
| DELETE | `/veiculos/{id}` | JWT + ManageData | — | `204` |

Validações: placa 7 chars (ABC1234 ou ABC1D23), `marca`/`modelo`/`colaboradorId` obrigatórios, `kmAtual >= 0`.

### Equipamentos (catálogo global)

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/equipamentos` | JWT | — | `Equipamento[]` |
| POST | `/equipamentos` | JWT + ManageData | `Equipamento` | `201 Equipamento` |
| PUT | `/equipamentos/{id}` | JWT + ManageData | `Equipamento` | `Equipamento` |
| DELETE | `/equipamentos/{id}` | JWT + ManageData | — | `204` |
| POST | `/equipamentos/snmp/test-oid` | JWT + ManageData | ver abaixo | teste |
| POST | `/equipamentos/modbus/test-offset` | JWT + ManageData | ver abaixo | teste |

**Teste SNMP:**

```json
{ "host": "10.0.0.1", "port": 161, "community": "public", "oid": "1.3.6.1.2.1.1.1.0" }
```

**Resposta teste:** `{ "online": true, "valor": "...", "erro": "..." }`

**Teste Modbus:**

```json
{ "host": "10.0.0.1", "port": 502, "slaveId": 1, "registro": "holding_register", "offset": 0, "tipoDado": "uint16" }
```

### Antenas (SQLite externo, somente leitura)

| Método | Path | Auth | Query | Response |
|--------|------|------|-------|----------|
| GET | `/antenas/proximas` | JWT | `lat`, `lng` (obrig.), `raio_km` (padrão 10, máx 20) | `Antena[]` |

Retorna `503` se `ANTENAS_DB_PATH` não configurado.

---

## 5. WebSocket — monitoramento em tempo real

```
GET /ws?token=<jwt>
```

- Autenticação: JWT na query **ou** header `Authorization: Bearer`.
- Direção: **servidor → cliente** (mensagens do cliente ignoradas, exceto pong).
- Keepalive: ping ~54s, timeout pong 60s.

### Mensagens

**Snapshot ao conectar:**

```json
{
  "type": "snapshot",
  "payload": [ /* DeviceMetric[] */ ]
}
```

**Atualização:**

```json
{
  "type": "update",
  "payload": { /* DeviceMetric */ }
}
```

### DeviceMetric

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `targetId` | string | Chave única do alvo |
| `equipamentoId` | string | ID do equipamento no catálogo |
| `unidadeId` | string | ID da unidade |
| `dispositivoId` | string | ID legado do dispositivo |
| `tipo` | `"ping"` \| `"modbus"` \| `"snmp"` | Protocolo |
| `host` | string | IP/host monitorado |
| `porta` | number | Porta (opcional para ping) |
| `online` | boolean | Status |
| `latenciaMs` | number | Latência ping |
| `valores` | object | Mapa chave→valor (leituras Modbus/SNMP) |
| `updatedAt` | string (ISO8601) | Última atualização |

**Helpers de targetId:**

```typescript
monitorTargetId(unidadeId, equipamentoId, porta) // "{unidadeId}:{equipamentoId}:{porta}"
monitorUnidadeHostTargetId(unidadeId)             // "{unidadeId}:host"
```

---

## 6. Modelos de dados

### Enums

```typescript
type ChamadoStatus = "aberto" | "em_andamento" | "encerrado"
type MissaoStatus = "planejada" | "em_andamento" | "concluida"
type ColaboradorStatus = "atrasado" | "em_missao" | "escritorio" | "almoco" | "ferias" | "atestado"
type TipoEquipamento = "nobreak" | "sensor"
type TipoMonitoramento = "modbus" | "snmp"
type EstadoCivil = "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel"
type LocalTrabalho = "campo" | "escritorio" | "oficina" | "laboratorio"
type TipoAcessoSistema = "usuario" | "admin_com_financeiro" | "admin_sem_financeiro" | "desenvolvedor"
```

### Chamado

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ObjectID hex |
| `numero` | string | 6 dígitos (ex.: `000101`) |
| `titulo`, `descricao` | string | |
| `status` | ChamadoStatus | |
| `unidadeId` | string | |
| `abertoPor` | string | Nome do contato na unidade |
| `data` | string | YYYY-MM-DD |
| `hora`, `horaTeste` | string | HH:mm |
| `sinaisDetectados` | string[] | TIM, Claro, Vivo, Wi-Fi, Outros |
| `sinaisOutros` | string | Texto se "Outros" |
| `locaisAfetados` | string | |
| `comunicacao` | string[] | Opções de comunicação |
| `comunicacaoOutros` | string | |
| `emailAssunto`, `emailCorpo` | string | Gerados na abertura |
| `encerradoPor` | string | |
| `dataEncerramento`, `horaEncerramento`, `horaTestePos` | string | |
| `diagnostico`, `acoesRealizadas`, `observacoesEncerramento` | string | |
| `sinaisPosTeste`, `sinaisPosTesteOutros` | string[] / string | Pós-intervenção |
| `emailEncerramentoAssunto`, `emailEncerramentoCorpo` | string | |
| `colaboradorIds` | string[] | Atribuídos à missão |
| `previsaoChegadaData`, `previsaoChegadaHora` | string | |
| `missaoId` | string | Missão vinculada |
| `emailAutorizacaoAssunto`, `emailAutorizacaoCorpo` | string | E-mail de autorização de entrada |
| `createdAt`, `updatedAt` | ISO8601 | |

**Opções fixas (UI):**

- **Sinais:** TIM, Claro, Vivo, Wi-Fi, Outros
- **Comunicação:** Não completou ligação, Completou ligação, Enviou SMS, Acessou dados, Outros

### Unidade

| Campo | Tipo |
|-------|------|
| `id`, `codigo`, `nome` | string |
| `diretores`, `telefones`, `emails` | string[] |
| `endereco` | UnidadeEndereco |
| `latitude`, `longitude`, `areaM2` | number |
| `areaVertices` | `{ latitude, longitude }[]` |
| `ip` | string |
| `equipamentos` | UnidadeEquipamento[] |
| `intervaloS` | number (coleta, padrão 30) |
| `alertaOfflineS` | number (toast offline, padrão 60) |

**UnidadeEquipamento:** `equipamentoId`, `porta`, `nomeLocal`, `paginaWeb`, `portaWeb`, `maquinaId`, `maquinaNome`, `slaveId`.

### Colaborador

| Campo | Tipo |
|-------|------|
| `id`, `nome`, `fotoUrl` | string |
| `dataNascimento`, `cpf`, `rg`, `rgOrgaoEmissor` | string |
| `telefoneContato`, `email`, `emailCorporativo`, `telefoneCorporativo` | string |
| `estadoCivil`, `conjuge`, `conjugeCpf` | string |
| `dependentes` | `{ nome, dataNascimento, rg, cpf }[]` |
| `endereco` | UnidadeEndereco |
| `cargo`, `dataAdmissao` | string |
| `localTrabalho` | LocalTrabalho |
| `salario` | number |
| `tipoAcesso` | TipoAcessoSistema |
| `status` | ColaboradorStatus |
| `unidadeId` | string |

### Missao

| Campo | Tipo |
|-------|------|
| `id`, `titulo` | string |
| `status` | MissaoStatus |
| `unidadeId`, `chamadoId` | string |
| `colaboradorIds` | string[] |
| `dataInicio`, `horaInicio` | string |
| `concluidaPor`, `dataConclusao`, `horaConclusao`, `relatorioConclusao` | string |

### Veiculo

`id`, `placa`, `marca`, `modelo`, `anoFabricacao`, `anoModelo`, `cor`, `chassi`, `renavam`, `kmAtual`, `fotoUrl`, `colaboradorId`.

### Equipamento (catálogo)

| Campo | Tipo |
|-------|------|
| `id`, `nome`, `marca` | string |
| `tipoEquipamento` | nobreak \| sensor |
| `tipoSensor` | string (se sensor) |
| `tipoMonitoramento` | modbus \| snmp |
| `config` | DispositivoConfig |

**ModbusPonto:** `nome`, `offset`, `registro`, `unidade`, `multiplicador`, `tipoDado`, `estadosMulti[]`, `descricao`, `desabilitado`.

**SnmpPonto:** `nome`, `oid`, `unidade`, `multiplicador`, `tipoSnmp`, `tipoDado`, `estadosMulti[]`, `descricao`, `desabilitado`.

**SnmpMultiEstadoItem:** `chave`, `exibicao`, `cor` (#RRGGBB).

### Antena (somente leitura)

`id`, `nomeEntidade`, `tecnologia`, `latitude`, `longitude`, `azimute`, `potenciaW`, `alturaAntena`, `municipio`, `numEstacao`, `distanciaKm`.

---

## 7. Sistema web — rotas e navegação

### Rotas públicas

| Rota | Descrição |
|------|-----------|
| `/` | Tela de login |

### Rotas protegidas (requer JWT no cookie `mmrtec_token`)

| Rota | Sidebar | Descrição |
|------|---------|-----------|
| `/dashboard` | Sim | Painel operacional (resumo) |
| `/dashboard/unidades` | Sim | Lista de unidades |
| `/dashboard/unidades/[id]` | **Não** | Detalhe da unidade (nova aba) |
| `/dashboard/equipamentos` | Sim* | Catálogo de equipamentos |
| `/dashboard/colaboradores` | Sim | Colaboradores |
| `/dashboard/veiculos` | Sim | Frota |
| `/dashboard/chamados` | Sim | Chamados |
| `/dashboard/missoes` | Sim | Missões |
| `/dashboard/painel-monitoramento` | **Não** | NOC fullscreen (nova aba) |

\* Menu "Equipamentos" oculto para usuários sem permissão; rota redireciona para `/dashboard`.

### Menu lateral (sidebar)

1. Início → `/dashboard`
2. Unidades Prisionais → `/dashboard/unidades`
3. Equipamentos → `/dashboard/equipamentos` (admin/dev)
4. Colaboradores → `/dashboard/colaboradores`
5. Veículos → `/dashboard/veiculos`
6. Chamados → `/dashboard/chamados`
7. Missões → `/dashboard/missoes`

### Header global

- Botão **Painel de monitoramento** → nova aba `/dashboard/painel-monitoramento`
- Menu do usuário com logout
- Indicador de status WebSocket (conectando / conectado / desconectado)

### Fluxo de autenticação (web)

```
1. POST /api/v1/auth/login { email, password }
2. Salva em localStorage "mmrtec_auth" + cookie "mmrtec_token" (8h, SameSite=Lax)
3. middleware.ts valida JWT no cookie para /dashboard/*
4. AuthProvider verifica expiração a cada 30s
5. apiFetch com 401 → limpa sessão → redirect /
6. Logout → limpa storage/cookie → redirect /
```

---

## 8. Páginas e painéis

### 8.1 Login (`/`)

Campos: e-mail, senha. Submit → login → redirect `/dashboard`.

### 8.2 Dashboard operacional (`/dashboard`)

- Card **Missões em andamento** (contador)
- Tabela **Últimos chamados**
- Lista **Colaboradores** com badge de status operacional
- Poll `GET /dashboard/summary` a cada 30s
- Métricas WebSocket em contexto global

### 8.3 Painel de monitoramento (`/dashboard/painel-monitoramento`)

Layout fullscreen dedicado ao NOC:

- **Sidebar:** lista de unidades (offline primeiro), badges ONLINE / OFFLINE / SEM IP
- **Aba Equipamentos:** grid de leituras em tempo real por unidade selecionada
- **Aba Mapa:** mapa geográfico das unidades + alerta sonoro offline
- Subheader com toggle Equipamentos / Mapa

### 8.4 Detalhe da unidade (`/dashboard/unidades/[id]`)

- **Coluna esquerda:** dados cadastrais, conectividade, equipamentos vinculados, missões
- **Coluna direita:** mapa Leaflet + seção de chamados da unidade
- Ações: editar unidade, gerenciar equipamentos, planejar missão, mapas de coordenadas/área

### 8.5 Listagens (unidades, colaboradores, veículos, chamados, missões, equipamentos)

Padrão comum:

- Campo de **busca local** (filtro no cliente, sem API)
- Tabela com ações (editar, excluir, ver detalhes)
- Botão **Adicionar** (conforme permissão)
- Diálogos modais para CRUD

**Filtros de busca:**

| Página | Campos filtrados |
|--------|------------------|
| Unidades | código, nome, cidade, IP, área |
| Colaboradores | nome, cargo, CPF, e-mail, status |
| Veículos | placa, marca, modelo, condutor |
| Chamados | número, título, unidade, status |
| Missões | título, unidade, colaborador, chamado, status |
| Equipamentos | nome, marca, tipo |

### 8.6 Monitoramento em tempo real (global)

- WebSocket conectado em todas as páginas do dashboard
- **OfflineAlertMonitor:** toast quando unidade/equipamento offline além de `alertaOfflineS`
- Leituras exibidas com cores conforme multi-estado SNMP/Modbus

---

## 9. Modais e diálogos

Todos usam **Dialog** (não Sheet).

### Autenticação / genéricos

| Modal | Uso |
|-------|-----|
| `EntityFormDialog` | Wrapper genérico criar (unidade, equipamento, missão) |
| `FormErroDialog` | Erro de API ao salvar colaborador |
| `SenhaInicialColaboradorDialog` | Exibe senha inicial após criar colaborador |

### Por módulo

| Módulo | Modais |
|--------|--------|
| **Colaboradores** | Adicionar, Editar, Excluir |
| **Veículos** | Adicionar, Editar, Excluir |
| **Chamados** | Abrir chamado, Editar abertura, Detalhe (atribuir missão + encerrar) |
| **Missões** | Detalhe (iniciar/concluir), Excluir, Planejar missão (na unidade) |
| **Unidades** | Editar, Coordenadas no mapa, Área (polígono), Gerenciar equipamentos, Novo equipamento |
| **Equipamentos** | Editar catálogo, Ponto SNMP, Ponto Modbus, Teste OID, Teste offset |

### Chamado — detalhe (fluxo principal)

O modal de detalhe do chamado concentra o ciclo de vida:

1. **Visualização** — dados de abertura, e-mails gerados
2. **Atribuir missão** (chamado `aberto`) — selecionar colaboradores, previsão de chegada, preview e-mail autorização
3. **Encerramento** (chamado `em_andamento`) — diagnóstico, ações, sinais pós-teste, e-mail encerramento

---

## 10. Formulários e campos

### 10.1 Unidade

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Código (ID) | numérico | Sim | Apenas dígitos |
| Nome | texto | Sim | |
| Diretores | lista dinâmica | — | |
| Telefones | lista (`tel`) | — | |
| E-mails | lista (`email`) | — | |
| CEP | texto | — | Auto ViaCEP |
| Logradouro, Número, Complemento, Bairro, Cidade | texto | — | |
| Estado | select (UF) | — | |
| Latitude, Longitude | número + mapa | — | `CoordenadasMapDialog` |
| Área (m²) | readonly + mapa | — | `UnidadeAreaMapDialog` (polígono) |
| IP | texto | — | |
| Intervalo coleta (s) | number min 5 | — | |
| Alerta offline (s) | number min 10 | — | |

### 10.2 Colaborador

**Pessoais:** foto (upload), nome*, data nascimento*, telefone*, e-mail*, CPF*, RG*, órgão emissor*, estado civil*, cônjuge/CPF cônjuge (se casado), dependentes (nome, data nasc., CPF).

**Endereço:** CEP (ViaCEP), rua, número, complemento, bairro, cidade, estado.

**Profissionais:** cargo, local de trabalho (campo/escritório/oficina/laboratório), data admissão, telefone corporativo, e-mail corporativo, salário (opcional), tipo de acesso.

### 10.3 Veículo

Foto (upload), placa*, KM atual*, marca*, modelo*, ano fabricação/modelo, cor, RENAVAM, chassi, colaborador responsável (select).

### 10.4 Equipamento (catálogo)

Marca, modelo/nome, tipo (nobreak/sensor), tipo sensor (texto), protocolo (modbus/snmp), pontos SNMP/Modbus (editores com sub-diálogos).

**Ponto SNMP:** nome, OID, tipo dado, multiplicador, estados multi, tipo SNMP (SMI), sufixo, descrição, desabilitado.

**Ponto Modbus:** nome, offset, registro (coil/input/holding/input register), tipo dado, multiplicador, estados multi, sufixo, descrição, desabilitado.

### 10.5 Vínculo equipamento na unidade

**Modo Nobreak:** select nobreak, nome local, porta, página web (sim/não), porta web.

**Modo Máquina:** nome máquina, porta, lista sensores (select + slave ID), página web.

**Gerenciar vínculos:** editar nome local, slave ID, portas web — persistência imediata via PUT unidade.

### 10.6 Chamado — abertura

Número (6 dígitos), unidade (select), aberto por, data, hora, hora teste, sinais (checkboxes), locais afetados, comunicação (checkboxes), preview e-mail (readonly).

### 10.7 Chamado — atribuir missão

Colaboradores (checkboxes), previsão chegada (data + hora), preview e-mail autorização.

### 10.8 Chamado — encerramento

Encerrado por, data, hora, hora teste pós, diagnóstico, ações realizadas, sinais pós-teste, observações, preview e-mail encerramento.

### 10.9 Missão — cadastro

Título, status, unidade, chamado vinculado, colaboradores (checkboxes).

### 10.10 Missão — planejar na unidade

Colaboradores, data/hora início, chamado opcional, **empresa parceira** (opcional):

| Campo | Tipo |
|-------|------|
| Tem empresa parceira | checkbox |
| Nome empresa | texto |
| Trabalho a realizar | texto |
| Local | select: "Na sala de nobreaks" / "Outro" (+ texto livre) |
| Colaboradores parceiros | lista: nome, tipo doc (RG/CPF), número |

> Campos de empresa parceira alimentam o corpo do e-mail de autorização; **não são persistidos** na entidade Missao da API.

### 10.11 Missão — conclusão

Concluída por (readonly = usuário logado), data, hora, relatório de conclusão (textarea).

---

## 11. Fluxos de negócio

### Ciclo do chamado

```
aberto ──(atribuir missão)──► em_andamento ──(encerrar)──► encerrado
         │                              │
         │                              └── missão criada/atualizada
         └── POST /missoes + PUT chamado (colaboradorIds, missaoId, status)
```

Ao atribuir missão:
1. `POST /api/v1/missoes` com colaboradores e unidade
2. `PUT /api/v1/chamados/{id}` — status `em_andamento`, `colaboradorIds`, `previsaoChegada*`, e-mails autorização
3. `PUT /api/v1/colaboradores/{id}` — status `em_missao` para atribuídos

### Ciclo da missão

```
planejada ──(iniciar)──► em_andamento ──(concluir)──► concluida
```

- **Iniciar:** `PUT /missoes/{id}/iniciar` — colaborador atribuído
- **Concluir:** `PUT /missoes/{id}/concluir` — body com relatório; restaura status colaboradores

### Operador comum (`usuario`)

1. Login → dashboard
2. Ver chamados e missões
3. Se atribuído: iniciar missão planejada, concluir missão em andamento, encerrar chamado em andamento
4. Ver unidades (detalhe em nova aba, sem gerenciar equipamentos)

### Administrador / desenvolvedor

- CRUD completo em cadastros
- Abrir chamados, atribuir missões
- Vincular equipamentos nas unidades
- Desenvolvedor: acesso ao catálogo de equipamentos

### Monitoramento NOC

1. Abrir painel de monitoramento (tela dedicada)
2. Selecionar unidade na sidebar
3. Alternar abas Equipamentos / Mapa
4. Receber alertas offline (toast + som no mapa)

---

## 12. Rotas auxiliares do Next.js

Estas rotas **não existem na API Go** — rodam no servidor Next.js (mesmo origin do web).

| Método | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/colaboradores/foto` | JWT (cookie/header) | `multipart/form-data`: `file`, `oldFotoUrl?` | `{ "url", "bytes" }` |
| POST | `/api/veiculos/foto` | JWT | idem | `{ "url", "bytes" }` |
| GET | `/pics/[[...path]]` | — | — | Arquivo de imagem |
| GET | `/pics/[filename]` | — | — | Arquivo de imagem |

**Upload:** máximo 5 MB, apenas imagens. URL retornada usada em `fotoUrl` do colaborador/veículo antes do POST/PUT na API Go.

> **Mobile:** implementar upload equivalente ou enviar URL de foto hospedada externamente, conforme decisão de arquitetura.

---

## 13. Serviços externos

| Serviço | Uso no web |
|---------|------------|
| **ViaCEP** | Autopreenchimento de endereço por CEP |
| **Nominatim** | Geocoding (coordenadas ↔ endereço) |
| **OSRM** | Cálculo de rota para missões no mapa |
| **Leaflet** | Mapas (unidades, área, painel, antenas) |

Antenas próximas vêm da **API Go** (`/antenas/proximas`), não de serviço externo direto.

---

## 14. Notas para implementação mobile

### Prioridades funcionais sugeridas

1. **Auth** — login, refresh de sessão, logout
2. **Dashboard summary** — resumo operacional
3. **Chamados** — listar, detalhe, encerrar (se atribuído)
4. **Missões** — listar, iniciar, concluir
5. **Unidades** — listar, detalhe, mapa
6. **WebSocket** — métricas ao vivo (painel NOC mobile)
7. **Cadastros admin** — conforme perfil

### Consumo da API

```typescript
// Exemplo de chamada autenticada
const res = await fetch(`${API_URL}/api/v1/chamados`, {
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
});
```

### WebSocket mobile

```typescript
const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === "snapshot") { /* DeviceMetric[] */ }
  if (msg.type === "update") { /* DeviceMetric */ }
};
```

### IDs

Todos os IDs são **ObjectID MongoDB** em formato hex (24 caracteres). Path inválido → `400 id inválido`.

### Labels de status (UI)

| Enum | Label PT |
|------|----------|
| chamado `aberto` | Aberto |
| chamado `em_andamento` | Em andamento |
| chamado `encerrado` | Encerrado |
| missao `planejada` | Planejada |
| missao `em_andamento` | Em andamento |
| missao `concluida` | Concluída |
| colaborador `em_missao` | Em missão |
| colaborador `escritorio` | Escritório |
| colaborador `almoco` | Horário de almoço |
| colaborador `ferias` | Férias |
| colaborador `atestado` | Atestado |
| colaborador `atrasado` | Atrasado |

### Referência de tipos

Fonte canônica: `packages/shared-types/index.ts`

Campos com `_localId` são **apenas UI** (React) — não enviar à API.

### E-mails gerados

O web gera automaticamente assunto/corpo para:

- Abertura de chamado
- Autorização de entrada (missão)
- Encerramento de chamado

Templates em `apps/web/src/lib/chamado-email.ts`. Mobile pode reutilizar a mesma lógica ou delegar geração ao backend no futuro.

---

*Documento gerado a partir do código em `services/api` e `apps/web`. Atualize este arquivo quando novas rotas ou telas forem adicionadas.*
