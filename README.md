# Rei do Pod Caf

Loja online de pods (identidade do reidopodcaf.com.br: escuro + dourado, leão) com pedido feito no app, entrega com pagamento na hora e painel admin. O WhatsApp é só canal de suporte.

- `frontend/` — React + Vite + TS + Tailwind. Loja: `/` (banner, categorias, promoções, destaques, novidades), `/produtos` (busca `q`, categoria `cat`, `ordem` = menor|maior|novos|promocao), `/categorias`, `/produto/:slug`, `/carrinho` (localStorage), `/checkout` (endereço, ponto no mapa OpenStreetMap/Leaflet, pagamento Pix/dinheiro com troco/cartão), `/pedidos` (login pelo celular, perfil, meus pedidos, sair) e `/pedidos/:id` (ticket + situação; cancela enquanto "recebido"). Links antigos `sabores.html#id` levam a `/produto/id`. Painel: `/admin/login`, `/admin` (pedidos + painel do dia), `/admin/pedidos/:id`, `/admin/clientes`, `/admin/produtos`, `/admin/produtos/:id`, `/admin/precos` (edição rápida), `/admin/categorias`, `/admin/ajustes`.
- `backend/` — Express + Prisma (PostgreSQL). `GET /api/catalog`: só produtos ativos de categorias ativas; sabor esgotado vem sem preço. Painel em `/api/admin/*` (JWT); `PUT /api/admin/prices` salva vários preços numa transação.
- Preços em centavos: produto (`priceCents`/`promoCents`), sabor sobrepõe o produto. Sem preço = "Consultar".
- Categoria (`Brand.kind`): `pod` (marca) ou `outro` (acessórios, essências…). Produto "sem sabores" usa `inStock`.
- Fotos e logo ficam no banco (bytea). Seed (`src/seed.js`, roda no start e em `npm run db:seed`) importa os 26 produtos reais do site original, o WhatsApp e o admin de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.
- Cliente: entra com o celular (`phoneKey` = só dígitos, sem o 55; nome no 1º acesso), recebe um token próprio (`typ: "c"`, guardado no aparelho). Login limitado por IP. Último endereço/localização fica em `Customer.lastAddress`.
- Pedido (`src/orders.js`): preços e disponibilidade conferidos no servidor; itens guardam nome e preço do momento. Situações: recebido → confirmado → em_rota → entregue (ou cancelado, com motivo). Admin em `src/adminOrders.js` (`/api/admin/summary`, `/orders`, `/customers`).
