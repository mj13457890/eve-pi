const fetch = require('node-fetch');

const REGION_ID = 10000002; // The Forge
const STATION_ID = 60003760; // Jita 4-4 정거장

async function getTypeId(itemName) {
  const encodedName = encodeURIComponent(itemName);
  const url = `https://esi.evetech.net/latest/search/?categories=inventory_type&search=${encodedName}&strict=true`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.inventory_type || data.inventory_type.length === 0) {
    throw new Error(`아이템 "${itemName}" 을(를) 찾을 수 없습니다.`);
  }

  return data.inventory_type[0]; // 첫 번째 type_id 반환
}

async function getJitaLowestSellPrice(typeId) {
  const url = `https://esi.evetech.net/latest/markets/${REGION_ID}/orders/?order_type=sell&type_id=${typeId}`;

  const response = await fetch(url);
  const data = await response.json();

  // location_id가 지타 4-4인 주문만 필터링
  const jitaOrders = data.filter(order => order.location_id === STATION_ID);

  if (jitaOrders.length === 0) {
    throw new Error(`지타 4-4에 해당 아이템의 판매 주문이 없습니다.`);
  }

  // 가격 오름차순 정렬 후 최저가 반환
  jitaOrders.sort((a, b) => a.price - b.price);

  return jitaOrders[0].price;
}

async function main(itemName) {
  try {
    const typeId = await getTypeId(itemName);
    const lowestPrice = await getJitaLowestSellPrice(typeId);

    console.log(`"${itemName}"의 지타 4-4 최저가는 ${lowestPrice.toLocaleString()} ISK입니다.`);
  } catch (error) {
    console.error("오류:", error.message);
  }
}

// 예시: 사용자가 직접 입력
const itemName = 'Tritanium'; // 여기를 원하는 아이템 이름으로 바꿔도 됨
main(itemName);
