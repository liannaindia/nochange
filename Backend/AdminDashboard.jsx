import { useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  Users, DollarSign, CreditCard, Settings, UserCheck,
  Copy, TrendingUp, Menu, X, LogOut, Search, Bell, ChevronDown,
} from "lucide-react";
import "./admin.css"; // 已导入

const menuItems = [
  { label: "用户信息", path: "/admin/users", icon: <Users className="w-5 h-5" /> },
  { label: "充值管理", path: "/admin/recharge", icon: <DollarSign className="w-5 h-5" /> },
  { label: "提款管理", path: "/admin/withdraw", icon: <CreditCard className="w-5 h-5" /> },
  { label: "充值通道", path: "/admin/channels", icon: <Settings className="w-5 h-5" /> },
  { label: "导师管理", path: "/admin/mentors", icon: <UserCheck className="w-5 h-5" /> },
  { label: "跟单审核", path: "/admin/copytrade", icon: <Copy className="w-5 h-5" /> },
  { label: "上股管理", path: "/admin/stocks", icon: <TrendingUp className="w-5 h-5" /> },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // 登录保护
  useEffect(() => {
    const isAdmin = localStorage.getItem("adminLoggedIn") === "true";
    if (!isAdmin) navigate("/admin-login", { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/admin-login", { replace: true });
  };

  // 面包屑
  const breadcrumbs = location.pathname
    .split("/")
    .filter((p) => p && p !== "admin")
    .map((segment, idx, arr) => {
      const matched = menuItems.find((m) => m.path.includes(segment));
      return {
        label: matched?.label || segment,
        path: "/admin/" + arr.slice(0, idx + 1).join("/"),
      };
    });

  return (
    <div className="admin-container flex h-screen w-full overflow-hidden">
      {/* 侧边栏 */}
      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white text-slate-900 transition-all duration-300 flex flex-col shadow-2xl`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            {sidebarOpen && (
              <h1 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Ganesh Trade
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* 菜单 */}
        <nav className="flex-1 mt-4 px-3 pb-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
  to={item.path}
  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600"
>
  {item.icon}
  {sidebarOpen && <span className="font-medium">{item.label}</span>}
</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 退出登录 */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="admin-header shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* 面包屑 */}
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/admin" className="text-slate-500 hover:text-slate-700 font-medium">
                控制台
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.path} className="flex items-center">
                  <span className="text-slate-400 mx-2">/</span>
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-slate-900 font-semibold">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="text-blue-600 hover:text-blue-800 font-medium">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            {/* 右上角 */}
            <div className="flex items-center gap-4">
              {/* 搜索 */}
              <div className="relative">
                {searchOpen && (
                  <input
                    type="text"
                    placeholder="搜索用户、订单、导师..."
                    className="w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-700"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {/* 通知 */}
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-all">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>

              {/* 用户信息 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">A</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-800">超级管理员</p>
                  <p className="text-xs text-slate-500">admin@ganesh.com</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        </header>

        {/* 主体内容 - 使用 admin-card 包裹 Outlet */}
        <main className="flex-1 overflow-auto p-6 bg-transparent">
          <div className="admin-card">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
