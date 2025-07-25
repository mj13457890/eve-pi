const axios = require('axios');
const readline = require('readline-sync');

const REGION_ID = 10000002; // 지타(FORGE) 리전 ID

// 아이템 이름 → 타입 ID
async function getTypeId(itemName) {
  const res = await axios.post(
    'https://esi.evetech.net/latest/universe/ids/',
    [itemName],
    { headers: { 'Content-Type': 'application/json' } }
  );
  const item = res.data.inventory_types?.[0];
  if (!item) throw new Error('아이템을 찾을 수 없습니다.');
  return item.id;
}

// 아이템 상세 정보 조회 (volume 포함)
async function getItemDetails(typeId) {
  const url = `https://esi.evetech.net/latest/universe/types/${typeId}/`;
  const res = await axios.get(url);
  return res.data;
}

// 지타 지역 시장 가격 정보 → 최고 매수 / 최저 매도
async function getJitaMarketOrders(typeId) {
  const url = `https://esi.evetech.net/latest/markets/${REGION_ID}/orders/?type_id=${typeId}`;
  const res = await axios.get(url);
  const orders = res.data;

  const buyOrders = orders.filter(o => o.is_buy_order);
  const sellOrders = orders.filter(o => !o.is_buy_order);

  if (buyOrders.length === 0 && sellOrders.length === 0)
    throw new Error('지타에 활성 주문이 없습니다.');

  const highestBuy = Math.max(...buyOrders.map(o => o.price));
  const lowestSell = Math.min(...sellOrders.map(o => o.price));

  return {
    highestBuy,
    lowestSell
  };
}

(async () => {
  const itemName = readline.question('아이템 이름을 입력하세요: ');
  try {
    const typeId = await getTypeId(itemName);
    const [prices, itemDetails] = await Promise.all([
      getJitaMarketOrders(typeId),
      getItemDetails(typeId)
    ]);
    
    console.log(`\n[${itemName}] - 지타 시세`);
    console.log(`- 최고 매수가: ${prices.highestBuy.toLocaleString()} ISK`);
    console.log(`- 최저 매도가: ${prices.lowestSell.toLocaleString()} ISK`);
    console.log(`- 부피(Volume): ${itemDetails.volume.toLocaleString()} m³`);
    
  } catch (err) {
    console.error('\n❌ 에러:', err.message);
  }
})();
