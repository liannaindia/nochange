import React, { useState, useEffect, useRef } from "react";

// 使用币安 API 实时获取市场数据
const Markets = () => {
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // 用于搜索的查询
  const observer = useRef(null); // 用于 IntersectionObserver
  const [page, setPage] = useState(1); // 页码控制，加载更多数据

  // 获取币安市场数据
  const fetchBinanceData = async () => {
    try {
      const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const data = await response.json();

      // 过滤出以 USDT 结尾的币种，并按照市值从大到小排序
      const filteredData = data
        .filter((coin) => coin.symbol.endsWith("USDT") && parseFloat(coin.lastPrice) > 0) // 只保留以 USDT 结尾且价格大于0的币种
        .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap));  // 按照市值从大到小排序

      setMarketData(filteredData);  // 更新数据到状态
      setLoading(false);  // 停止加载状态
    } catch (error) {
      console.error("Error fetching data from Binance:", error);
    }
  };

  useEffect(() => {
    fetchBinanceData(); // 初次加载时获取数据
    const interval = setInterval(() => {
      fetchBinanceData(); // 每 10 秒请求一次数据
    }, 10000);  // 每 10 秒请求一次数据

    return () => clearInterval(interval);  // 清除定时器
  }, []);  // 空依赖数组，意味着只会在组件加载时启动一次

  // 处理币种名称：去除交易对后缀（如 USDT，BUSD，但保留 BTC 和 ETH）
  const getBaseCurrency = (symbol) => {
    // 修改处理逻辑，确保能正确处理所有币种名称
    return symbol.replace(/(USDT|BUSD)$/g, '');
  };

  // 获取 LogoKit 图标链接
  const getLogoUrl = (symbol) => {
    const baseCurrency = getBaseCurrency(symbol);  // 提取币种名称
    return `https://img.logokit.com/crypto/${baseCurrency}?token=pk_fr18743751bed15b82d28e`;
  };

  // 过滤市场数据（根据搜索输入）
  const filteredData = marketData.filter((coin) =>
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && page === 1) {
    return <div>Loading market data...</div>;
  }

  return (
    <div className="px-4 pb-24 max-w-md mx-auto">
      {/* ===== 搜索栏 ===== */}
      <div className="flex items-center gap-2 mt-3 mb-3">
        <div className="flex items-center flex-1 bg-slate-100 border border-slate-200 rounded-full pl-3 pr-3 py-2 text-slate-500 cursor-pointer">
          <input
            type="text"
            placeholder="Search for a coin"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 outline-none"
          />
        </div>
      </div>

      {/* ===== 市场行情表 ===== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        {/* 标签行 */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-slate-600">Name</span>
          <span className="font-medium text-slate-600">Last Price</span>
          <span className="font-medium text-slate-600">24chg%</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredData.length > 0 ? (
            filteredData.map((coin) => (
              <div key={coin.symbol} className="flex justify-between items-center py-2 text-sm">
                <div className="flex items-center gap-2">
                  {/* 获取图标 */}
                  <img
                    src={getLogoUrl(coin.symbol)}
                    alt={coin.symbol}
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-slate-700">{getBaseCurrency(coin.symbol)}</span>
                </div>

                {/* 最新价格 */}
                <span className="text-slate-800 font-semibold">{coin.lastPrice}</span>

                {/* 24小时涨幅 */}
                <span
                  className={`font-medium ${
                    parseFloat(coin.priceChangePercent) >= 0
                      ? "text-emerald-600"  // Green for positive change
                      : "text-rose-600"  // Red for negative change
                  }`}
                >
                  {coin.priceChangePercent}%
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 py-4">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Markets;
