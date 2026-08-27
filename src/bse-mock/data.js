module.exports={generateTrades};

}
  return trades;
  for(let i=0;i<count;i++) trades.push(generateTrade(i+1));
  const trades=[];
function generateTrades(count){
// Generate an array of trades

}
  };
    timestamp:new Date().toISOString()
    side:faker.random.arrayElement(['BUY','SELL']),
    price:parseFloat(faker.finance.amount(10,500,2)),
    quantity:faker.datatype.number({min:1,max:1000}),
    symbol:faker.finance.currencySymbol(),
    tradeId:`BSE-${id}`,
  return {
function generateTrade(id){
// Helper to generate a realistic BSE trade object

const faker = require('faker');
