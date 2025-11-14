import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function CopyTradeAudit() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 10;

  useEffect(() => {
    fetchAudits(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const fetchAudits = async (page, filter) => {
    try {
      setLoading(true);

      const countQuery = supabase
        .from("copytrades")
        .select("*", { count: "planned", head: true });
      if (filter !== "all") countQuery.eq("status", filter);
      const { count } = await countQuery;
      setTotalCount(count || 0);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const query = supabase
        .from("copytrades")
        .select(`
          id, user_id, mentor_id, amount, status, created_at, mentor_commission,
          users (phone_number),
          copytrade_details!copytrade_id (status, stock_id, order_profit_amount)
        `)
        .range(from, to)
        .order("id", { ascending: false });
      if (filter !== "all") query.eq("status", filter);

      const { data, error } = await query;
      if (error) throw error;

      const formatted = data.map((item) => ({
        ...item,
        phone_number: item.users?.phone_number || "未知",
        detail_status: item.copytrade_details?.[0]?.status || item.status,
      }));

      setAudits(formatted);
    } catch (error) {
      alert("加载数据失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (copytrade) => {
    const { id, user_id, amount } = copytrade;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("金额无效");
      return;
    }

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("available_balance")
        .eq("id", user_id)
        .single();
      if (userError) throw userError;
      if (user.available_balance < parsedAmount) {
        alert("用户余额不足");
        return;
      }

      const newBalance = user.available_balance - parsedAmount;
      const { error: balanceError } = await supabase
        .from("users")
        .update({ available_balance: newBalance })
        .eq("id", user_id);
      if (balanceError) throw balanceError;

      const { error: statusError } = await supabase
        .from("copytrades")
        .update({ status: "approved" })
        .eq("id", id);
      if (statusError) throw statusError;

      alert("跟单已批准！");
      fetchAudits(currentPage, statusFilter);
    } catch (error) {
      alert("操作失败: " + error.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const { error } = await supabase
        .from("copytrades")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      alert("跟单已拒绝");
      fetchAudits(currentPage, statusFilter);
    } catch (error) {
      alert("操作失败: " + error.message);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">跟单审核（全部订单）</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-input w-40"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="cancelled">已取消</option>
            <option value="settled">已结算</option>
          </select>
          <button
            onClick={() => fetchAudits(currentPage, statusFilter)}
            className="btn-primary text-sm"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[80vh]">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-table th">ID</th>
              <th className="admin-table th">手机号</th>
              <th className="admin-table th">用户ID</th>
              <th className="admin-table th">导师ID</th>
              <th className="admin-table th">金额</th>
              <th className="admin-table th">佣金率</th>
              <th className="admin-table th">状态</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {audits.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  暂无跟单记录
                </td>
              </tr>
            ) : (
              audits.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition">
                  <td className="admin-table td">{a.id}</td>
                  <td className="admin-table td font-medium text-blue-600">{a.phone_number}</td>
                  <td className="admin-table td">{a.user_id}</td>
                  <td className="admin-table td">{a.mentor_id}</td>
                  <td className="admin-table td text-green-600 font-semibold">${a.amount}</td>
                  <td className="admin-table td">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {a.mentor_commission}%
                    </span>
                  </td>
                  <td className="admin-table td">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.detail_status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : a.detail_status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.detail_status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : a.detail_status === "cancelled"
                          ? "bg-orange-100 text-orange-800"
                          : a.detail_status === "settled"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {a.detail_status === "pending"
                        ? "待审核"
                        : a.detail_status === "approved"
                        ? "已批准"
                        : a.detail_status === "rejected"
                        ? "已拒绝"
                        : a.detail_status === "cancelled"
                        ? "已取消"
                        : a.detail_status === "settled"
                        ? "已结算"
                        : a.detail_status}
                    </span>
                  </td>
                  <td className="admin-table td space-x-2">
                    {a.detail_status === "pending" ? (
                      <>
                        <button onClick={() => handleApprove(a)} className="btn-primary text-xs">
                          批准
                        </button>
                        <button onClick={() => handleReject(a.id)} className="btn-danger text-xs">
                          拒绝
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">已处理</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > pageSize && (
        <div className="flex justify-center items-center gap-4 p-4 border-t border-gray-200">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-primary text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {currentPage} / {totalPages} 页（共 {totalCount} 条）
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
