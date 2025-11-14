import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Withdraw({ setTab, userId, balance, availableBalance }) {
  const [tab, setTabState] = useState("request");
  const [walletAddress, setWalletAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to fetch wallet:", error);
        setError("Failed to load wallet address.");
      } else if (data?.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    };

    fetchWalletAddress();
  }, [userId]);

  const handleRequestWithdraw = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      if (!walletAddress) {
        setError("No wallet address saved. Please set it in 'Receiving Address'.");
        return;
      }

      const isValidTRC20 = walletAddress.startsWith("T") && walletAddress.length === 34;
      if (!isValidTRC20) {
        setError("Saved wallet address is invalid (must be TRC20).");
        return;
      }

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount < 100 || amount > 9999) {
        setError("Amount must be 100–9999 USDT.");
        return;
      }

      // 确保提款金额不超过有效余额
      if (amount > availableBalance) {
        setError("Insufficient available balance.");
        return;
      }

      const { error } = await supabase
        .from("withdraws")
        .insert({
          user_id: userId,
          amount: amount,
          wallet_address: walletAddress,
          status: "pending",
        });

      if (error) {
        console.error("Withdraw error:", error);
        setError("Failed to submit request. Please try again.");
      } else {
        setWithdrawAmount("");
        alert("Withdraw request submitted successfully!");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    const trimmed = newAddress.trim();
    if (!trimmed) {
      setError("Please enter a wallet address.");
      setLoading(false);
      return;
    }

    const isValidTRC20 = trimmed.startsWith("T") && trimmed.length === 34;
    if (!isValidTRC20) {
      setError("Invalid TRC-20 address. Must start with 'T' and be 34 characters.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ wallet_address: trimmed })
        .eq("id", userId);

      if (error) {
        console.error("Save address error:", error);
        setError("Failed to save address. Please try again.");
      } else {
        setWalletAddress(trimmed);
        setNewAddress("");
        alert("Wallet address saved successfully!");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        paddingBottom: "96px",
        maxWidth: "448px",
        margin: "0 auto",
        background: "linear-gradient(to bottom, #fff8f0, #fff0e6)",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 印度风背景纹饰（内联 SVG） */}
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

      {/* 顶部导航 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 0",
          position: "sticky",
          top: 0,
          background: "rgba(255, 248, 240, 0.8)",
          backdropFilter: "blur(10px)",
          zIndex: 10,
          borderBottom: "1px solid #FF9933",
        }}
      >
        <ArrowLeft
          style={{ width: "24px", height: "24px", color: "#FF6B35", cursor: "pointer" }}
          onClick={() => setTab("home")}
        />
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#FF6B35" }}>Withdraw</h2>
      </div>

      {/* 标签页切换 */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #FF9933",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setTabState("request")}
          style={{
            flex: 1,
            padding: "8px",
            fontSize: "14px",
            fontWeight: "bold",
            borderBottom: tab === "request" ? "3px solid #FF6B35" : "none",
            color: tab === "request" ? "#FF6B35" : "#6B7280",
            transition: "color 0.3s",
          }}
        >
          Request Withdraw
        </button>
        <button
          onClick={() => setTabState("address")}
          style={{
            flex: 1,
            padding: "8px",
            fontSize: "14px",
            fontWeight: "bold",
            borderBottom: tab === "address" ? "3px solid #FF6B35" : "none",
            color: tab === "address" ? "#FF6B35" : "#6B7280",
            transition: "color 0.3s",
          }}
        >
          Receiving Address
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#DC2626",
            borderRadius: "12px",
            fontSize: "14px",
            boxShadow: "0 4px 10px rgba(220, 38, 38, 0.1)",
          }}
        >
          {error}
        </div>
      )}

      {/* Request Withdraw 页面 */}
      {tab === "request" ? (
        <>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #FF9933",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 8px 20px rgba(255, 153, 51, 0.15)",
              marginBottom: "16px",
              transition: "transform 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "14px", color: "#6B7280" }}>Total Balance</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF6B35" }}>
              {balance} <span style={{ fontSize: "14px", color: "#6B7280" }}>USDT</span>
            </div>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #FF9933",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 8px 20px rgba(255, 153, 51, 0.15)",
              marginBottom: "16px",
              transition: "transform 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "14px", color: "#6B7280" }}>Available Balance</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF6B35" }}>
              {availableBalance} <span style={{ fontSize: "14px", color: "#6B7280" }}>USDT</span>
            </div>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #FF9933",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 8px 20px rgba(255, 153, 51, 0.15)",
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              transition: "transform 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-4px)")}
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            <div>
              <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "8px" }}>Withdraw Account</div>
              <div
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #FF9933",
                  borderRadius: "12px",
                  fontSize: "14px",
                  color: "#1F2937",
                  wordBreak: "break-all",
                }}
              >
                {walletAddress || "No wallet address saved"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "8px" }}>
                Withdraw Amount <span style={{ color: "#9CA3AF" }}>100–9999 USDT</span>
              </div>
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
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="100"
                max="9999"
                step="0.01"
                onFocus={(e) => {
                  e.target.style.borderColor = "#FFD700";
                  e.target.style.boxShadow = "0 0 0 3px rgba(255, 215, 0, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#FF6B35";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ fontSize: "12px", color: "#6B7280" }}>
              Withdraw Fee: <span style={{ fontWeight: "bold", color: "#1F2937" }}>0 USDT</span>
            </div>
          </div>

          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FF9933",
              borderRadius: "16px",
              padding: "12px",
              fontSize: "12px",
              color: "#7C2D12",
              marginBottom: "16px",
              boxShadow: "0 4px 10px rgba(255, 153, 51, 0.1)",
            }}
          >
            <strong>Important Reminder:</strong>
            <br />
            A withdraw fee will be deducted from the withdraw amount.
            The final amount depends on network conditions.
          </div>

          <button
            onClick={handleRequestWithdraw}
            disabled={loading || !walletAddress}
            style={{
              width: "100%",
              padding: "16px",
              background: loading || !walletAddress
                ? "#D1D5DB"
                : "linear-gradient(135deg, #FFD700, #FF6B35)",
              color: loading || !walletAddress ? "#6B7280" : "#1A1A1A",
              fontWeight: "bold",
              fontSize: "18px",
              borderRadius: "16px",
              border: "none",
              cursor: loading || !walletAddress ? "not-allowed" : "pointer",
              transition: "transform 0.2s",
              boxShadow: "0 8px 15px rgba(255, 107, 53, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!(loading || !walletAddress)) e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          >
            {loading ? "Submitting..." : "Continue"}
          </button>
        </>
      ) : (
        /* Receiving Address 页面 */
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #FF9933",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 8px 20px rgba(255, 153, 51, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            transition: "transform 0.3s",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-4px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <div>
            <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>Current Receiving Address</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#FF6B35", marginBottom: "8px" }}>USDT (TRC20)</div>
            <div
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #FF9933",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#1F2937",
                wordBreak: "break-all",
              }}
            >
              {walletAddress || "No address saved yet"}
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #FF6B35",
                borderRadius: "12px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              placeholder="Enter new USDT TRC20 address (starts with T)"
              maxLength="34"
              onFocus={(e) => {
                e.target.style.borderColor = "#FFD700";
                e.target.style.boxShadow = "0 0 0 3px rgba(255, 215, 0, 0.3)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#FF6B35";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleSaveAddress}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: loading
                  ? "#D1D5DB"
                  : "linear-gradient(135deg, #FFD700, #FF6B35)",
                color: loading ? "#6B7280" : "#1A1A1A",
                fontWeight: "bold",
                fontSize: "18px",
                borderRadius: "16px",
                border: "none",
                marginTop: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "transform 0.2s",
                boxShadow: "0 8px 15px rgba(255, 107, 53, 0.2)",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
              {loading ? "Saving..." : "Save Address"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
