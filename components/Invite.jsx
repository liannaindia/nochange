// components/Invite.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, Copy, X, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Invite({ setTab, userId, isLoggedIn }) {
  const [referralCode, setReferralCode] = useState("");
  const [downlineCount, setDownlineCount] = useState(0);
  const [downlineUsers, setDownlineUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [level1Count, setLevel1Count] = useState(0);
  const [level2Count, setLevel2Count] = useState(0);
  const [level3Count, setLevel3Count] = useState(0);
  const [effectiveCount, setEffectiveCount] = useState(0);
  const [downlineByLevel, setDownlineByLevel] = useState({
    level1: [],
    level2: [],
    level3: [],
  });

  // Copy code
  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    alert("Invitation code copied!");
  };

  // Mask phone
  const maskPhone = (phone) => {
    if (!phone || phone.length < 8) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  };

  // === 加载邀请码 ===
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setReferralCode("N/A");
      return;
    }
    const loadReferralCode = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("referral_code")
          .eq("id", userId)
          .single();
        if (error) throw error;
        setReferralCode(data.referral_code || "N/A");
      } catch (err) {
        console.error("Load referral code error:", err);
        setReferralCode("Error");
      }
    };
    loadReferralCode();
  }, [userId, isLoggedIn]);

  // === 加载下线树数据（关键修复）===
 const loadTreeData = async () => {
  if (!userId || isNaN(userId) || Number(userId) <= 0) {
    console.warn("Invalid userId:", userId);
    setLoading(false);
    return;
  }

  const uid = parseInt(userId, 10);
  
  console.log("Calling RPC with:", { p_user_id: uid }); // 调试必加！

  try {
    setLoading(true);

    const { data: treeData, error: treeErr } = await supabase
      .rpc("get_referral_tree", { p_user_id: uid }); // 必须是 p_user_id

    if (treeErr) {
      console.error("RPC Error:", treeErr);
      throw treeErr;
    }

  

      // 统计
      let l1 = 0, l2 = 0, l3 = 0, effective = 0;
      const dl1 = [], dl2 = [], dl3 = [];

      treeData?.forEach((u) => {
        const recharge = Number(u.total_recharge) || 0;

        if (u.level === 1) { l1++; dl1.push({ ...u, total_recharge: recharge }); }
        else if (u.level === 2) { l2++; dl2.push({ ...u, total_recharge: recharge }); }
        else if (u.level === 3) { l3++; dl3.push({ ...u, total_recharge: recharge }); }

        if (recharge >= 115) effective++;
      });

      const total = l1 + l2 + l3;

      setTotalCount(total);
      setLevel1Count(l1);
      setLevel2Count(l2);
      setLevel3Count(l3);
      setEffectiveCount(effective);
      setDownlineByLevel({ level1: dl1, level2: dl2, level3: dl3 });

      // 兼容旧字段
      setDownlineCount(l1);
      setDownlineUsers(dl1.map(u => ({
        phone_number: u.phone_number,
        created_at: u.created_at
      })));

    } catch (err) {
      console.error("Load tree data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // === 初始加载 ===
  useEffect(() => {
    if (isLoggedIn && userId && !isNaN(userId)) {
      loadTreeData();
    } else {
      setLoading(false);
    }
  }, [userId, isLoggedIn]);

  // === 实时监听新用户（仅 level 1）===
  useEffect(() => {
    if (!isLoggedIn || !userId || isNaN(userId)) return;

    const channel = supabase
      .channel(`invite-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "users",
          filter: `invited_by=eq.${userId}`,
        },
        (payload) => {
          const newUser = payload.new;
          setLevel1Count(prev => prev + 1);
          setTotalCount(prev => prev + 1);
          setDownlineCount(prev => prev + 1);
          setDownlineUsers(prev => [{
            phone_number: newUser.phone_number,
            created_at: newUser.created_at,
          }, ...prev]);
          setDownlineByLevel(prev => ({
            ...prev,
            level1: [{
              phone_number: newUser.phone_number,
              created_at: newUser.created_at,
              total_recharge: 0,
              level: 1,
            }, ...prev.level1],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isLoggedIn]);

  // === 打开模态框并刷新数据 ===
  const handleShowDownline = async () => {
    if (!userId || totalCount === 0) return;
    setModalLoading(true);
    setShowModal(true);
    await loadTreeData();
    setModalLoading(false);
  };

  return (
    <div className="px-4 pb-24 max-w-md mx-auto bg-[#f5f7fb] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 py-3">
        <ArrowLeft
          className="h-5 w-5 text-slate-700 cursor-pointer"
          onClick={() => setTab("home")}
        />
        <h2 className="font-semibold text-slate-800 text-lg">Invite</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-sm">
          <div className="text-xs opacity-90">Total Users</div>
          <div className="text-2xl font-bold">{loading ? "..." : totalCount}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white p-4 rounded-xl shadow-sm">
          <div className="text-xs opacity-90">Level 1</div>
          <div className="text-2xl font-bold">{loading ? "..." : level1Count}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white p-4 rounded-xl shadow-sm">
          <div className="text-xs opacity-90">Level 2</div>
          <div className="text-2xl font-bold">{loading ? "..." : level2Count}</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 text-white p-4 rounded-xl shadow-sm">
          <div className="text-xs opacity-90">Level 3</div>
          <div className="text-2xl font-bold">{loading ? "..." : level3Count}</div>
        </div>
        <div
          className="col-span-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-4 rounded-xl shadow-sm cursor-pointer"
          onClick={handleShowDownline}
        >
          <div className="text-sm opacity-90 text-center">Effective Users (greater than or equal to 115 USDT)</div>
          <div className="text-3xl font-bold text-center">{loading ? "..." : effectiveCount}</div>
        </div>
      </div>

      {/* Invitation Code */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-sm text-slate-600 mb-1">My Invitation Code</div>
        <div className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
          <span className="text-lg font-mono text-slate-700 tracking-wider">
            {referralCode || "Loading..."}
          </span>
          <button
            onClick={copyCode}
            disabled={!referralCode || referralCode === "N/A" || referralCode === "Error"}
            className="text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Reward Model */}
      <div className="mt-5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowRewards(!showRewards)}
          className="w-full p-4 flex items-center justify-between text-white font-semibold"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <span>Team Level Reward Model (₹10,000 Start)</span>
          </div>
          {showRewards ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {showRewards && (
          <div className="bg-white p-4 max-h-96 overflow-y-auto">
            <div className="text-xs text-slate-500 mb-3 text-center">
              Minimum recharge ₹10,000 (approximately 113 USDT) · Direct referral reward per person · Team size unlocks base reward
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left font-bold text-orange-600">Rank</th>
                  <th className="py-2 text-center font-bold text-orange-600">Condition</th>
                  <th className="py-2 text-center font-bold text-green-600">Base Reward</th>
                  <th className="py-2 text-center font-bold text-blue-600">Direct Reward</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: "Jawan (जवान)", cond: "Direct 3", base: "30", inr: "2,650", direct: "10" },
                  { rank: "Naik (नायक)", cond: "Direct 4 + Team 9", base: "90", inr: "7,950", direct: "20" },
                  { rank: "Havildar (हविलदार)", cond: "Direct 5 + Team 27", base: "160", inr: "14,130", direct: "30" },
                  { rank: "Naib-Subedar", cond: "Direct 8 + Team 81", base: "350", inr: "30,900", direct: "40" },
                  { rank: "Subedar (सुबेदार)", cond: "Direct 12 + Team 243", base: "700", inr: "61,800", direct: "50" },
                  { rank: "Jemadar (जमादार)", cond: "Direct 20 + Team 729", base: "1,500", inr: "132,420", direct: "70" },
                  { rank: "Rissaldar (रिसालदार)", cond: "Direct 30 + Team 2,187", base: "3,000", inr: "264,840", direct: "90" },
                  { rank: "Subedar-Major", cond: "Direct 40 + Team 6,561", base: "6,000", inr: "529,680", direct: "120" },
                  { rank: "Commandant (कमांडेंट)", cond: "Direct 50 + Team 19,683", base: "12,000", inr: "1,059,360", direct: "150", highlight: true },
                ].map((item, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${item.highlight ? "bg-yellow-50" : ""}`}>
                    <td className="py-2 font-medium">
                      <div className="font-bold text-orange-700">{item.rank.split(" ")[0]}</div>
                      <div className="text-xs text-slate-500">{item.rank.includes("(") ? item.rank.split("(")[1].slice(0, -1) : ""}</div>
                    </td>
                    <td className="py-2 text-center text-slate-600">{item.cond}</td>
                    <td className="py-2 text-center">
                      <div className="font-bold text-green-600">{item.base} USDT</div>
                      <div className="text-xs text-slate-500">₹{item.inr}</div>
                    </td>
                    <td className="py-2 text-center font-medium text-blue-600">{item.direct} USDT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Prompt */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Share your code to invite friends and earn rewards!
      </div>

      {/* Downline Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">
                Downline Users ({totalCount})
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {modalLoading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : totalCount === 0 ? (
                <div className="text-center py-8 text-slate-500">No downline users</div>
              ) : (
                <div className="space-y-4">
                  {["Level 1", "Level 2", "Level 3"].map((label, idx) => {
                    const level = idx + 1;
                    const users = downlineByLevel[`level${level}`];
                    if (!users || users.length === 0) return null;
                    return (
                      <div key={level}>
                        <div className="font-semibold text-slate-700 mb-2">
                          {label} ({users.length} users)
                        </div>
                        <div className="space-y-2">
                          {users.map((user, i) => (
                            <div
                              key={i}
                              className={`flex justify-between items-center p-3 rounded-lg ${
                                user.total_recharge >= 115 ? "bg-green-50 border border-green-300" : "bg-slate-50"
                              }`}
                            >
                              <div>
                                <div className="font-mono text-slate-700">
                                  {maskPhone(user.phone_number)}
                                  {user.total_recharge >= 115 && " (Effective)"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Recharge: ${Number(user.total_recharge).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(user.created_at).toLocaleDateString("en-GB")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
