import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, phone_number, balance, created_at")
        .order("id", { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("获取用户失败:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">用户信息管理</h2>
        <button onClick={fetchUsers} className="btn-primary text-sm">
          刷新
        </button>
      </div>

      <div className="overflow-auto max-h-[80vh]">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-table th">ID</th>
              <th className="admin-table th">手机号</th>
              <th className="admin-table th">余额</th>
              <th className="admin-table th">创建时间</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="admin-table td">{user.id}</td>
                <td className="admin-table td">{user.phone_number}</td>
                <td className="admin-table td text-blue-600 font-semibold">
                  ${user.balance || 0}
                </td>
                <td className="admin-table td text-gray-500">
                  {new Date(user.created_at).toLocaleString("zh-CN")}
                </td>
                <td className="admin-table td space-x-2">
                  <button className="btn-primary text-xs">编辑</button>
                  <button className="btn-danger text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
