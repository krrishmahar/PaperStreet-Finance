}
  );
    </div>
      )}
        </button>
          Load more
        <button onClick={fetchChunk} disabled={loadingRef.current}>
      {cursor && (
      </ul>
        ))}
          </li>
            {t.timestamp} – {t.symbol}: {t.quantity} @ {t.price}
          <li key={t.tradeId}>
        {trades.map((t) => (
      <ul>
      <h2>BSE Trades (Mock)</h2>
    <div>
  return (

  }, []);
    return () => clearInterval(interval);
    const interval = setInterval(fetchChunk, 15 * 60 * 1000);
    fetchChunk();
  useEffect(() => {
  // Initial load and periodic pull (every 15 min)

  };
    }
      loadingRef.current = false;
    } finally {
      setCursor(data.nextCursor);
      setTrades((prev) => [...prev, ...data.trades]);
      const data = await resp.json();
      const resp = await fetch(`/api/bse-mock/trades?${params}`);
      params.append('limit', '200');
      if (cursor) params.append('cursor', cursor);
      const params = new URLSearchParams();
    try {
    loadingRef.current = true;
    if (loadingRef.current) return;
  const fetchChunk = async () => {

  const loadingRef = useRef(false);
  const [cursor, setCursor] = useState(null);
  const [trades, setTrades] = useState([]);
export default function BseTrades() {

import React, { useEffect, useState, useRef } from 'react';
