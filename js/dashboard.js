import { requireLogin, injectAuthBar } from "./auth.js";
import { subscribeProducts, getCompletionRate, isComplete } from "./data.js";

if (!(await requireLogin())) throw new Error("Login required");
injectAuthBar();

let completionChart = null;
let conversionChart = null;

const labelPlugin = { id: "labelPlugin", afterDatasetsDraw(chart) { const {ctx}=chart; const data=chart.data.datasets[0].data; const total=data.reduce((a,b)=>a+b,0); chart.getDatasetMeta(0).data.forEach((arc,i)=>{ if(!data[i]) return; const p=arc.tooltipPosition(); ctx.save(); ctx.fillStyle="#0f172a"; ctx.font="bold 13px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(`${data[i]}개`,p.x,p.y-7); ctx.font="12px Arial"; ctx.fillText(`${total?Math.round(data[i]/total*100):0}%`,p.x,p.y+9); ctx.restore(); }); }};
const own=p=>["자사제조","자사 제조","자사"].includes(String(p.manufacturingType||"").trim());
const contract=p=>["위탁제조","위탁 제조","위탁품목","위탁 품목","위탁"].includes(String(p.manufacturingType||"").trim());
const converted=p=>p.ctdConverted===true||String(p.ctdConverted).toLowerCase()==="true";

function render(products){
 const ownProducts=products.filter(own), contractProducts=products.filter(contract);
 const complete=ownProducts.filter(isComplete).length, incomplete=ownProducts.length-complete;
 const convertedCount=ownProducts.filter(converted).length, notConverted=ownProducts.length-convertedCount;
 const avg=ownProducts.length?Math.round(ownProducts.reduce((s,p)=>s+getCompletionRate(p),0)/ownProducts.length):0;
 document.getElementById("totalProducts").textContent=ownProducts.length;
 document.getElementById("convertedProducts").textContent=convertedCount;
 document.getElementById("averageCompletionRate").textContent=`${avg}%`;
 document.getElementById("contractTotalProducts").textContent=contractProducts.length;
 document.getElementById("contractConvertedProducts").textContent=contractProducts.filter(converted).length;
 if(completionChart) completionChart.destroy(); if(conversionChart) conversionChart.destroy();
 completionChart=new Chart(document.getElementById("completionChart"),{type:"doughnut",data:{labels:["구비 완료","미완료"],datasets:[{data:[complete,incomplete],backgroundColor:["#10b981","#e2e8f0"]}]},options:{cutout:"58%",plugins:{legend:{position:"bottom"}}},plugins:[labelPlugin]});
 conversionChart=new Chart(document.getElementById("conversionChart"),{type:"doughnut",data:{labels:["CTD 전환","CTD 미전환"],datasets:[{data:[convertedCount,notConverted],backgroundColor:["#2563eb","#f59e0b"]}]},options:{cutout:"58%",plugins:{legend:{position:"bottom"}}},plugins:[labelPlugin]});
}
subscribeProducts(render);
