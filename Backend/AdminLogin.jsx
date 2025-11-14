import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient'; // 引入supabase实例

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // 使用 Supabase 进行登录
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (loginError) {
      setError("用户名或密码错误");
    } else {
      // 登录成功，跳转到后台管理页面
      if (data.user.email === "admin@gmail.com") {
        localStorage.setItem("adminLoggedIn", "true");
        navigate("/admin", { replace: true });
      } else {
        setError("用户名或密码错误");
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-white to-blue-100 flex items-center justify-center">
      <div className="w-full max-w-[460px] mx-auto bg-white shadow-2xl rounded-2xl p-10 border border-gray-100 sm:px-10 px-6 sm:py-10 py-8">
        {/* LOGO + 标题 */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-white font-bold">GT</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Ganesh Trade 后台</h2>
          <p className="text-gray-500 mt-2">请输入管理员账号登录系统</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="请输入密码"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transform transition-all hover:scale-[1.02] shadow-lg"
          >
            登录系统
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>我是自己人</p>
        </div>
      </div>
    </div>
  );
}
