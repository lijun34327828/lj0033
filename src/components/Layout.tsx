import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, ClipboardList, FileText, Settings, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "房源总览", icon: Home },
  { path: "/orders", label: "订单管理", icon: ClipboardList },
  { path: "/records", label: "入住档案", icon: FileText },
  { path: "/admin", label: "后台管理", icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-earth-900 text-earth-100
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-earth-800">
          <Home className="w-6 h-6 text-earth-200" />
          <h1 className="font-serif text-xl font-bold text-earth-200">民宿管理</h1>
          <button
            className="ml-auto lg:hidden text-earth-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="mt-4 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200
                  ${active ? "bg-earth-500 text-white font-medium" : "text-earth-300 hover:bg-earth-800 hover:text-earth-100"}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center px-4 py-3 bg-white shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-earth-50 transition-all duration-200"
          >
            <Menu className="w-5 h-5 text-earth-600" />
          </button>
          <h1 className="ml-3 font-serif text-lg font-semibold text-earth-800">民宿管理</h1>
        </header>

        <main className="flex-1 overflow-y-auto bg-earth-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
