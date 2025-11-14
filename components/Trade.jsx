import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function Trade({ setTab, balance, userId, isLoggedIn }) {
  const [query, setQuery] = useState("");
  const [mentors, setMentors] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingAmount, setFollowingAmount] = useState("");
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0); // 可用余额

  // 使用 useRef 保存订阅实例，避免重复订阅
  const subscriptionRef = useRef(null);

  // 初始化：加载导师、手机号、可用余额
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    fetchMentors();
    fetchUserPhoneNumber();
    fetchAvailableBalance(); // 初始加载
  }, [isLoggedIn, userId]);

  // 实时订阅 available_balance
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      // 清理订阅
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      return;
    }

    // 取消旧订阅
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // 订阅 users 表中当前 userId 的 available_balance 变化
    const channel = supabase
      .channel(`user-balance-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听 INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && 'available_balance' in payload.new) {
            setAvailableBalance(parseFloat(payload.new.available_balance) || 0);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active for user:', userId);
        }
      });

    subscriptionRef.current = channel;

    // 清理函数：组件卸载或 userId 变化时取消订阅
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userId, isLoggedIn]);

  // 初始加载可用余额（防止订阅延迟）
  const fetchAvailableBalance = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("available_balance")
        .eq("id", userId)
        .single();
      if (error) throw error;
      setAvailableBalance(parseFloat(data?.available_balance) || 0);
    } catch (error) {
      console.error("Failed to load available balance:", error);
      setAvailableBalance(0);
    }
  };

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase.from("mentors").select("*");
      if (error) throw error;
      setMentors(data || []);
    } catch (error) {
      console.error("Failed to load mentors:", error);
    }
  };

  const fetchUserPhoneNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", userId)
        .single();
      if (error) throw error;
      setUserPhoneNumber(data?.phone_number || "");
    } catch (error) {
      console.error("Failed to load phone number:", error);
    }
  };

  const filtered = mentors.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectMentor = (mentor) => {
    setSelectedMentor(mentor);
    setIsFollowing(true);
  };

  const handleFollow = async () => {
    if (!followingAmount || parseFloat(followingAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (parseFloat(followingAmount) > availableBalance) {
      alert("Insufficient available balance");
      return;
    }
    if (!selectedMentor) {
      alert("Please select a mentor");
      return;
    }

    try {
      const { error } = await supabase.from("copytrades").insert([{
        user_id: userId,
        mentor_id: selectedMentor.id,
        amount: parseFloat(followingAmount),
        status: "pending",
        mentor_commission: selectedMentor.commission,
      }]);

      if (error) throw error;

      alert("Follow request submitted, awaiting approval");
      setIsFollowing(false);
      setFollowingAmount("");
      setSelectedMentor(null);

      // 不再需要手动刷新，Realtime 会自动更新
      // fetchAvailableBalance(); // 已移除

    } catch (error) {
      console.error("Follow request failed:", error);
      alert("Request failed, please try again");
    }
  };

  const handleBack = () => {
    setIsFollowing(false);
    setSelectedMentor(null);
  };

  const handleRecharge = () => {
    setTab("recharge");
  };

  return (
    <div
      style={{
        padding: "0 16px 96px 16px",
        maxWidth: "448px",
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="none" stroke="%23FFD700" stroke-width="2"/><path d="M50 15 Q65 30, 65 50 Q65 70, 50 85 Q35 70, 35 50 Q35 30, 50 15" fill="none" stroke="%23FF6B35" stroke-width="1.5"/><circle cx="50" cy="50" r="10" fill="%23FFD700" opacity="0.3"/></svg>')`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.1,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {isFollowing ? (
        <div style={{ padding: "24px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#FF6B35",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            Daily Follow
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FFFFFF",
              padding: "16px",
              borderRadius: "16px",
              boxShadow: "0 8px 20px rgba(255, 107, 53, 0.15)",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "14px", color: "#374151" }}>
                Available Balance:{" "}
                <span style={{ fontWeight: "bold", color: "#FFD700" }}>
                  {availableBalance.toFixed(2)} USDT
                </span>
              </span>
              <span style={{ fontSize: "12px", color: "#6B7280" }}>
                Total Balance: {balance.toFixed(2)} USDT
              </span>
            </div>
            <button
              onClick={handleRecharge}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #FFD700, #FF6B35)",
                color: "#1A1A1A",
                fontWeight: "bold",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
              Go Recharge
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "14px",
                color: "#374151",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Following Limit (100 USDT - 9999 USDT)
            </label>
            <input
              type="number"
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #FF6B35",
                borderRadius: "12px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              placeholder="Enter Following Amount"
              value={followingAmount}
              onChange={(e) => setFollowingAmount(e.target.value)}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "12px",
              color: "#6B7280",
              marginBottom: "16px",
            }}
          >
            <input
              type="checkbox"
              style={{
                marginRight: "8px",
                width: "20px",
                height: "20px",
                accentColor: "#FFD700",
              }}
            />
            I have read and agree to{" "}
            <a
              href="#"
              style={{
                color: "#FF6B35",
                textDecoration: "underline",
                marginLeft: "4px",
              }}
            >
              Service Agreement
            </a>
          </label>

          <button
            onClick={handleBack}
            style={{
              width: "100%",
              padding: "12px",
              background: "#6B7280",
              color: "#FFFFFF",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "none",
              marginBottom: "12px",
              cursor: "pointer",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#4B5563")}
            onMouseLeave={(e) => (e.target.style.background = "#6B7280")}
          >
            Back
          </button>

          <button
            onClick={handleFollow}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #FF6B35, #FFD700)",
              color: "#1A1A1A",
              fontWeight: "bold",
              fontSize: "18px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            Follow
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", margin: "20px 0" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for Traders"
              style={{
                width: "100%",
                padding: "12px 48px 12px 48px",
                background: "#FFFFFF",
                border: "2px solid #FFD700",
                borderRadius: "9999px",
                fontSize: "14px",
                outline: "none",
                boxShadow: "0 4px 10px rgba(255, 215, 0, 0.2)",
                transition: "border-color 0.3s, box-shadow 0.3s",
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23FF6B35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>')`,
                backgroundPosition: "16px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#FF6B35";
                e.target.style.boxShadow = "0 0 0 3px rgba(255, 107, 53, 0.3)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#FFD700";
                e.target.style.boxShadow = "0 4px 10px rgba(255, 215, 0, 0.2)";
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#FFFFFF",
                  border: "1px solid #FF9933",
                  borderRadius: "16px",
                  padding: "12px",
                  boxShadow: "0 8px 15px rgba(255, 153, 51, 0.15)",
                  transition: "transform 0.3s",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
              >
                <img
                  src={m.img}
                  alt={m.name}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "9999px",
                    objectFit: "cover",
                    marginRight: "12px",
                    boxShadow: "0 0 0 4px rgba(255, 215, 0, 0.3)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1F2937" }}>{m.name}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>Investment Experience {m.years} years</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Cumulative Assets</div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#FF6B35" }}>
                    {m.assets.toLocaleString()} <span style={{ fontSize: "11px" }}>USDT</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px" }}>
                    Commission Rate: <span style={{ fontWeight: "bold", color: "#FF6B35" }}>{m.commission}%</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectMentor(m)}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #FFD700, #FF6B35)",
                    color: "#1A1A1A",
                    fontWeight: "bold",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                  Select Mentor
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
