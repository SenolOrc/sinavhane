import { NavLink, Outlet } from "react-router-dom";
import { FilePlus2, FolderOpen } from "lucide-react";

const baglanti = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

/** Çok sade kabuk: üstte iki sekme, altında ekran. */
export function Layout() {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 print:hidden">
        <span className="text-sm font-extrabold tracking-tight text-slate-800">Sınavhane</span>
        <nav className="ml-4 flex gap-1" aria-label="Ana gezinme">
          <NavLink to="/sinav-olusturucu" end className={baglanti}><FilePlus2 size={16} /> Sınav Hazırla</NavLink>
          <NavLink to="/sinav-olusturucu/sinavlarim" className={baglanti}><FolderOpen size={16} /> Sınavlarım</NavLink>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
