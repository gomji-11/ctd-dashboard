import { requireLogin, injectAuthBar } from "./auth.js";
import { subscribeProducts, getCompletionRate } from "./data.js";

if (!(await requireLogin())) throw new Error("Login required");
injectAuthBar();

const charts = {};
const own = product => ["자사제조", "자사 제조", "자사"].includes(String(product.manufacturingType || "").trim());
const contract = product => ["위탁제조", "위탁 제조", "위탁품목", "위탁 품목", "위탁"].includes(String(product.manufacturingType || "").trim());
const converted = product => product.ctdConverted === true || String(product.ctdConverted).toLowerCase() === "true";

Chart.defaults.color = "#64748b";
Chart.defaults.font.family = "Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif";

const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart) {
    if (chart.config.type !== "doughnut") return;
    const values = chart.data.datasets[0].data;
    const total = values.reduce((sum, value) => sum + value, 0);
    const { ctx, chartArea: { left, right, top, bottom } } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("전체", (left + right) / 2, (top + bottom) / 2 - 5);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 22px sans-serif";
    ctx.fillText(`${total}개`, (left + right) / 2, (top + bottom) / 2 + 23);
    ctx.restore();
  }
};

function replaceChart(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function render(products) {
  const ownProducts = products.filter(own);
  const contractProducts = products.filter(contract);
  const ownConvertedCount = ownProducts.filter(converted).length;
  const contractConvertedCount = contractProducts.filter(converted).length;
  const averageRate = products.length
    ? Math.round(products.reduce((sum, product) => sum + getCompletionRate(product), 0) / products.length)
    : 0;

  document.getElementById("allProducts").firstChild.nodeValue = products.length;
  document.getElementById("totalProducts").firstChild.nodeValue = ownProducts.length;
  document.getElementById("convertedProducts").firstChild.nodeValue = ownConvertedCount;
  document.getElementById("contractConvertedProducts").firstChild.nodeValue = contractConvertedCount;
  document.getElementById("averageCompletionRate").textContent = `${averageRate}%`;
  document.getElementById("conversionSummary").textContent = ownProducts.length
    ? `자사 품목의 ${Math.round(ownConvertedCount / ownProducts.length * 100)}%`
    : "자사 품목 기준";
  document.getElementById("contractConversionSummary").textContent = contractProducts.length
    ? `위탁 품목의 ${Math.round(contractConvertedCount / contractProducts.length * 100)}%`
    : "위탁 품목 중 CTD 전환";

  const commonLegend = { position: "right", labels: { usePointStyle: true, boxWidth: 9, padding: 18 } };
  replaceChart("conversionChart", {
    type: "doughnut",
    data: { labels: ["전환 완료", "전환 미완료"], datasets: [{ data: [ownConvertedCount, ownProducts.length - ownConvertedCount], backgroundColor: ["#2474e5", "#dce3ec"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "66%", plugins: { legend: commonLegend, tooltip: { callbacks: { label: item => ` ${item.label}: ${item.raw}개` } } } },
    plugins: [centerTextPlugin]
  });

  const ranges = [0, 0, 0, 0];
  products.forEach(product => {
    const rate = getCompletionRate(product);
    ranges[rate <= 25 ? 0 : rate <= 50 ? 1 : rate <= 75 ? 2 : 3] += 1;
  });
  replaceChart("completionChart", {
    type: "bar",
    data: { labels: ["0~25%", "25~50%", "50~75%", "75~100%"], datasets: [{ label: "품목 수", data: ranges, backgroundColor: ["#bdd7fb", "#82b5f4", "#4c92eb", "#2474e5"], borderRadius: 7, maxBarThickness: 58 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } } } }
  });

  replaceChart("typeChart", {
    type: "doughnut",
    data: { labels: ["자사", "위탁", "미분류"], datasets: [{ data: [ownProducts.length, contractProducts.length, Math.max(0, products.length - ownProducts.length - contractProducts.length)], backgroundColor: ["#2474e5", "#8b5cf6", "#dce3ec"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "66%", plugins: { legend: commonLegend } },
    plugins: [centerTextPlugin]
  });

  const ownConverted = ownProducts.filter(converted).length;
  const contractConverted = contractProducts.filter(converted).length;
  replaceChart("typeConversionChart", {
    type: "bar",
    data: { labels: ["자사 품목", "위탁 품목"], datasets: [
      { label: "CTD 전환", data: [ownConverted, contractConverted], backgroundColor: "#2474e5", borderRadius: 6, maxBarThickness: 54 },
      { label: "CTD 미전환", data: [ownProducts.length - ownConverted, contractProducts.length - contractConverted], backgroundColor: "#dce3ec", borderRadius: 6, maxBarThickness: 54 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 9 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } } } }
  });
}

subscribeProducts(render);
