const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ITC', 'SBIN'];

function generateTrade(id) {
  return {
    trade_id: `BSE_${10000000 + id}`,
    client_id: `CLI_${1000 + (id % 6)}`,
    client_name: `BSE Client ${1 + (id % 6)}`,
    symbol: symbols[id % symbols.length],
    quantity: ((id % 15) + 1) * 25,
    price: Number((500 + (id % 2500) + ((id % 20) - 10) * 0.5).toFixed(2)),
    order_type: id % 3 === 0 ? 'SELL' : 'BUY',
    trade_timestamp: new Date(Date.now() - id * 1000).toISOString(),
  };
}

function generateTrades(count) {
  return Array.from({ length: count }, (_, index) => generateTrade(index + 1));
}

module.exports = { generateTrade, generateTrades };
