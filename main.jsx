// src/main.jsx (已添加完整登录保护 + 防止直接访问)
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./index.css";

// ==================== 前台组件 ====================
import App from "./App";
import Home from "./components/Home.jsx";
import Markets from "./components/Markets.jsx";
import Trade from "./components/Trade.jsx";
import Positions from "./components/Positions.jsx";
import Me from "./components/Me.jsx";
import Recharge from "./components/Recharge.jsx";
import Withdraw from "./components/Withdraw.jsx";
import Invite from "./components/Invite.jsx";

// ==================== 后台组件 ====================
import AdminLogin from "./Backend/AdminLogin.jsx";
import AdminDashboard from "./Backend/AdminDashboard.jsx";
import UserManagement from "./Backend/UserManagement.jsx";
import RechargeManagement from "./Backend/RechargeManagement.jsx";
import WithdrawManagement from "./Backend/WithdrawManagement.jsx";
import RechargeChannel from "./Backend/RechargeChannel.jsx";
import MentorManagement from "./Backend/MentorManagement.jsx";
import CopyTradeAudit from "./Backend/CopyTradeAudit.jsx";
import StockManagement from "./Backend/StockManagement.jsx";

// ==================== 受保护路由组件 ====================
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const isAdmin = localStorage.getItem("adminLoggedIn") === "true";
    // 任何 /admin 开头的路径，未登录一律跳转到登录页
    if (!isAdmin && location.pathname.startsWith("/admin")) {
      navigate("/admin-login", { replace: true, state: { from: location } });
    }
  }, [location, navigate]);

  const isAdmin = localStorage.getItem("adminLoggedIn") === "true";
  if (!isAdmin && location.pathname.startsWith("/admin")) {
    return null; // 跳转中，防止闪烁
  }

  return children;
}

// ==================== 404 页面 ====================
const NotFound = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="text-center p-10 bg-white rounded-2xl shadow-xl">
      <h1 className="text-7xl font-bold text-gray-200 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">页面不存在</p>
      <div className="space-x-4">
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          返回首页
        </Link>
        <Link
          to="/admin-login"
          className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition transform hover:scale-105"
        >
          后台登录
        </Link>
      </div>
    </div>
  </div>
);

// ==================== 主渲染 ====================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* ==================== 前台路由 ==================== */}
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="markets" element={<Markets />} />
          <Route path="trade" element={<Trade />} />
          <Route path="positions" element={<Positions />} />
          <Route path="me" element={<Me />} />
          <Route path="recharge" element={<Recharge />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="invite" element={<Invite />} />
        </Route>

        {/* ==================== 后台独立登录页 ==================== */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* ==================== 后台管理面板（必须登录） ==================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <div className="p-8 bg-white rounded-xl shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  欢迎进入后台管理系统
                </h1>
                <p className="text-gray-600">请选择左侧菜单进行操作</p>
              </div>
            }
          />
          <Route path="users" element={<UserManagement />} />
          <Route path="recharge" element={<RechargeManagement />} />
          <Route path="withdraw" element={<WithdrawManagement />} />
          <Route path="channels" element={<RechargeChannel />} />
          <Route path="mentors" element={<MentorManagement />} />
          <Route path="copytrade" element={<CopyTradeAudit />} />
          <Route path="stocks" element={<StockManagement />} />
        </Route>

        {/* ==================== 404 兜底 ==================== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
