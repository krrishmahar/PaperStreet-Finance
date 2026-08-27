import React, { useState, useEffect, useRef } from 'react';

interface Trade {
  trade_id: string;
  client_id: string;
  client_name: string;
  symbol: string;
  quantity: number;
  price: number;
  order_type: 'BUY' | 'SELL';
  trade_timestamp: string;
}

interface Metrics {
  total_trades: string | number;
  total_turnover: string | number;
  avg_price: string | number;
  active_symbols: string | number;
  active_clients: string | number;
}

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<string>('Live Connected');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchTrades();
    fetchMetrics();
    connectSseStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/trades?limit=200');
      const json = await res.json();
      if (json.success) setTrades(json.data);
    } catch (e) {
      console.error('Failed to load initial trades:', e);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/metrics');
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  };

  const connectSseStream = () => {
    const sse = new EventSource('http://localhost:5000/api/stream');
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setStatusMessage('Stream Active (SSE)');
    };

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'TRADES_CHUNK_INGESTED') {
          setIsPulling(true);
          setProgress(data.progress);
          setTrades((prev) => {
            const map = new Map<string, Trade>();
            data.trades.forEach((t: Trade) => map.set(t.trade_id, t));
            prev.forEach((t) => map.set(t.trade_id, t));
            return Array.from(map.values()).slice(0, 300);
          });
          fetchMetrics();
        } else if (data.event === 'INGESTION_COMPLETED') {
          setIsPulling(false);
          setProgress(100);
          setStatusMessage(`Pull Completed (${data.totalIngested} trades)`);
          fetchMetrics();
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    sse.onerror = () => {
      setStatusMessage('Stream Reconnecting...');
    };
  };

  const triggerBsePull = async () => {
    try {
      setIsPulling(true);
      setProgress(0);
      setStatusMessage('Dispatched Ingestion Job...');
      await fetch('http://localhost:5000/api/trigger-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkSize: 500 }),
      });
    } catch (e) {
      console.error('Error triggering pull:', e);
    }
  };

  const filteredTrades = filterSymbol === 'ALL'
    ? trades
    : trades.filter((t) => t.symbol === filterSymbol);

  const symbols = ['ALL', ...Array.from(new Set(trades.map((t) => t.symbol)))];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              ARHAM FINTECH <span className="text-sm font-normal text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/10">BSE Real-Time Ingestion</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Resilient trade aggregator designed for 15-min BSE pulls & 30s connection timeout mitigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            Status: <span className="text-emerald-400 font-semibold">{statusMessage}</span>
          </span>
          <button
            onClick={triggerBsePull}
            disabled={isPulling}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-900/30 transition flex items-center gap-2"
          >
            {isPulling ? 'Pulling in Background...' : 'Trigger BSE Pull'}
          </button>
        </div>
      </header>

      {isPulling && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur">
          <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
            <span>BSE Chunk Ingestion in Progress...</span>
            <span className="font-mono text-emerald-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Total Ingested Trades</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {metrics?.total_trades?.toLocaleString() || trades.length}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Total Turnover</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            ₹{metrics?.total_turnover ? (+metrics.total_turnover).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Active Equities</div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {metrics?.active_symbols || '10'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Institutional Clients</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {metrics?.active_clients || '6'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3">
        <span className="text-xs text-slate-400 mr-2 font-medium">Filter Symbol:</span>
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setFilterSymbol(sym)}
            className={`px-3 py-1 text-xs font-mono rounded-md transition ${
              filterSymbol === sym
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur shadow-2xl">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider sticky top-0 border-b border-slate-800 backdrop-blur">
              <tr>
                <th className="py-3 px-4">Trade ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Price (₹)</th>
                <th className="py-3 px-4 text-right">Total Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredTrades.map((t) => {
                const totalVal = t.quantity * t.price;
                return (
                  <tr key={t.trade_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-300">{t.trade_id}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(t.trade_timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-sky-400 border border-slate-700">
                        {t.symbol}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{t.client_name}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.order_type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.order_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200">{t.quantity}</td>
                    <td className="py-2.5 px-4 text-right text-slate-200">
                      ₹{t.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-400">
                      ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
