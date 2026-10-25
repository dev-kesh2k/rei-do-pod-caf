# Rei do Pod Caf

Loja online de pods (identidade do reidopodcaf.com.br: escuro + dourado, leão) com pedido pelo WhatsApp e painel admin.

- `frontend/` — React + Vite + TS + Tailwind. Loja: `/` (banner, categorias, promoções, destaques, novidades), `/produtos` (busca `q`, categoria `cat`, `ordem` = menor|maior|novos|promocao), `/categorias`, `/produto/:slug`, `/carrinho` (localStorage; finaliza no WhatsApp com itens, quantidades e total). Links antigos `sabores.html#id` levam a `/produto/id`. Painel: `/admin/login`, `/admin` (produtos), `/admin/produtos/:id`, `/admin/precos` (edição rápida), `/admin/categorias`, `/admin/ajustes`.
- `backend/` — Express + Prisma (PostgreSQL). `GET /api/catalog`: só produtos ativos de categorias ativas; sabor esgotado vem sem preço. Painel em `/api/admin/*` (JWT); `PUT /api/admin/prices` salva vários preços numa transação.
- Preços em centavos: produto (`priceCents`/`promoCents`), sabor sobrepõe o produto. Sem preço = "Consultar".
- Categoria (`Brand.kind`): `pod` (marca) ou `outro` (acessórios, essências…). Produto "sem sabores" usa `inStock`.
- Fotos e logo ficam no banco (bytea). Seed (`src/seed.js`, roda no start e em `npm run db:seed`) importa os 26 produtos reais do site original, o WhatsApp e o admin de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
