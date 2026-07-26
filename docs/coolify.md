# Deploy no Coolify

Este projeto deve ser publicado no Coolify como um recurso Docker Compose.
Use o arquivo `docker-compose.coolify.yml`.

## Dominios recomendados

Use dois subdominios:

- Frontend: `https://crm.seudominio.com`
- API/Webhooks: `https://api-crm.seudominio.com`

O webhook da Meta ficara:

```txt
https://api-crm.seudominio.com/api/v1/webhooks/whatsapp
```

## Passo a passo

1. Envie este repositorio para o GitHub/GitLab.
2. No Coolify, abra o projeto e crie um novo recurso.
3. Escolha o repositorio Git.
4. Troque o build pack para `Docker Compose`.
5. Configure:
   - Base Directory: `/`
   - Docker Compose Location: `docker-compose.coolify.yml`
6. Abra Environment Variables em modo Developer e cole as variaveis de `.env.coolify.example`.
7. Ajuste os dominios:
   - service `web`, porta interna `3000`: `https://crm.seudominio.com`
   - service `api`, porta interna `4000`: `https://api-crm.seudominio.com`
8. Clique em Deploy.

## Variaveis de producao

```env
POSTGRES_USER=wa_crm
POSTGRES_DB=wa_crm

JWT_EXPIRES_IN=7d

FRONTEND_URL=https://crm.seudominio.com
PUBLIC_API_URL=https://api-crm.seudominio.com
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_WS_URL=https://api-crm.seudominio.com
API_INTERNAL_URL=http://api:4000

DEFAULT_ORGANIZATION_ID=demo-org
META_GRAPH_API_VERSION=v20.0
WHATSAPP_ACCESS_TOKEN=token-da-meta
WHATSAPP_PHONE_NUMBER_ID=id-do-numero
WHATSAPP_BUSINESS_ACCOUNT_ID=id-da-waba
WHATSAPP_WEBHOOK_VERIFY_TOKEN=um-token-secreto-para-validacao
```

O `docker-compose.coolify.yml` usa variaveis magicas do Coolify para gerar e persistir:

- `SERVICE_PASSWORD_POSTGRES`
- `SERVICE_PASSWORD_64_JWT`

Nao crie essas duas variaveis manualmente com valor vazio.

## Primeiro acesso

Na primeira subida, o container da API roda:

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm exec ts-node -r tsconfig-paths/register src/main.ts
```

Credenciais iniciais:

```txt
admin@crm.local
admin123
```

Troque essa senha assim que entrar.

## Configuracao na Meta

No app da Meta, configure o webhook:

- Callback URL: `https://api-crm.seudominio.com/api/v1/webhooks/whatsapp`
- Verify token: o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Assine os eventos de mensagens e status do WhatsApp Business Account.

## Observacoes importantes

- Nao exponha `postgres` nem `redis` com dominio publico.
- Nao adicione redes customizadas no compose; o Coolify cria a rede do stack.
- Os uploads ficam no volume persistente `api_uploads`.
- Se trocar `NEXT_PUBLIC_API_URL` ou `NEXT_PUBLIC_WS_URL`, faca novo deploy para reconstruir o frontend.
- Para chamadas HTTP, `NEXT_PUBLIC_API_URL=/api/v1` usa o proxy interno do Next para o servico `api`.
- Para Socket.IO, mantenha `NEXT_PUBLIC_WS_URL` apontando para o dominio publico da API.

## Troubleshooting

Se o deploy falhar em `RUN pnpm prisma generate`, o build nao recebeu uma `DATABASE_URL`.
O Dockerfile da API ja define uma URL dummy para build; confirme que a VPS esta usando a versao atual do repositorio.

O build da imagem da API nao compila TypeScript no Docker para evitar falhas opacas do BuildKit no Coolify.
A validacao de TypeScript continua sendo feita com `pnpm build` antes do deploy.

Se o log mostrar um commit antigo, faca commit/push das alteracoes locais e redeploy.
