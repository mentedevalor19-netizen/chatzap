# WhatsApp Cloud CRM

CRM de atendimento via WhatsApp construído exclusivamente sobre a API Oficial do WhatsApp Cloud API da Meta. A proposta é um chat rápido, limpo e profissional, com experiência próxima ao WhatsApp Web e arquitetura pronta para evoluir sem depender de APIs não oficiais.

## 1. Estrutura de Pastas

```txt
.
├── apps
│   ├── api                 # NestJS, Prisma, Webhooks, Socket.IO, uploads
│   │   ├── prisma
│   │   │   ├── migrations
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src
│   │       ├── common
│   │       └── modules
│   │           ├── auth
│   │           ├── contacts
│   │           ├── conversations
│   │           ├── messages
│   │           ├── prisma
│   │           ├── realtime
│   │           ├── redis
│   │           ├── search
│   │           ├── tags
│   │           ├── uploads
│   │           └── whatsapp
│   └── web                 # Next.js 15, React, TailwindCSS, shadcn-style UI
│       ├── app
│       ├── components
│       │   ├── auth
│       │   ├── chat
│       │   └── ui
│       ├── hooks
│       ├── lib
│       └── stores
├── packages
│   └── shared              # Tipos compartilhados do domínio
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## 2. Modelos do Prisma

Os modelos estão em `apps/api/prisma/schema.prisma`.

- `Organization`: base multiusuário/multitenant.
- `User`: usuários do CRM com `ADMIN` ou `AGENT`.
- `Contact`: contatos do WhatsApp, indexados por `organizationId + waId`.
- `Conversation`: atendimento com status `OPEN`, `PENDING` ou `CLOSED`.
- `Message`: mensagens inbound/outbound com texto, mídia, localização, contato, sticker e template.
- `Tag`: tags coloridas por organização.
- `ContactTag`: relacionamento muitos-para-muitos entre contatos e tags.
- `Note`: notas internas do contato.

A migration inicial está em `apps/api/prisma/migrations/20260726120000_init/migration.sql`.

## 3. Endpoints da API

Base local: `http://localhost:4000/api/v1`

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/login` | Login JWT |
| `GET` | `/auth/me` | Usuário autenticado |
| `GET` | `/contacts?search=` | Lista/pesquisa contatos |
| `POST` | `/contacts` | Cria contato |
| `GET` | `/contacts/:id` | Detalha contato |
| `PATCH` | `/contacts/:id` | Atualiza contato |
| `DELETE` | `/contacts/:id` | Remove contato |
| `GET` | `/contacts/:id/notes` | Lista notas internas |
| `POST` | `/contacts/:id/notes` | Cria nota interna |
| `GET` | `/tags` | Lista tags |
| `POST` | `/tags` | Cria tag |
| `PATCH` | `/tags/:id` | Atualiza tag |
| `DELETE` | `/tags/:id` | Remove tag |
| `GET` | `/conversations?status=&search=` | Lista conversas |
| `GET` | `/conversations/:id` | Detalha conversa |
| `PATCH` | `/conversations/:id/status` | Altera status |
| `PATCH` | `/conversations/:id/assign` | Atribui atendente |
| `POST` | `/conversations/:id/read` | Zera não lidas |
| `GET` | `/conversations/:id/messages?cursor=&limit=` | Histórico com paginação |
| `POST` | `/conversations/:id/messages` | Envia texto, mídia, localização, contato ou template |
| `POST` | `/uploads` | Upload com Multer |
| `GET` | `/uploads/files/:fileName` | Download/URL pública local |
| `GET` | `/search?q=` | Busca global |
| `GET` | `/webhooks/whatsapp` | Verificação Meta |
| `POST` | `/webhooks/whatsapp` | Recebimento de eventos Meta |

## 4. Fluxo dos Webhooks

1. Meta chama `GET /webhooks/whatsapp` com `hub.verify_token`.
2. A API valida contra `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e retorna `hub.challenge`.
3. Meta envia eventos em `POST /webhooks/whatsapp`.
4. O backend interpreta `messages` e `statuses`.
5. Para mensagens recebidas, o backend faz upsert do contato por `waId`.
6. Abre ou reutiliza uma conversa não finalizada.
7. Persiste a mensagem no PostgreSQL com `rawPayload`.
8. Para mídias, salva `mediaId`, `mimeType`, legenda, arquivo e tenta resolver a URL temporária pela Cloud API.
9. Para status `sent`, `delivered`, `read` ou `failed`, atualiza a mensagem outbound pelo `waMessageId`.
10. O `RealtimeGateway` publica `conversation.upsert`, `message.created` e `message.status` via Socket.IO.

## 5. Telas do Frontend

- `/login`: login com JWT, tema claro/escuro e credenciais iniciais de seed.
- `/`: workspace de atendimento com:
  - sidebar de conversas;
  - pesquisa instantânea;
  - aba de contatos;
  - lista com não lidas, tags e preview;
  - área principal do chat;
  - cabeçalho do contato;
  - histórico virtualizado;
  - scroll infinito para mensagens antigas;
  - envio de texto e anexos;
  - drag-and-drop de arquivos;
  - preview de upload;
  - painel lateral com dados, tags, notas e status.

## 6. Componentes Reutilizáveis

UI base em `apps/web/components/ui`:

- `Button`
- `Input`
- `Textarea`
- `Badge`
- `Avatar`
- `Skeleton`
- `Separator`
- `Tooltip`

Componentes de domínio em `apps/web/components/chat`:

- `CrmShell`
- `ConversationSidebar`
- `ConversationItem`
- `ContactCreateForm`
- `ChatPanel`
- `MessageTimeline`
- `MessageBubble`
- `MessageComposer`
- `ContactPanel`
- `StatusIcon`

## 7. Docker Compose

O `docker-compose.yml` sobe:

- `postgres`: PostgreSQL 16;
- `redis`: Redis 7;
- `api`: NestJS na porta `4000`;
- `web`: Next.js na porta `3000`.

Para usar apenas infraestrutura local durante desenvolvimento:

```bash
docker compose up postgres redis
```

Para subir tudo em containers:

```bash
docker compose up --build
```

## 8. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Principais chaves:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PUBLIC_API_URL`
- `DEFAULT_ORGANIZATION_ID`
- `META_GRAPH_API_VERSION`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

## 9. Instalação e Execução

```bash
pnpm install
pnpm approve-builds --all
pnpm prisma:generate
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Credenciais iniciais:

```txt
E-mail: admin@crm.local
Senha: admin123
```

URLs locais:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api/v1`
- Webhook Meta: `https://seu-dominio.com/api/v1/webhooks/whatsapp`

## 10. Implementação Incremental

1. Base local: subir PostgreSQL/Redis, gerar Prisma Client e rodar migrations.
2. Autenticação: validar login, JWT e proteção de rotas.
3. Contatos: testar CRUD, tags e notas internas.
4. Conversas: receber primeira mensagem via webhook e conferir criação automática.
5. Realtime: abrir duas abas e validar eventos Socket.IO.
6. Envio texto: configurar credenciais Meta e enviar mensagem outbound.
7. Mídias: testar upload local, depois troca para upload direto na Cloud API ou storage público.
8. Status: validar webhooks `sent`, `delivered`, `read` e `failed`.
9. Busca: validar pesquisa por nome, telefone e conteúdo.
10. Escala: adicionar filas, múltiplos números, chatbot/IA e políticas de retenção sem alterar o núcleo do chat.

## Validação

Comandos executados com sucesso neste workspace:

```bash
pnpm approve-builds --all
pnpm prisma:generate
pnpm --filter @wa-crm/api prisma validate
pnpm build
pnpm lint
```

Observação: a primeira tentativa de `pnpm install` falhou por pouco espaço no disco C. Após podar o cache do pnpm e aprovar builds nativos, a instalação/validação prosseguiu.

## Deploy no Coolify

Para publicar em uma VPS com Coolify, use o arquivo `docker-compose.coolify.yml`.
O passo a passo esta em `docs/coolify.md`.
