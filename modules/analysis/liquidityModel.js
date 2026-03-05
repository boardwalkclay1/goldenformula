// liquidityModel.js
// Golden Formula — Liquidity & Level Intelligence Engine

export function analyzeLiquidity(candles) {
  if (candles.length < 20) return basicLiquidity();

  const volumes = candles.map(c => c.volume || 0);
  const last = candles[candles.length - 1];

  const avgVol20 = average(volumes.slice(-20));
  const avgVol5 = average(volumes.slice(-5));

  const relVolume = avgVol5 / (avgVol20 || 1);

  const price = last.close;
  const tickSize = inferTickSize(price);

  const nearest1 = Math.round(price);
  const nearest5 = Math.round(price / 5) * 5;
  const nearest10 = Math.round(price / 10) * 10;

  const distanceTo1 = price - nearest1;
  const distanceTo5 = price - nearest5;
  const distanceTo10 = price - nearest10;

  return {
    avgVol20,
    avgVol5,
    relVolume, // >1 = elevated, <1 = weak
    tickSize,
    price,
    nearest1,
    nearest5,
    nearest10,
    distanceTo1,
    distanceTo5,
    distanceTo10,
    nearWhole: Math.abs(distanceTo1) <= tickSize * 2,
    nearFive: Math.abs(distanceTo5) <= tickSize * 3,
    nearTen: Math.abs(distanceTo10) <= tickSize * 4,
  };
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Small numbers move by cents, big by dollars
function inferTickSize(price) {
  if (price < 5) return 0.01;
  if (price < 20) return 0.05;
  if (price < 100) return 0.10;
  if (price < 300) return 0.25;
  return 0.50;
}

function basicLiquidity() {
  return {
    avgVol20: 0,
    avgVol5: 0,
    relVolume: 0,
    tickSize: 0.01,
    price: 0,
    nearest1: 0,
    nearest5: 0,
    nearest10: 0,
    distanceTo1: 0,
    distanceTo5: 0,
    distanceTo10: 0,
    nearWhole: false,
    nearFive: false,
    nearTen: false,
  };
}
