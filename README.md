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
│   │           ├── finance
│   │           ├── messages
│   │           ├── meta
│   │           ├── prisma
│   │           ├── products
│   │           ├── quick-replies
│   │           ├── realtime
│   │           ├── redis
│   │           ├── search
│   │           ├── tags
│   │           ├── uploads
│   │           ├── users
│   │           └── whatsapp
│   └── web                 # Next.js 15, React, TailwindCSS, shadcn-style UI
│       ├── app
│       ├── components
│       │   ├── admin
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
- `User`: usuários do CRM com `ADMIN` ou `AGENT`, permitindo desativar atendentes sem perder histórico.
- `Contact`: contatos do WhatsApp, indexados por `organizationId + waId`.
- `Conversation`: atendimento com status `OPEN`, `PENDING` ou `CLOSED`.
- `Message`: mensagens inbound/outbound com texto, mídia, localização, contato, sticker e template.
- `Tag`: tags coloridas por organização.
- `ContactTag`: relacionamento muitos-para-muitos entre contatos e tags.
- `Note`: notas internas do contato.
- `Funnel`: funil ativo por organização.
- `FunnelStep`: etapas ordenadas com texto, imagem, áudio, vídeo, documento, pausa por resposta, atraso antes do envio e áudio como nota de voz.
- `ConversationFunnelRun`: estado de execução do funil em cada conversa.
- `QuickReply`: respostas rápidas por organização, acionadas no chat pelo atalho `/comando`, com texto e imagem opcional.
- `Product`: catálogo simples de produtos para selecionar no cadastro da venda.
- `Sale`: vendas manuais com valor, status, data, atendente e vínculo opcional com produto, contato/conversa.
- `Expense`: gastos manuais por categoria para ads, fornecedores, LTV, ferramentas e outros custos.
- `MetaIntegrationSetting`: configurações da Meta Conversions API por organização.
- `AdAttribution`: dados do anúncio Click-to-WhatsApp capturados do webhook, incluindo `ctwa_clid`.
- `MetaConversionEvent`: histórico de envios, falhas e eventos ignorados da Conversions API.

As migrations estão em `apps/api/prisma/migrations`.

## 3. Endpoints da API

Base local: `http://localhost:4000/api/v1`

| Método   | Rota                                                    | Uso                                                                      |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET`    | `/health`                                               | Health check                                                             |
| `POST`   | `/auth/login`                                           | Login JWT                                                                |
| `GET`    | `/auth/me`                                              | Usuário autenticado                                                      |
| `GET`    | `/users?search=`                                        | Lista usuários/atendentes                                                |
| `POST`   | `/users`                                                | Cria atendente ou admin                                                  |
| `PATCH`  | `/users/:id`                                            | Atualiza atendente                                                       |
| `DELETE` | `/users/:id`                                            | Desativa atendente                                                       |
| `GET`    | `/contacts?search=`                                     | Lista/pesquisa contatos                                                  |
| `POST`   | `/contacts`                                             | Cria contato                                                             |
| `GET`    | `/contacts/:id`                                         | Detalha contato                                                          |
| `PATCH`  | `/contacts/:id`                                         | Atualiza contato                                                         |
| `DELETE` | `/contacts/:id`                                         | Remove contato                                                           |
| `GET`    | `/contacts/:id/notes`                                   | Lista notas internas                                                     |
| `POST`   | `/contacts/:id/notes`                                   | Cria nota interna                                                        |
| `GET`    | `/tags`                                                 | Lista tags                                                               |
| `POST`   | `/tags`                                                 | Cria tag                                                                 |
| `PATCH`  | `/tags/:id`                                             | Atualiza tag                                                             |
| `DELETE` | `/tags/:id`                                             | Remove tag                                                               |
| `GET`    | `/conversations?status=&search=`                        | Lista conversas                                                          |
| `GET`    | `/conversations/:id`                                    | Detalha conversa                                                         |
| `PATCH`  | `/conversations/:id/status`                             | Altera status                                                            |
| `PATCH`  | `/conversations/:id/assign`                             | Atribui atendente                                                        |
| `POST`   | `/conversations/:id/read`                               | Zera não lidas                                                           |
| `POST`   | `/conversations/:id/funnel/start`                       | Envia o funil inicial e encaminha para humano                            |
| `GET`    | `/conversations/:id/messages?cursor=&limit=`            | Histórico com paginação                                                  |
| `POST`   | `/conversations/:id/messages`                           | Envia texto, mídia, localização, contato ou template                     |
| `GET`    | `/funnels/active`                                       | Retorna o funil ativo da organização                                     |
| `PUT`    | `/funnels/active`                                       | Cria/atualiza o funil ativo                                              |
| `GET`    | `/quick-replies?search=`                                | Lista/pesquisa respostas rápidas                                         |
| `POST`   | `/quick-replies`                                        | Cria resposta rápida                                                     |
| `PATCH`  | `/quick-replies/:id`                                    | Atualiza resposta rápida                                                 |
| `DELETE` | `/quick-replies/:id`                                    | Remove resposta rápida                                                   |
| `GET`    | `/products?search=&activeOnly=`                         | Lista produtos                                                           |
| `POST`   | `/products`                                             | Cria produto                                                             |
| `PATCH`  | `/products/:id`                                         | Atualiza produto                                                         |
| `DELETE` | `/products/:id`                                         | Desativa produto                                                         |
| `GET`    | `/sales?from=&to=&sellerId=&contactId=&status=&search=` | Lista vendas                                                             |
| `POST`   | `/sales`                                                | Registra venda manual                                                    |
| `PATCH`  | `/sales/:id`                                            | Atualiza venda                                                           |
| `DELETE` | `/sales/:id`                                            | Remove venda                                                             |
| `GET`    | `/expenses?from=&to=&category=&search=`                 | Lista gastos                                                             |
| `POST`   | `/expenses`                                             | Registra gasto manual                                                    |
| `PATCH`  | `/expenses/:id`                                         | Atualiza gasto                                                           |
| `DELETE` | `/expenses/:id`                                         | Remove gasto                                                             |
| `GET`    | `/metrics/crm?from=&to=`                                | Resumo de faturamento, gastos, lucro, margem, LTV e vendas por atendente |
| `GET`    | `/meta/conversions/settings`                            | Retorna configuração da Meta CAPI sem expor token                        |
| `PUT`    | `/meta/conversions/settings`                            | Salva dataset, WABA ID, token e preferências de envio                    |
| `GET`    | `/meta/conversions/events`                              | Lista eventos enviados/tentados para a Meta                              |
| `POST`   | `/meta/conversions/events/:id/retry`                    | Reenvia evento com falha/ignorado                                        |
| `POST`   | `/meta/conversions/sales/:saleId/send`                  | Envia manualmente uma venda paga para a Meta                             |
| `POST`   | `/uploads`                                              | Upload com Multer                                                        |
| `GET`    | `/uploads/files/:fileName`                              | Download/URL pública local                                               |
| `GET`    | `/whatsapp/media/:mediaId`                              | Proxy para reproduzir mídias inbound da Meta                             |
| `GET`    | `/search?q=`                                            | Busca global                                                             |
| `GET`    | `/webhooks/whatsapp`                                    | Verificação Meta                                                         |
| `POST`   | `/webhooks/whatsapp`                                    | Recebimento de eventos Meta                                              |

## 4. Fluxo dos Webhooks

1. Meta chama `GET /webhooks/whatsapp` com `hub.verify_token`.
2. A API valida contra `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e retorna `hub.challenge`.
3. Meta envia eventos em `POST /webhooks/whatsapp`.
4. O backend interpreta `messages` e `statuses`.
5. Para mensagens recebidas, o backend faz upsert do contato por `waId`.
6. Abre ou reutiliza uma conversa não finalizada.
7. Persiste a mensagem no PostgreSQL com `rawPayload`.
8. Para mídias, salva `mediaId`, `mimeType`, legenda, arquivo e usa um proxy do backend para reproduzir a mídia com token da Cloud API.
9. Se a mensagem veio de Click-to-WhatsApp Ads, salva o objeto `referral` em `AdAttribution`, incluindo `ctwa_clid`.
10. Na primeira mensagem recebida do contato, inicia o funil ativo.
11. Se uma etapa estiver marcada para aguardar resposta, o funil pausa e continua na próxima mensagem inbound, independentemente do conteúdo.
12. Ao concluir o funil, a conversa é atribuída a um humano e recebe uma mensagem interna de handoff.
13. Para status `sent`, `delivered`, `read` ou `failed`, atualiza a mensagem outbound pelo `waMessageId`.
14. O `RealtimeGateway` publica `conversation.upsert`, `message.created` e `message.status` via Socket.IO.

## 4.1 Fluxo Meta Ads / Conversions API

1. Cliente clica em um anúncio Click-to-WhatsApp e envia a primeira mensagem.
2. O webhook recebe `message.referral.ctwa_clid` e salva a atribuição no contato/conversa.
3. O admin configura Dataset ID, WABA ID e token de usuário de sistema na aba `Admin > Meta Ads`.
4. Quando uma venda muda para `PAID`, a API envia `Purchase` para `/{datasetId}/events`.
5. O payload usa `action_source: "business_messaging"`, `messaging_channel: "whatsapp"` e `user_data.ctwa_clid`.
6. O CRM registra o resultado em `MetaConversionEvent` como `SENT`, `FAILED` ou `SKIPPED`.

## 5. Telas do Frontend

- `/login`: login com JWT, tema claro/escuro e credenciais iniciais de seed.
- `/`: workspace de atendimento com:
  - sidebar de conversas;
  - pesquisa instantânea;
  - aba de contatos;
  - lista com não lidas, tags e preview;
  - área principal do chat;
  - cabeçalho do contato;
  - foto do lead quando cadastrada manualmente por URL/upload;
  - histórico virtualizado;
  - scroll infinito para mensagens antigas;
  - envio de texto e anexos;
  - drag-and-drop de arquivos;
  - preview de upload;
  - respostas rápidas com `/comando` para preencher o input e anexar imagem cadastrada;
  - painel lateral com dados, foto manual, tags, notas, status, marcação de venda e histórico de vendas do lead.
  - botão manual para enviar o funil inicial e iniciar o handoff humano.
  - aba própria de respostas rápidas no menu principal.
  - aba `Admin` com subtelas para funil, equipe, produtos, vendas, financeiro e Meta Ads.
  - tela de equipe para criar atendentes/admins, trocar senha inicial e ativar/desativar usuários.
  - tela de produtos para criar o catálogo selecionável no cadastro da venda.
  - tela de vendas para registrar vendas manuais por produto/atendente e filtrar por período/status.
  - tela financeiro para lançar gastos de ads, fornecedor, LTV, ferramentas e outros, exibindo faturamento, gastos, lucro, margem, ticket médio e indicadores de LTV.
  - tela Meta Ads para configurar Conversions API, ver envios recentes e reenviar eventos.

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
- `FunnelAdminPanel`
- `QuickRepliesAdminPanel`
- `StatusIcon`

Componentes administrativos em `apps/web/components/admin`:

- `FunnelAdminPanel`
- `QuickRepliesAdminPanel`
- `ProductsAdminPanel`
- `TeamAdminPanel`
- `SalesAdminPanel`
- `FinanceAdminPanel`
- `MetaConversionsAdminPanel`

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
- `META_CAPI_ENABLED`
- `META_DATASET_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_CAPI_ENCRYPTION_KEY`
- `META_CAPI_GRAPH_API_VERSION`
- `META_TEST_EVENT_CODE`
- `META_CAPI_CURRENCY`
- `META_CAPI_SEND_LEAD_EVENTS`
- `META_CAPI_SEND_PURCHASE_EVENTS`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `FUNNEL_ENABLED`
- `FUNNEL_ASSIGN_TO_HUMAN`
- `FUNNEL_MESSAGE_1` até `FUNNEL_MESSAGE_5`
- `FUNNEL_HANDOFF_MESSAGE`
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
7. Funil: configurar etapas na aba `Admin`, definir delays em segundos, marcar a pergunta para aguardar resposta e testar a continuação com qualquer resposta do cliente.
8. Respostas rápidas: cadastrar atalhos na aba `Respostas`, opcionalmente anexar imagem, digitar `/comando` no chat e conferir o preenchimento do input antes do envio.
9. Equipe: criar atendentes, testar login individual e desativar usuários sem remover histórico.
10. Produtos: criar produtos ativos para seleção rápida no registro de vendas.
11. Vendas: registrar vendas pelo painel do lead ou pela aba de vendas, filtrar por período e conferir totais.
12. LTV: registrar uma segunda venda paga para o mesmo lead e validar a tag `LTV`, receita LTV, custo LTV e lucro LTV no financeiro.
13. Meta Ads: configurar CAPI, gerar lead real por anúncio Click-to-WhatsApp, confirmar `ctwa_clid` salvo e marcar uma venda paga.
14. Mídias: testar upload local, depois troca para upload direto na Cloud API ou storage público.
15. Status: validar webhooks `sent`, `delivered`, `read` e `failed`.
16. Busca: validar pesquisa por nome, telefone e conteúdo.
17. Escala: adicionar filas, múltiplos números, chatbot/IA, integrações financeiras e políticas de retenção sem alterar o núcleo do chat.

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
