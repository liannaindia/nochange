// components/Login.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function Login({ setTab, setIsLoggedIn, setUserId }) { // 新增 setUserId
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    if (phoneNumber.length < 10) {
      setError("Phone number must be at least 10 digits");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, password_hash')
        .eq('phone_number', phoneNumber)
        .single();

      if (queryError || !data) {
        setError("User not found");
        setIsLoading(false);
        return;
      }

      if (password !== data.password_hash) {
        setError("Incorrect password");
        setIsLoading(false);
        return;
      }

      // 关键：保存到 localStorage + 同步设置状态
      localStorage.setItem('phone_number', phoneNumber);
      localStorage.setItem('user_id', data.id);

      console.log("登录成功，user_id 已保存:", data.id);

      setIsLoggedIn(true);
      setUserId(data.id); // 关键：同步设置 userId
      setTab("home");
    } catch (error) {
      setError("An error occurred during login");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7fb] pb-24 min-h-screen text-slate-900">
      <div className="flex items-center gap-3 py-3">
        <ArrowLeft className="h-5 w-5 text-slate-700 cursor-pointer" onClick={() => setTab("home")} />
        <h2 className="font-semibold text-slate-800 text-lg">Login</h2>
      </div>

      <div className="px-4 mt-8 space-y-4">
        <div>
          <label className="text-sm text-slate-500">Phone Number</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your phone number"
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your password"
          />
        </div>

        {error && <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">{error}</div>}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full text-slate-900 font-semibold py-3 rounded-xl mt-4 transition ${
            isLoading ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500'
          }`}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <button onClick={() => setTab("register")} className="text-yellow-500 font-semibold" disabled={isLoading}>
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
