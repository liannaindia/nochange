import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStock, setNewStock] = useState({
    mentor_id: "",
    crypto_name: "",
    buy_price: "",
    sell_price: "",
  });
  const [selectedStock, setSelectedStock] = useState(null);
  const [copytradeDetails, setCopytradeDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editStock, setEditStock] = useState({
    id: "",
    mentor_id: "",
    crypto_name: "",
    buy_price: "",
    sell_price: "",
  });

  useEffect(() => {
    fetchMentors();
    fetchStocks();
  }, []);

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase
        .from("mentors")
        .select("id, name, commission");
      if (error) throw error;
      setMentors(data || []);
    } catch (error) {
      console.error("加载导师失败:", error);
      alert("加载导师失败");
    }
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from("stocks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const stocksWithCount = await Promise.all(
        data.map(async (stock) => {
          // 已绑定人数
          const { count: boundCount } = await supabase
            .from("copytrade_details")
            .select("id", { count: "exact", head: true })
            .eq("stock_id", stock.id);

          // 可绑定人数（同导师、approved、未绑定）
          const { count: pendingBindCount } = await supabase
            .from("copytrade_details")
            .select("id", { count: "exact", head: true })
            .eq("mentor_id", stock.mentor_id)
            .eq("status", "approved")
            .is("stock_id", null);

          return {
            ...stock,
            bound_count: boundCount || 0,
            pending_bind_count: pendingBindCount || 0,
          };
        })
      );

      setStocks(stocksWithCount);
    } catch (error) {
      console.error("加载上股信息失败:", error);
      alert("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!newStock.mentor_id || !newStock.crypto_name || !newStock.buy_price || !newStock.sell_price) {
      alert("请填写所有字段");
      return;
    }
    try {
      const { error } = await supabase.from("stocks").insert({
        mentor_id: parseInt(newStock.mentor_id),
        crypto_name: newStock.crypto_name.trim(),
        buy_price: parseFloat(newStock.buy_price),
        sell_price: parseFloat(newStock.sell_price),
        status: "pending",
      });
      if (error) throw error;
      alert("上股添加成功");
      setNewStock({ mentor_id: "", crypto_name: "", buy_price: "", sell_price: "" });
      setIsAdding(false);
      fetchStocks();
    } catch (error) {
      alert("添加失败: " + error.message);
    }
  };

  const handlePublish = async (id) => {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;

    try {
      const { data: approvedDetails, error: queryError } = await supabase
        .from("copytrade_details")
        .select("id")
        .eq("mentor_id", stock.mentor_id)
        .eq("status", "approved")
        .is("stock_id", null);

      if (queryError) throw queryError;

      if (approvedDetails && approvedDetails.length > 0) {
        const { error: bindError } = await supabase
          .from("copytrade_details")
          .update({ stock_id: id })
          .in("id", approvedDetails.map(d => d.id));
        if (bindError) throw bindError;
      }

      const { error: publishError } = await supabase
        .from("stocks")
        .update({ status: "published" })
        .eq("id", id);
      if (publishError) throw publishError;

      const bound = approvedDetails?.length || 0;
      alert(`上架成功！已为 ${bound} 位用户绑定跟单`);
      fetchStocks();
    } catch (error) {
      alert("上架失败: " + error.message);
    }
  };

  const handleSettle = async (stock) => {
  if (stock.status !== "published") {
    alert("只有「进行中」的上股可以结算");
    return;
  }

  const buyPrice = parseFloat(stock.buy_price);
  const sellPrice = parseFloat(stock.sell_price);

  if (sellPrice <= buyPrice) {
    if (
      !window.confirm(
        "卖出价 ≤ 买入价，将导致用户亏损。\n是否继续？"
      )
    ) {
      return;
    }
  }

  if (!window.confirm(`确定结算 ${stock.crypto_name}？\n此操作不可逆！`)) return;

  try {
    // 1. 获取所有已绑定的跟单记录（含用户余额）
    const { data: details, error: fetchError } = await supabase
      .from("copytrade_details")
      .select(`
        id, user_id, amount, mentor_commission, stock_id,
        users(id, balance, available_balance)
      `)
      .eq("stock_id", stock.id)
      .eq("status", "approved");

    if (fetchError) throw fetchError;
    if (!details || details.length === 0) {
      alert("暂无跟单记录，无需结算");
      return;
    }

    const priceDiff = sellPrice - buyPrice;
    const detailUpdates = [];
    const userUpdates = {}; // { user_id: { profit: X, unfreeze: Y } }

    // 2. 计算每位用户的盈亏
    for (const detail of details) {
      const amount = parseFloat(detail.amount);
      const commissionRate = detail.mentor_commission / 100;

      // 购买的资产数量
      const assetUnits = amount / buyPrice;
      // 总利润（未扣佣金）
      const totalProfit = priceDiff * assetUnits;
      // 用户实得利润
      const userProfit = totalProfit * (1 - commissionRate);

      // 更新跟单记录
      detailUpdates.push({
        id: detail.id,
        order_profit_amount: userProfit,
        status: "settled",
      });

      const uid = detail.user_id.toString();
      if (!userUpdates[uid]) {
        userUpdates[uid] = { profit: 0, unfreeze: 0 };
      }
      userUpdates[uid].profit += userProfit;
      userUpdates[uid].unfreeze += amount;
    }

    // 3. 批量更新 copytrade_details 状态
    const updateDetailPromises = detailUpdates.map(update =>
      supabase
        .from("copytrade_details")
        .update({
          order_profit_amount: update.order_profit_amount,
          status: "settled",
        })
        .eq("id", update.id)
    );

    const detailResults = await Promise.all(updateDetailPromises);
    const detailFailed = detailResults.find(r => r.error);
    if (detailFailed) throw detailFailed.error;

    // 4. 更新用户余额（带乐观锁，防止并发覆盖）
    const userBalancePromises = Object.entries(userUpdates).map(async ([uid, change]) => {
      const user = details.find(d => d.user_id.toString() === uid)?.users;
      if (!user) throw new Error(`用户 ${uid} 数据缺失`);

      const oldBalance = parseFloat(user.balance) || 0;
      const oldAvailable = parseFloat(user.available_balance) || 0;

      const newBalance = oldBalance + change.profit;
      const newAvailable = oldAvailable + change.unfreeze + change.profit;

      const { error: updateError } = await supabase
        .from("users")
        .update({
          balance: newBalance,
          available_balance: newAvailable,
        })
        .eq("id", uid)
        .eq("balance", oldBalance)           // 乐观锁
        .eq("available_balance", oldAvailable); // 乐观锁

      if (updateError) {
        console.error(`用户 ${uid} 更新失败:`, updateError);
        throw new Error(`用户 ${uid} 余额更新失败，请重试`);
      }
    });

    await Promise.all(userBalancePromises);

    // 5. 更新股票状态为已结算
    const { error: stockError } = await supabase
      .from("stocks")
      .update({ status: "settled" })
      .eq("id", stock.id);

    if (stockError) throw stockError;

    // 6. 计算统计信息用于提示
    const totalReleased = details.reduce((s, d) => s + parseFloat(d.amount), 0);
    const totalUserProfit = details.reduce((s, d) => {
      const asset = parseFloat(d.amount) / buyPrice;
      const profit = priceDiff * asset * (1 - d.mentor_commission / 100);
      return s + profit;
    }, 0);
    const totalAmount = totalReleased + totalUserProfit;

    alert(
      `结算成功！\n` +
      `跟单人数：${details.length}\n` +
      `释放冻结资金：${totalReleased.toFixed(2)} USD\n` +
      `用户实得盈亏：${totalUserProfit.toFixed(2)} USD\n` +
      `总到账金额：${totalAmount.toFixed(2)} USD`
    );

    fetchStocks();
  } catch (error) {
    console.error("结算失败:", error);
    alert("结算失败: " + error.message);
  }
};


  const handleDeleteStock = async (id) => {
    if (!window.confirm("确定删除此上股？")) return;
    try {
      const { error } = await supabase.from("stocks").delete().eq("id", id);
      if (error) throw error;
      alert("删除成功");
      fetchStocks();
    } catch (error) {
      alert("删除失败: " + error.message);
    }
  };

  const handleEditStock = (stock) => {
    setEditStock({
      id: stock.id,
      mentor_id: stock.mentor_id.toString(),
      crypto_name: stock.crypto_name,
      buy_price: stock.buy_price.toString(),
      sell_price: stock.sell_price.toString(),
    });
    setIsEditing(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("stocks")
        .update({
          mentor_id: parseInt(editStock.mentor_id),
          crypto_name: editStock.crypto_name.trim(),
          buy_price: parseFloat(editStock.buy_price),
          sell_price: parseFloat(editStock.sell_price),
        })
        .eq("id", editStock.id);
      if (error) throw error;
      alert("更新成功");
      setIsEditing(false);
      fetchStocks();
    } catch (error) {
      alert("更新失败: " + error.message);
    }
  };

  const openDetails = async (stock) => {
    setSelectedStock(stock);
    setIsModalOpen(true);
    setDetailsLoading(true);
    try {
      const { data, error } = await supabase
        .from("copytrade_details")
        .select(`
          id, user_id, mentor_id, amount, mentor_commission, created_at,
          users (phone_number)
        `)
        .eq("stock_id", stock.id);
      if (error) throw error;

      const formattedDetails = data.map((item) => ({
        ...item,
        phone_number: item.users?.phone_number || "未知",
      }));

      setCopytradeDetails(formattedDetails);
    } catch (error) {
      alert("加载跟单详情失败: " + error.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCopytradeDetails([]);
  };

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">上股管理</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary text-sm">
          {isAdding ? "取消添加" : "添加上股"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={(e) => { e.preventDefault(); handleAddStock(); }} className="space-y-4 mb-6">
          <select
            value={newStock.mentor_id}
            onChange={(e) => setNewStock({ ...newStock, mentor_id: e.target.value })}
            className="admin-input"
          >
            <option value="">选择导师</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (佣金 {m.commission}%)
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="币种名称 (e.g. BTC)"
            value={newStock.crypto_name}
            onChange={(e) => setNewStock({ ...newStock, crypto_name: e.target.value })}
            className="admin-input"
          />

          <input
            type="number"
            step="0.01"
            placeholder="买入价"
            value={newStock.buy_price}
            onChange={(e) => setNewStock({ ...newStock, buy_price: e.target.value })}
            className="admin-input"
          />

          <input
            type="number"
            step="0.01"
            placeholder="卖出价"
            value={newStock.sell_price}
            onChange={(e) => setNewStock({ ...newStock, sell_price: e.target.value })}
            className="admin-input"
          />

          <button type="submit" className="btn-primary w-full">
            添加
          </button>
        </form>
      )}

      {isEditing && (
        <form onSubmit={handleUpdateStock} className="space-y-4 mb-6">
          <select
            value={editStock.mentor_id}
            onChange={(e) => setEditStock({ ...editStock, mentor_id: e.target.value })}
            className="admin-input"
          >
            <option value="">选择导师</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (佣金 {m.commission}%)
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="币种名称"
            value={editStock.crypto_name}
            onChange={(e) => setEditStock({ ...editStock, crypto_name: e.target.value })}
            className="admin-input"
          />

          <input
            type="number"
            step="0.01"
            placeholder="买入价"
            value={editStock.buy_price}
            onChange={(e) => setEditStock({ ...editStock, buy_price: e.target.value })}
            className="admin-input"
          />

          <input
            type="number"
            step="0.01"
            placeholder="卖出价"
            value={editStock.sell_price}
            onChange={(e) => setEditStock({ ...editStock, sell_price: e.target.value })}
            className="admin-input"
          />

          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              更新
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="btn-danger">
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
              <th className="admin-table th">导师</th>
              <th className="admin-table th">币种</th>
              <th className="admin-table th">买入价</th>
              <th className="admin-table th">卖出价</th>
              <th className="admin-table th">状态</th>
              <th className="admin-table th">跟单人数</th>
              <th className="admin-table th">操作</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const mentor = mentors.find((m) => m.id === stock.mentor_id);
              return (
                <tr key={stock.id} className="hover:bg-gray-50 transition">
                  <td className="admin-table td">{stock.id}</td>
                  <td className="admin-table td">{mentor?.name || "未知"}</td>
                  <td className="admin-table td font-medium">{stock.crypto_name}</td>
                  <td className="admin-table td text-green-600">${stock.buy_price}</td>
                  <td className="admin-table td text-red-600">${stock.sell_price}</td>
                  <td className="admin-table td">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stock.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : stock.status === "published"
                          ? "bg-blue-100 text-blue-800"
                          : stock.status === "settled"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {stock.status === "settled"
                        ? "已结算"
                        : stock.status === "pending"
                        ? "待上架"
                        : stock.status === "published"
                        ? "进行中"
                        : "未知"}
                    </span>
                  </td>
                  <td className="admin-table td">
                    <button
                      onClick={() => openDetails(stock)}
                      className="text-left text-blue-600 hover:underline cursor-pointer"
                      title="点击查看跟单详情"
                    >
                      <div className="font-medium">{stock.bound_count} 人</div>
                      {stock.pending_bind_count > 0 && stock.status === "pending" && (
                        <div className="text-xs text-gray-500">
                          可绑定: {stock.pending_bind_count} 人
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="admin-table td space-x-1">
                    {stock.status === "pending" && (
                      <button onClick={() => handlePublish(stock.id)} className="btn-primary text-xs">
                        上架
                      </button>
                    )}
                    {stock.status === "published" && (
                      <button onClick={() => handleSettle(stock)} className="btn-primary text-xs">
                        结算
                      </button>
                    )}
                    <button onClick={() => handleEditStock(stock)} className="btn-primary text-xs">
                      编辑
                    </button>
                    <button onClick={() => handleDeleteStock(stock.id)} className="btn-danger text-xs">
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                跟单详情 - {selectedStock?.crypto_name}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {detailsLoading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : copytradeDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无跟单记录</div>
            ) : (
              <div className="overflow-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-table th">手机号</th>
                      <th className="admin-table th">金额</th>
                      <th className="admin-table th">佣金率</th>
                      <th className="admin-table th">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copytradeDetails.map((detail) => (
                      <tr key={detail.id} className="hover:bg-gray-50">
                        <td className="admin-table td font-medium text-blue-600">{detail.phone_number}</td>
                        <td className="admin-table td text-green-600">${detail.amount}</td>
                        <td className="admin-table td">{detail.mentor_commission}%</td>
                        <td className="admin-table td text-gray-500">
                          {new Date(detail.created_at).toLocaleString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
