import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogProvider } from './lib/catalog';
import { ToastProvider } from './components/Toast';
import Home from './pages/Home';
import Sabores from './pages/Sabores';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/Layout';
import Products from './pages/admin/Products';
import ProductEdit from './pages/admin/ProductEdit';
import Brands from './pages/admin/Brands';
import Settings from './pages/admin/Settings';

/** Links antigos do site (sabores.html#v55) continuam funcionando. */
function SaboresHtml() {
  const { hash } = useLocation();
  return <Navigate to={{ pathname: '/sabores', hash }} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <CatalogProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="/sabores" element={<Sabores />} />
            <Route path="/sabores.html" element={<SaboresHtml />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Products />} />
              <Route path="produtos/:id" element={<ProductEdit />} />
              <Route path="marcas" element={<Brands />} />
              <Route path="ajustes" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </CatalogProvider>
    </BrowserRouter>
  );
}
