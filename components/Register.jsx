// components/Register.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Copy } from "lucide-react";

export default function Register({ setTab, setIsLoggedIn, setUserId }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralInput, setReferralInput] = useState("");   // 新增：用户填写的邀请码
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");   // 注册成功后显示自己的邀请码

  /** 生成 7 位唯一邀请码 */
  const generateReferralCode = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 100;

    while (exists && attempts < maxAttempts) {
      code = Array.from({ length: 7 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");

      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();

      exists = !!data;
      attempts++;
    }

    if (exists) throw new Error("Unable to generate unique referral code");
    return code;
  };

  /** 根据邀请码查找邀请人 id */
  const getInviterId = async (code) => {
    if (!code.trim()) return null;
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code.trim().toUpperCase())
      .single();

    if (error || !data) {
      throw new Error("Invalid referral code");
    }
    return data.id;
  };

  const handleRegister = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    setGeneratedCode("");

    // ---------- 基础校验 ----------
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (phoneNumber.length < 10) {
      setError("Phone number must be at least 10 digits");
      setIsLoading(false);
      return;
    }

    try {
      // 1. 生成自己的邀请码
      const myReferralCode = await generateReferralCode();

      // 2. 若填写了邀请码，校验并获取邀请人 id
      let invitedBy = null;
      if (referralInput) {
        invitedBy = await getInviterId(referralInput);
      }

      // 3. 插入用户
      const { data, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            phone_number: phoneNumber,
            password_hash: password,          // 实际项目请先哈希
            balance: 0.0,
            available_balance: 0.0,
            referral_code: myReferralCode,
            invited_by: invitedBy,            // 关键：写入邀请人 id
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error("No user returned after insert");

      // 4. 登录状态 & 本地存储
      localStorage.setItem("phone_number", phoneNumber);
      localStorage.setItem("user_id", data.id);

      setGeneratedCode(myReferralCode);   // 成功后展示自己的邀请码
      setIsLoggedIn(true);
      setUserId(data.id);
      setTab("home");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // 复制自己的邀请码
  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("Referral code copied!");
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7fb] pb-24 min-h-screen text-slate-900">
      <div className="flex items-center gap-3 py-3">
        <ArrowLeft
          className="h-5 w-5 text-slate-700 cursor-pointer"
          onClick={() => setTab("home")}
        />
        <h2 className="font-semibold text-slate-800 text-lg">Register</h2>
      </div>

      <div className="px-4 mt-8 space-y-4">
        {/* 手机号 */}
        <div>
          <label className="text-sm text-slate-500">Phone Number</label>
          <input
            type="text"
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 密码 */}
        <div>
          <label className="text-sm text-slate-500">Password</label>
          <input
            type="password"
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 确认密码 */}
        <div>
          <label className="text-sm text-slate-500">Confirm Password</label>
          <input
            type="password"
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 邀请码（可选） */}
        <div>
          <label className="text-sm text-slate-500">
            Referral Code <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            className="w-full py-2 px-3 text-sm text-slate-700 rounded-lg border focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter referral code"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={7}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">{error}</div>
        )}

        {/* 注册按钮 */}
        <button
          onClick={handleRegister}
          disabled={isLoading}
          className={`w-full text-slate-900 font-semibold py-3 rounded-xl mt-4 transition ${
            isLoading ? "bg-yellow-300 cursor-not-allowed" : "bg-yellow-400 hover:bg-yellow-500"
          }`}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>

        {/* 注册成功后显示自己的邀请码 */}
        {generatedCode && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-800 mb-2">Registration successful!</p>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono text-lg text-green-900">{generatedCode}</code>
              <button onClick={copyCode} className="text-green-600">
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-green-700 mt-1">Share this code to invite friends</p>
          </div>
        )}

        {/* 去登录 */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <span>
            Already have an account?{" "}
            <button
              onClick={() => setTab("login")}
              className="text-yellow-500 font-semibold"
              disabled={isLoading}
            >
              Login
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
