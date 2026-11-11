import { Link2 } from 'lucide-react';
import { Link, Route, Routes } from 'react-router';

import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ThemeToggle } from './shared/components/ThemeToggle';
import { RegisterPage } from './features/auth/pages/RegisterPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 sm:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-md font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl bg-accent text-background"
            >
              <Link2 className="size-5" strokeWidth={1.7} />
            </span>
            <span>
              Red social
              <span className="ml-2 text-xs font-normal text-muted">
                / tu espacio
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route
          path="*"
          element={<main className="p-8">Página no encontrada</main>}
        />
      </Routes>
    </div>
  );
}

export default App;
