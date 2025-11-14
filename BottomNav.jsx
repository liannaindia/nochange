// components/BottomNav.jsx
import React from "react";
import { Home, BarChart2, PlusCircle, ClipboardList, User } from "lucide-react";

const BottomNav = ({ tab, setTab }) => {
  const tabs = [
    { id: "home", icon: <Home size={20} />, label: "Home" },
    { id: "markets", icon: <BarChart2 size={20} />, label: "Markets" },
    { id: "trade", icon: <PlusCircle size={20} />, label: "Trade" },
    { id: "positions", icon: <ClipboardList size={20} />, label: "Positions" },
    { id: "me", icon: <User size={20} />, label: "Me" },
  ];

  return (
    <nav className="w-full flex justify-between px-6 py-2 bg-white">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`flex-1 flex flex-col items-center ${
            tab === t.id ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          {t.icon}
          <span className="text-xs mt-1 font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
