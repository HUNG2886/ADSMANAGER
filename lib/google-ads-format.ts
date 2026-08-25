export function formatCustomerId(value:string){const id=value.replace(/\D/g,'');return id.length===10?`${id.slice(0,3)}-${id.slice(3,6)}-${id.slice(6)}`:id;}
export function formatNumber(value:number|bigint){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value);}
export function formatMoney(value:number,currency='VND'){return new Intl.NumberFormat('vi-VN',{style:'currency',currency,maximumFractionDigits:currency==='VND'?0:2}).format(value);}
