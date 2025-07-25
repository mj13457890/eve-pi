const axios = require('axios');
const readline = require('readline-sync');

const REGION_ID = 10000002; // 지타(FORGE) 리전 ID

// 주요 지타 스테이션들
const JITA_STATIONS = {
  '1': { id: 60003760, name: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant' },
  '2': { id: null, name: '전체 지타 리전' }
};

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

// 마켓 히스토리 조회 (과거 30일 데이터)
async function getMarketHistory(typeId) {
  const url = `https://esi.evetech.net/latest/markets/${REGION_ID}/history/?type_id=${typeId}`;
  const res = await axios.get(url);
  const historyData = res.data;
  
  if (historyData.length === 0) {
    return {
      avgPrice: 0,
      highestPrice: 0,
      lowestPrice: 0,
      avgVolume: 0,
      totalVolume: 0,
      dataPoints: 0
    };
  }

  // 최근 30일 데이터만 추출
  const last30Days = historyData.slice(-30);
  
  // 가격 통계 계산
  const prices = last30Days.map(day => day.average);
  const volumes = last30Days.map(day => day.volume);
  
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const highestPrice = Math.max(...last30Days.map(day => day.highest));
  const lowestPrice = Math.min(...last30Days.map(day => day.lowest));
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

  return {
    avgPrice,
    highestPrice,
    lowestPrice,
    avgVolume,
    totalVolume,
    dataPoints: last30Days.length,
    dailyData: last30Days // 전체 30일 데이터
  };
}

// 지타 지역 시장 가격 정보 → 최고 매수 / 최저 매도
async function getJitaMarketOrders(typeId, stationId = null) {
  let url = `https://esi.evetech.net/latest/markets/${REGION_ID}/orders/?type_id=${typeId}`;
  
  const res = await axios.get(url);
  let orders = res.data;

  // 특정 스테이션 필터링
  if (stationId) {
    orders = orders.filter(o => o.location_id === stationId);
  }

  const buyOrders = orders.filter(o => o.is_buy_order);
  const sellOrders = orders.filter(o => !o.is_buy_order);

  if (buyOrders.length === 0 && sellOrders.length === 0) {
    const locationName = stationId ? '해당 스테이션' : '지타';
    throw new Error(`${locationName}에 활성 주문이 없습니다.`);
  }

  const highestBuy = buyOrders.length > 0 ? Math.max(...buyOrders.map(o => o.price)) : 0;
  const lowestSell = sellOrders.length > 0 ? Math.min(...sellOrders.map(o => o.price)) : 0;

  // 주문 수와 총 거래량 계산
  const buyOrderCount = buyOrders.length;
  const sellOrderCount = sellOrders.length;
  const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.volume_remain, 0);
  const totalSellVolume = sellOrders.reduce((sum, order) => sum + order.volume_remain, 0);

  return {
    highestBuy,
    lowestSell,
    buyOrderCount,
    sellOrderCount,
    totalBuyVolume,
    totalSellVolume
  };
}

(async () => {
  console.log('=== EVE Online 지타 마켓 조회 도구 ===\n');
  
  // 스테이션 선택
  console.log('조회할 위치를 선택하세요:');
  Object.entries(JITA_STATIONS).forEach(([key, station]) => {
    console.log(`${key}. ${station.name}`);
  });
  
  const stationChoice = readline.question('\n선택 (1-2): ');
  const selectedStation = JITA_STATIONS[stationChoice];
  
  if (!selectedStation) {
    console.log('❌ 잘못된 선택입니다.');
    return;
  }
  
  const itemName = readline.question('\n아이템 이름을 입력하세요: ');
  
  try {
    const typeId = await getTypeId(itemName);
    const [prices, itemDetails, marketHistory] = await Promise.all([
      getJitaMarketOrders(typeId, selectedStation.id),
      getItemDetails(typeId),
      getMarketHistory(typeId) // 히스토리는 여전히 전체 리전 기준
    ]);
    
    console.log(`\n[${itemName}] - ${selectedStation.name}`);
    if (prices.highestBuy > 0) {
      console.log(`- 최고 매수가: ${prices.highestBuy.toLocaleString()} ISK`);
    } else {
      console.log(`- 최고 매수가: 매수 주문 없음`);
    }
    
    if (prices.lowestSell > 0) {
      console.log(`- 최저 매도가: ${prices.lowestSell.toLocaleString()} ISK`);
    } else {
      console.log(`- 최저 매도가: 매도 주문 없음`);
    }
    
    console.log(`- 부피(Volume): ${itemDetails.volume.toLocaleString()} m³`);
    
    console.log(`\n📊 주문 현황:`);
    console.log(`- 매수 주문 수: ${prices.buyOrderCount}개`);
    console.log(`- 매수 주문 총량: ${prices.totalBuyVolume.toLocaleString()}개`);
    console.log(`- 매도 주문 수: ${prices.sellOrderCount}개`);
    console.log(`- 매도 주문 총량: ${prices.totalSellVolume.toLocaleString()}개`);
    
    // 히스토리 데이터 표시
    if (marketHistory.dataPoints > 0) {
      console.log(`\n📈 과거 ${marketHistory.dataPoints}일 통계:`);
      console.log(`- 평균 가격: ${marketHistory.avgPrice.toLocaleString()} ISK`);
      console.log(`- 최고 가격: ${marketHistory.highestPrice.toLocaleString()} ISK`);
      console.log(`- 최저 가격: ${marketHistory.lowestPrice.toLocaleString()} ISK`);
      console.log(`- 일평균 거래량: ${Math.round(marketHistory.avgVolume).toLocaleString()}개`);
      console.log(`- 총 거래량: ${marketHistory.totalVolume.toLocaleString()}개`);
      
      // 최근 30일 일별 데이터 (표 형태)
      if (marketHistory.dailyData.length > 0) {
        console.log(`\n📅 최근 30일 거래 추이:`);
        console.log('┌─────────────┬───────────────┬───────────────┬───────────────┬──────────────┐');
        console.log('│    날짜     │   평균 가격   │   최고 가격   │   최저 가격   │   거래량     │');
        console.log('├─────────────┼───────────────┼───────────────┼───────────────┼──────────────┤');
        
        marketHistory.dailyData.forEach((day) => {
          const date = new Date(day.date).toLocaleDateString('ko-KR', { 
            month: '2-digit', 
            day: '2-digit' 
          });
          const avg = day.average.toLocaleString().padStart(12);
          const high = day.highest.toLocaleString().padStart(12);
          const low = day.lowest.toLocaleString().padStart(12);
          const vol = day.volume.toLocaleString().padStart(11);
          
          console.log(`│ ${date.padEnd(10)} │ ${avg} │ ${high} │ ${low} │ ${vol} │`);
        });
        
        console.log('└─────────────┴───────────────┴───────────────┴───────────────┴──────────────┘');
      }
    } else {
      console.log(`\n📈 히스토리 데이터가 없습니다.`);
    }
    
  } catch (err) {
    console.error('\n❌ 에러:', err.message);
  }
})();
