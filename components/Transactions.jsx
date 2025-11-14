import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function Transactions({ setTab, userId, isLoggedIn }) {
  const [activeTab, setActiveTab] = useState("recharges"); // recharges / withdraws
  const [recharges, setRecharges] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 初始化加载 + 实时订阅
  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    fetchTransactions();

    // ✅ 实时订阅 Recharges
    const rechargeSub = supabase
      .channel(`recharges-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharges",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          fetchTransactions(); // 数据变化后自动刷新
        }
      )
      .subscribe();

    // ✅ 实时订阅 Withdraws
    const withdrawSub = supabase
      .channel(`withdraws-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdraws",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rechargeSub);
      supabase.removeChannel(withdrawSub);
    };
  }, [isLoggedIn, userId]);

  // ✅ 获取充值与提款数据
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [{ data: rechargeData, error: rechargeErr }, { data: withdrawData, error: withdrawErr }] = await Promise.all([
        supabase
          .from("recharges")
          .select("amount, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("withdraws")
          .select("amount, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (rechargeErr) throw rechargeErr;
      if (withdrawErr) throw withdrawErr;

      setRecharges(rechargeData || []);
      setWithdraws(withdrawData || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
  };

  const formatDate = (ts) => {
    const date = new Date(ts);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const renderCard = (item, type) => (
    <div
      key={item.created_at + type}
      className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm mb-2"
    >
      <div>
        <div className="text-sm text-slate-600">{formatDate(item.created_at)}</div>
        <div className={`text-xs font-medium ${getStatusColor(item.status)}`}>
          {item.status.toUpperCase()}
        </div>
      </div>
      <div
        className={`text-right font-bold ${
          type === "recharge" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {type === "recharge" ? "+" : "-"}
        {Number(item.amount).toFixed(2)} USDT
      </div>
    </div>
  );

  const currentList = activeTab === "recharges" ? recharges : withdraws;

  return (
    <div className="px-4 pb-24 max-w-md mx-auto">
      {/* ===== Header ===== */}
      <div className="flex items-center mt-4 mb-3 relative">
        <ArrowLeft
          className="h-5 w-5 text-slate-600 cursor-pointer"
          onClick={() => setTab("me")}
        />
        <h2 className="flex-1 text-center text-lg font-bold text-slate-800">
          Transactions
        </h2>
        <RefreshCw
          className={`h-5 w-5 absolute right-0 cursor-pointer ${
            refreshing ? "animate-spin text-blue-500" : "text-slate-600"
          }`}
          onClick={handleRefresh}
        />
      </div>

      {/* ===== Toggle Tabs ===== */}
      <div className="flex justify-center mb-5">
        <button
          className={`flex-1 py-2 rounded-l-xl text-sm font-semibold border ${
            activeTab === "recharges"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-300"
          }`}
          onClick={() => setActiveTab("recharges")}
        >
          Recharges
        </button>
        <button
          className={`flex-1 py-2 rounded-r-xl text-sm font-semibold border ${
            activeTab === "withdraws"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-300"
          }`}
          onClick={() => setActiveTab("withdraws")}
        >
          Withdraws
        </button>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="text-center text-slate-500 mt-10 animate-pulse">
          Loading...
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center text-slate-400 text-sm mt-10">
          No {activeTab === "recharges" ? "recharge" : "withdraw"} records found.
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((item) =>
            renderCard(item, activeTab === "recharges" ? "recharge" : "withdraw")
          )}
        </div>
      )}

      {/* ===== 手动刷新提示 ===== */}
      {refreshing && (
        <div className="text-center text-blue-500 text-sm mt-3 animate-pulse">
          Refreshing...
        </div>
      )}
    </div>
  );
}
