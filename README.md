# MMRTEC — Monitoramento de Unidades Prisionais

Sistema de monitoramento operacional com dashboard em tempo real, coleta contínua (PING, Modbus, SNMP) no backend Go e interface Next.js.

## Estrutura

```
monitoramentommrtec/
├── apps/web/           # Next.js 15 + Tailwind + shadcn/ui
├── services/api/       # API Go (REST + WebSocket + collectors)
├── packages/shared-types/
└── docker-compose.yml  # MongoDB local (opcional)
```

## Pré-requisitos

- Node.js 20+
- Go 1.22+
- MongoDB Atlas ou Mongo local (opcional — sem URI usa memória)

## Configuração

Copie `.env.example` para os arquivos de ambiente:

```bash
# Raiz → services/api/.env
PORT=8081
MONGODB_URI=mongodb://localhost:27017/monitoramento
MONGODB_DATABASE=monitoramento
CORS_ORIGINS=http://localhost:3000
COLLECTOR_ENABLED=true

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws
```

### MongoDB Atlas

Defina `MONGODB_URI` com a connection string do Atlas. Execute o seed (apenas se o banco estiver vazio):

```bash
cd services/api
go run ./cmd/seed
```

## Executar localmente

**API (terminal 1):**

```bash
cd services/api
go run ./cmd/api
```

**Frontend (terminal 2):**

```bash
cd apps/web
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — login sem autenticação, botão **Entrar** abre o dashboard.

**Porta 8080 ocupada?** Muitas instalações Windows usam Tomcat na 8080. O projeto usa **8081** por padrão. O `.env` na **raiz do monorepo** é carregado automaticamente ao rodar `go run` em `services/api`.

### Erro `cannot find package` no `go run` (pasta OneDrive / `Área de Trabalho`)

O Go 1.26 pode falhar ao compilar em caminhos com **acentos** (ex.: `Área de Trabalho`). Use o script:

```powershell
.\scripts\run-api.ps1
```

Ele copia o código para `%LOCALAPPDATA%\mmrtec-api-build` (caminho ASCII) e executa a API de lá. Alternativa: mover o projeto para algo como `C:\dev\monitoramentommrtec`.

## Docker (Mongo + API)

```bash
docker compose up -d mongo
# Configure MONGODB_URI e suba a API manualmente ou estenda o compose
```

## API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Healthcheck |
| GET | `/api/v1/dashboard/summary` | Resumo do painel |
| GET | `/api/v1/monitoring/live` | Métricas em cache |
| GET/POST/PUT | `/api/v1/unidades` | Unidades |
| GET/POST/PUT | `/api/v1/colaboradores` | Colaboradores |
| GET/POST/PUT | `/api/v1/chamados` | Chamados |
| GET | `/api/v1/eventos` | Eventos de monitoramento |
| WS | `/ws` | Snapshot + updates em tempo real |

## Próximos passos

- Autenticação (JWT ou SSO)
- RBAC e alarmes por e-mail/WhatsApp
- Métricas Prometheus no backend
