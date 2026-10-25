import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogProvider } from './lib/catalog';
import { CartProvider } from './lib/cart';
import { ToastProvider } from './components/Toast';
import Inicio from './pages/store/Inicio';
import Produtos from './pages/store/Produtos';
import Categorias from './pages/store/Categorias';
import Produto from './pages/store/Produto';
import Carrinho from './pages/store/Carrinho';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/Layout';
import Products from './pages/admin/Products';
import ProductEdit from './pages/admin/ProductEdit';
import Prices from './pages/admin/Prices';
import Brands from './pages/admin/Brands';
import Settings from './pages/admin/Settings';

/** Links do site antigo (sabores.html#v55) levam à página do produto. */
function LinkAntigo() {
  const { hash } = useLocation();
  const id = decodeURIComponent(hash.slice(1));
  return <Navigate to={id ? `/produto/${encodeURIComponent(id)}` : '/produtos'} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <CatalogProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/produto/:slug" element={<Produto />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/sabores" element={<LinkAntigo />} />
              <Route path="/sabores.html" element={<LinkAntigo />} />
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Products />} />
                <Route path="produtos/:id" element={<ProductEdit />} />
                <Route path="precos" element={<Prices />} />
                <Route path="categorias" element={<Brands />} />
                <Route path="marcas" element={<Navigate to="/admin/categorias" replace />} />
                <Route path="ajustes" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CartProvider>
      </CatalogProvider>
    </BrowserRouter>
  );
}
