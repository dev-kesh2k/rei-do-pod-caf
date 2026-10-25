# Rei do Pod Caf

Recriação do site reidopodcaf.com.br (home + catálogo "Escolha seu sabor") com painel admin.

- `frontend/` — React + Vite + TS + Tailwind. Rotas: `/` (início), `/sabores` (catálogo; `sabores.html#id` redireciona), `/admin/login`, `/admin` (produtos), `/admin/produtos/:id`, `/admin/marcas`, `/admin/ajustes`.
- `backend/` — Express + Prisma (PostgreSQL). Catálogo público em `GET /api/catalog` (só produtos ativos de marcas ativas e sabores disponíveis); painel em `/api/admin/*` com JWT.
- Fotos e logo ficam no banco (bytea). Seed (`src/seed.js`, roda no start e em `npm run db:seed`) importa os 26 produtos reais do site original (`prisma/seed-data.json` + `prisma/seed-images/`), as marcas, o WhatsApp e o admin de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
- Mensagem do pedido: configurável no painel com `{produto}` e `{sabor}`.
