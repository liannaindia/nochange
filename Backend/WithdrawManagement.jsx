import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function WithdrawManagement() {
  const [withdraws, setWithdraws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdraws();
  }, []);

  const fetchWithdraws = async () => {
    try {
      const { data, error } = await supabase
        .from("withdraws")
        .select(`
          id, user_id, amount, status, created_at, wallet_address, channel,
          users (phone_number)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const formatted = data.map((w) => ({
        ...w,
        phone_number: w.users?.phone_number || "未知",
        created_at: formatChinaTime(w.created_at),
      }));

      setWithdraws(formatted);
    } catch (error) {
      console.error("获取提款记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleApprove = async (id, amount, userId) => {
    try {
      const { error: statusError } = await supabase
        .from("withdraws")
        .update({ status: "approved" })
        .eq("id", id);
      if (statusError) throw statusError;

      const { error: balanceError } = await supabase
        .rpc("decrement_balance", { user_id: userId, amount });
      if (balanceError) throw balanceError;

      alert("提款已批准！");
      fetchWithdraws();
    } catch (error) {
      alert("操作失败: " + error.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const { error } = await supabase
        .from("withdraws")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      alert("提款已拒绝！");
      fetchWithdraws();
    } catch (error) {
      alert("操作失败: " + error.message);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">提款管理</h2>
        <button onClick={fetchWithdraws} className="btn-primary text-sm">
          刷新
        </button>
      </div>

      <div className="overflow-auto max-h-[80vh]">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-table th">手机号</th>
              <th className="admin-table th">金额</th>
              <th className="admin-table th">时间</th>
              <th className="admin-table th">状态</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {withdraws.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-500">
                  暂无提款记录
                </td>
              </tr>
            ) : (
              withdraws.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="admin-table td font-medium text-blue-600">
                    {item.phone_number}
                  </td>
                  <td className="admin-table td text-red-600 font-semibold">
                    -${item.amount}
                  </td>
                  <td className="admin-table td text-gray-500">{item.created_at}</td>
                  <td className="admin-table td">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : item.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status === "pending"
                        ? "待审"
                        : item.status === "approved"
                        ? "已批准"
                        : "已拒绝"}
                    </span>
                  </td>
                  <td className="admin-table td space-x-2">
                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id, item.amount, item.user_id)}
                          className="btn-primary text-xs"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="btn-danger text-xs"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    {item.status !== "pending" && (
                      <span className="text-gray-500 text-xs">已完成</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
