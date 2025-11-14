import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export default function RechargeManagement() {
  const [recharges, setRecharges] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /* ------------------- 1. 把 fetchRecharges 包装成 useCallback ------------------- */
  const fetchRecharges = useCallback(async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      /* 2. 删除重复的 created_at（只保留在 order 中） */
      const { data, error, count } = await supabase
        .from("recharges")
        .select(
          `
          id, user_id, amount, channel_id, status, created_at, tx_id,
          users (phone_number),
          channels (currency_name)
        `,
          { count: "exact" }
        )
        .range(from, to)
        .order("created_at", { ascending: false }); // ← 只在这里排序

      if (error) throw error;

      const formatted = data.map((r) => ({
        ...r,
        phone_number: r.users?.phone_number || "未知",
        currency_name: r.channels?.currency_name || "未知通道",
        created_at: formatChinaTime(r.created_at),
        tx_id: r.tx_id || "无",
      }));

      setRecharges({ data: formatted, total: count || 0 });
    } catch (err) {
      console.error("获取充值记录失败:", err);
      /* 3. 统一处理 Supabase 错误对象 */
      const msg = err?.message || "未知错误，请检查网络或联系管理员";
      alert(`加载失败：${msg}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage]); // ← 依赖 currentPage

  /* ------------------- 4. useEffect 正确声明依赖 ------------------- */
  useEffect(() => {
    fetchRecharges();
  }, [fetchRecharges]);

  const formatChinaTime = (utcTime) => {
    const date = new Date(utcTime);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    }).format(date);
  };

  /* ------------------- 复制 tx_id（保持原有） ------------------- */
  const copyTxId = (txId) => {
    navigator.clipboard.writeText(txId).then(() => {
      alert("交易哈希已复制！");
    });
  };

  const handleApprove = async (id, user_id, amount) => {
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("金额无效");

      const { error: statusError } = await supabase
        .from("recharges")
        .update({ status: "approved" })
        .eq("id", id);
      if (statusError) throw statusError;

      const { error: balanceError } = await supabase
        .rpc("increment_balance", { user_id, amount: parsedAmount });
      if (balanceError) throw balanceError;

      alert("充值已批准！");
      fetchRecharges();
    } catch (error) {
      alert("操作失败: " + (error?.message || "未知错误"));
    }
  };

  const handleReject = async (id) => {
    try {
      const { error } = await supabase
        .from("recharges")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      alert("充值已拒绝！");
      fetchRecharges();
    } catch (error) {
      alert("操作失败: " + (error?.message || "未知错误"));
    }
  };

  const totalPages = Math.ceil(recharges.total / pageSize);

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">充值管理</h2>
        <button onClick={fetchRecharges} className="btn-primary text-sm">
          刷新
        </button>
      </div>

      <div className="overflow-auto max-h-[80vh]">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-table th">手机号</th>
              <th className="admin-table th">金额</th>
              <th className="admin-table th">通道</th>
              <th className="admin-table th">交易哈希</th>
              <th className="admin-table th">时间</th>
              <th className="admin-table th">状态</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {recharges.data.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-gray-500">
                  暂无充值记录
                </td>
              </tr>
            ) : (
              recharges.data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="admin-table td font-medium text-blue-600">
                    {r.phone_number}
                  </td>
                  <td className="admin-table td text-green-600 font-semibold">
                    ${r.amount}
                  </td>
                  <td className="admin-table td">{r.currency_name}</td>

                  {/* tx_id 列 */}
                  <td className="admin-table td">
                    <div className="flex items-center gap-1">
                      <span
                        className="font-mono text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition"
                        onClick={() => copyTxId(r.tx_id)}
                        title="点击复制"
                      >
                        {r.tx_id.length > 12
                          ? `${r.tx_id.slice(0, 6)}...${r.tx_id.slice(-6)}`
                          : r.tx_id}
                      </span>
                      <button
                        onClick={() => copyTxId(r.tx_id)}
                        className="text-gray-400 hover:text-blue-600 transition"
                        title="复制"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>

                  <td className="admin-table td text-gray-500">{r.created_at}</td>
                  <td className="admin-table td">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : r.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {r.status === "pending"
                        ? "待审批"
                        : r.status === "approved"
                        ? "已批准"
                        : "已拒绝"}
                    </span>
                  </td>
                  <td className="admin-table td space-x-2">
                    {r.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleApprove(r.id, r.user_id, r.amount)}
                          className="btn-primary text-xs"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="btn-danger text-xs"
                        >
                          拒绝
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500 text-xs">已完成</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {recharges.total > pageSize && (
        <div className="flex justify-center items-center gap-4 p-4 border-t border-gray-200">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-primary text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {currentPage} / {totalPages} 页 (共 {recharges.total} 条)
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-primary text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
