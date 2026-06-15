import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100 transition-colors">
      <header className="bg-neutral-800 border-b border-neutral-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-center">
          <Link to="/">
            <img src="/etjump-logo.svg" alt="ETJump" className="h-24" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-neutral-800 border-t border-neutral-700 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-neutral-400 text-sm">
          ETJump Maps Database
        </div>
      </footer>
    </div>
  );
}
