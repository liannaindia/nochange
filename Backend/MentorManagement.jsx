import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function MentorManagement() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMentor, setNewMentor] = useState({
    name: "",
    years: 0,
    assets: 0,
    commission: 0,
    img: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase.from("mentors").select("*");
      if (error) throw error;
      setMentors(data || []);
    } catch (error) {
      console.error("获取导师失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMentor = async () => {
    try {
      const { error } = await supabase.from("mentors").insert([
        {
          name: newMentor.name,
          years: newMentor.years,
          assets: newMentor.assets,
          commission: newMentor.commission,
          img: newMentor.img,
        },
      ]);
      if (error) throw error;
      fetchMentors();
      setNewMentor({ name: "", years: 0, assets: 0, commission: 0, img: "" });
      setIsAdding(false);
    } catch (error) {
      alert("添加失败: " + error.message);
    }
  };

  const deleteMentor = async (id) => {
    if (!window.confirm("确定删除该导师？")) return;
    try {
      const { error } = await supabase.from("mentors").delete().eq("id", id);
      if (error) throw error;
      fetchMentors();
    } catch (error) {
      alert("删除失败");
    }
  };

  const editMentor = async () => {
    try {
      const { error } = await supabase
        .from("mentors")
        .update({
          name: editingMentor.name,
          years: editingMentor.years,
          assets: editingMentor.assets,
          commission: editingMentor.commission,
          img: editingMentor.img,
        })
        .eq("id", editingMentor.id);
      if (error) throw error;
      fetchMentors();
      setEditingMentor(null);
    } catch (error) {
      alert("编辑失败: " + error.message);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">导师管理</h2>
        <button onClick={() => setIsAdding(true)} className="btn-primary text-sm">
          添加导师
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMentor();
          }}
          className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4"
        >
          <h3 className="text-lg font-semibold">添加新导师</h3>
          <input
            type="text"
            placeholder="导师姓名"
            value={newMentor.name}
            onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="经验年数"
            value={newMentor.years}
            onChange={(e) => setNewMentor({ ...newMentor, years: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="资产总额"
            value={newMentor.assets}
            onChange={(e) => setNewMentor({ ...newMentor, assets: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="佣金率 (%)"
            value={newMentor.commission}
            onChange={(e) => setNewMentor({ ...newMentor, commission: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="头像URL"
            value={newMentor.img}
            onChange={(e) => setNewMentor({ ...newMentor, img: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              提交
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn-danger"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {editingMentor && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMentor();
          }}
          className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4"
        >
          <h3 className="text-lg font-semibold">编辑导师</h3>
          <input
            type="text"
            value={editingMentor.name}
            onChange={(e) => setEditingMentor({ ...editingMentor, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={editingMentor.years}
            onChange={(e) => setEditingMentor({ ...editingMentor, years: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={editingMentor.assets}
            onChange={(e) => setEditingMentor({ ...editingMentor, assets: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={editingMentor.commission}
            onChange={(e) => setEditingMentor({ ...editingMentor, commission: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={editingMentor.img}
            onChange={(e) => setEditingMentor({ ...editingMentor, img: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              更新
            </button>
            <button
              type="button"
              onClick={() => setEditingMentor(null)}
              className="btn-danger"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="overflow-auto max-h-[80vh]">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-table th">ID</th>
              <th className="admin-table th">姓名</th>
              <th className="admin-table th">经验年数</th>
              <th className="admin-table th">资产总额</th>
              <th className="admin-table th">佣金率</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="admin-table td">{m.id}</td>
                <td className="admin-table td">{m.name}</td>
                <td className="admin-table td">{m.years}</td>
                <td className="admin-table td">{m.assets.toLocaleString()}</td>
                <td className="admin-table td">{m.commission}%</td>
                <td className="admin-table td space-x-2">
                  <button
                    onClick={() => setEditingMentor(m)}
                    className="btn-primary text-xs"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteMentor(m.id)}
                    className="btn-danger text-xs"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
