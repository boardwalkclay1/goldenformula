// /modules/helpers.js
export function nearestEven(price) { return Math.round(price / 5) * 5; }
export function nextEvenUp(price)  { return Math.ceil(price / 5) * 5; }
export function nextEvenDown(p)   { return Math.floor(p / 5) * 5; }
