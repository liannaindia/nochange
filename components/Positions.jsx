import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Positions({
  isLoggedIn,
  balance,
  availableBalance,
  userId,
}) {
  const [tab, setTab] = useState("pending");
  const [totalAssets, setTotalAssets] = useState(0);
  const [floatingPL, setFloatingPL] = useState(0);
  const [available, setAvailable] = useState(0);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    setTotalAssets(balance || 0);
    setAvailable(availableBalance || 0);

    const fetchDetails = async () => {
      const { data: details, error } = await supabase
        .from("copytrade_details")
        .select(`
          id, amount, order_profit_amount, status, created_at,
          mentor_id, stock_id,
          mentors (name, years, img)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching copytrade details:", error);
        return;
      }

      let floatPL = 0;
      const pend = [];
      const comp = [];

      details.forEach((d) => {
        const amount = parseFloat(d.amount) || 0;
        const profit = parseFloat(d.order_profit_amount) || 0;
        const mentor = d.mentors || {};
        const time = new Date(d.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        if (d.status === "approved") {
          pend.push({
            id: d.id,
            name: mentor.name || "Unknown Mentor",
            years: mentor.years || 0,
            type: "Following",
            amount,
            earnings: "---",
            time,
            status: "In Progress",
            img:
              mentor.img ||
              "https://randomuser.me/api/portraits/women/65.jpg",
          });
        } else if (d.status === "settled") {
          floatPL += profit;
          const earnings =
            profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
          comp.push({
            id: d.id,
            name: mentor.name || "Unknown Mentor",
            years: mentor.years || 0,
            type: "Completed",
            amount,
            earnings,
            time,
            status: "Settled",
            img:
              mentor.img ||
              "https://randomuser.me/api/portraits/men/51.jpg",
          });
        } else if (d.status === "cancelled") {
          // ✅ 被拒绝订单
          const earnings = "---";
          comp.push({
            id: d.id,
            name: mentor.name || "Unknown Mentor",
            years: mentor.years || 0,
            type: "Completed",
            amount,
            earnings,
            time,
            status: "Rejected",
            img:
              mentor.img ||
              "https://randomuser.me/api/portraits/men/52.jpg",
          });
        }
      });

      setFloatingPL(floatPL);
      setPendingOrders(pend);
      setCompletedOrders(comp);
    };

    fetchDetails();
  }, [isLoggedIn, userId, balance, availableBalance]);

  const list = tab === "pending" ? pendingOrders : completedOrders;

  return (
    <div className="px-4 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="mt-3 mb-3 text-center">
        <h2 className="text-lg font-bold text-slate-800 border-b-2 border-yellow-400 inline-block pb-1">
          Positions
        </h2>
      </div>

      {/* Asset Card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
          <span>Total Assets (USDT)</span>
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">
          {totalAssets.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-4 text-[13px] text-slate-600 mt-3">
          <div>
            <div>Floating P/L</div>
            <div className="font-bold text-slate-800">
              {floatingPL.toFixed(2)}
            </div>
          </div>
          <div>
            <div>Available Balance</div>
            <div className="font-bold text-slate-800">{available.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 mb-3">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition ${
            tab === "pending"
              ? "text-yellow-500 border-yellow-500"
              : "text-slate-500 border-transparent"
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition ${
            tab === "completed"
              ? "text-yellow-500 border-yellow-500"
              : "text-slate-500 border-transparent"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Order List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            {tab === "pending"
              ? "No active follow orders"
              : "No completed orders"}
          </p>
        ) : (
          list.map((o) => (
            <div
              key={o.id}
              className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={o.img}
                    alt={o.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {o.name}
                    </div>
                    <div className="text-[12px] text-slate-500">
                      Experience {o.years} years
                    </div>
                  </div>
                </div>
                <span className="text-[11px] bg-yellow-100 text-yellow-600 px-2 py-[2px] rounded-md font-medium">
                  {o.type}
                </span>
              </div>

              <div className="grid grid-cols-2 mt-2 text-[12px] text-slate-500">
                <div>
                  <div>Investment Amount</div>
                  <div className="font-semibold text-slate-800">
                    {o.amount.toLocaleString()}{" "}
                    <span className="text-[11px]">USDT</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>Order Earnings</div>
                  <div
                    className={`font-semibold ${
                      o.earnings.startsWith("+")
                        ? "text-emerald-600"
                        : o.earnings.startsWith("-")
                        ? "text-rose-600"
                        : "text-slate-700"
                    }`}
                  >
                    {o.earnings}
                  </div>
                </div>
                <div className="col-span-2 flex justify-between mt-2 text-[12px]">
                  <div>
                    Applied at <br />
                    <span className="text-slate-700">{o.time}</span>
                  </div>
                  <div className="text-right">
                    Status <br />
                    <span
                      className={`font-semibold ${
                        o.status === "In Progress"
                          ? "text-yellow-500"
                          : o.status === "Rejected"
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
