import {
  getProductById,
  saveProduct,
  getRequiredItems,
  getAvailableModuleCount,
  getNewVersionItems,
  getNewVersionRate,
  getCompletionRate
} from "./data.js";

const productId = new URLSearchParams(window.location.search).get("id");

let product = null;

let openedModules = {
  "Module 1": false,
  "Module 2": false,
  "Module 3": false,
  "Module 4": false,
  "Module 5": false
};

async function init() {
  product = await getProductById(productId);

  if (!product) {
    alert("해당 품목을 찾을 수 없습니다.");
    location.href = "index.html";
    return;
  }

  renderSummary();
  renderModules();
}

function renderSummary() {
  const requiredCount = getRequiredItems(product).length;
  const availableCount = getAvailableModuleCount(product);
  const newVersionCount = getNewVersionItems(product).length;

  document.getElementById("productName").textContent = product.productName;

  document.getElementById("productMeta").textContent =
    `${product.approvalNumber || "허가번호 없음"} · ${product.ctdConverted ? "CTD 전환" : "CTD 미전환"} · ${product.status || "허가 상태 없음"}`;

  document.getElementById("completionRate").textContent =
    `${getCompletionRate(product)}% (${availableCount}/${requiredCount})`;

  document.getElementById("newVersionRate").textContent =
    `${getNewVersionRate(product)}% (${newVersionCount}/${requiredCount})`;

  document.getElementById("manufacturingType").textContent = product.manufacturingType || "-";
  document.getElementById("contractorManufacturer").textContent = product.contractorManufacturer || "-";
  document.getElementById("dosageForm").textContent = product.dosageForm || "-";
}

async function saveCurrentProduct() {
  await saveProduct(product);
}

function getItemsByModule() {
  return product.ctdItems.reduce((groups, item, index) => {
    if (!groups[item.module]) groups[item.module] = [];
    groups[item.module].push({ ...item, index });
    return groups;
  }, {});
}

async function setModuleRequired(moduleName, checked) {
  product.ctdItems.forEach(item => {
    if (item.module === moduleName) item.required = checked;
  });

  await saveCurrentProduct();
  renderSummary();
  renderModules();
}

async function setModuleAvailable(moduleName, checked) {
  product.ctdItems.forEach(item => {
    if (item.module === moduleName) item.available = checked;
  });

  await saveCurrentProduct();
  renderSummary();
  renderModules();
}

function renderModules() {
  const container = document.getElementById("moduleContainer");
  container.innerHTML = "";

  const groups = getItemsByModule();

  Object.entries(groups).forEach(([moduleName, items]) => {
    const requiredItems = items.filter(item => item.required);
    const availableRequiredItems = requiredItems.filter(item => item.available);
    const newVersionRequiredItems = requiredItems.filter(item => item.ctdVersionStatus === "신버전");
    const optionalItems = items.filter(item => !item.required);

    const isOpen = openedModules[moduleName];
    const visibleItems = isOpen ? items : requiredItems;

    const allRequiredChecked = items.length > 0 && items.every(item => item.required);
    const allAvailableChecked = items.length > 0 && items.every(item => item.available);

    const moduleCompletionRate = requiredItems.length === 0
      ? 0
      : Math.round((availableRequiredItems.length / requiredItems.length) * 100);

    const moduleNewVersionRate = requiredItems.length === 0
      ? 0
      : Math.round((newVersionRequiredItems.length / requiredItems.length) * 100);

    const moduleBlock = document.createElement("div");

    moduleBlock.innerHTML = `
      <div class="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center gap-3">
        <button class="text-left" data-module-toggle="${moduleName}">
          <p class="font-semibold">${moduleName}</p>
          <p class="text-sm text-slate-500">
            필수 구비율 ${availableRequiredItems.length}/${requiredItems.length} (${moduleCompletionRate}%)
            · 신버전 ${newVersionRequiredItems.length}/${requiredItems.length} (${moduleNewVersionRate}%)
            · 선택 항목 ${optionalItems.length}개
          </p>
        </button>

        <button
          class="px-3 py-1.5 rounded-lg border text-xs text-slate-600 hover:bg-white"
          data-module-toggle="${moduleName}"
        >
          ${isOpen ? "선택 항목 숨기기 ▲" : "선택 항목 보기 ▼"}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm table-fixed">
          <thead class="bg-white text-slate-600 border-y">
            <tr>
              <th class="px-4 py-3 text-left w-[110px]">코드</th>
              <th class="px-4 py-3 text-left min-w-[360px]">제목</th>

              <th class="px-4 py-3 text-center w-[110px]">
                <div class="flex items-center justify-center gap-2">
                  <span>필수</span>
                  <input
                    type="checkbox"
                    class="module-required-toggle w-4 h-4 accent-rose-600 cursor-pointer"
                    data-module="${moduleName}"
                    ${allRequiredChecked ? "checked" : ""}
                  />
                </div>
              </th>

              <th class="px-4 py-3 text-left w-[150px]">현재 CTD 버전</th>
              <th class="px-4 py-3 text-left w-[150px]">개정일</th>

              <th class="px-4 py-3 text-center w-[130px]">
                <div class="flex items-center justify-center gap-2">
                  <span>구비 완료</span>
                  <input
                    type="checkbox"
                    class="module-available-toggle w-4 h-4 accent-emerald-600 cursor-pointer"
                    data-module="${moduleName}"
                    ${allAvailableChecked ? "checked" : ""}
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            ${visibleItems.map(item => `
              <tr class="${item.required ? "bg-white" : "bg-slate-50"} hover:bg-slate-100">
                <td class="px-4 py-4 font-medium whitespace-nowrap">${item.code}</td>

                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <span class="break-keep leading-relaxed">${item.title}</span>
                    ${
                      item.required
                        ? `<span class="shrink-0 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">필수</span>`
                        : `<span class="shrink-0 px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-600">선택</span>`
                    }
                  </div>
                </td>

                <td class="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    class="required-checkbox w-5 h-5 accent-rose-600 cursor-pointer"
                    data-index="${item.index}"
                    ${item.required ? "checked" : ""}
                  />
                </td>

                <td class="px-4 py-4">
                  <select
                    class="version-status-select w-full border rounded-lg px-2 py-1 ${
                      item.ctdVersionStatus === "신버전"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }"
                    data-index="${item.index}"
                  >
                    <option value="구버전" ${item.ctdVersionStatus === "구버전" ? "selected" : ""}>구버전</option>
                    <option value="신버전" ${item.ctdVersionStatus === "신버전" ? "selected" : ""}>신버전</option>
                  </select>
                </td>

                <td class="px-4 py-4">
                  <input
                    type="date"
                    class="revision-date-input w-full border rounded-lg px-2 py-1"
                    data-index="${item.index}"
                    value="${item.revisionDate || ""}"
                  />
                </td>

                <td class="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    class="available-checkbox w-5 h-5 accent-emerald-600 cursor-pointer"
                    data-index="${item.index}"
                    ${item.available ? "checked" : ""}
                  />
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(moduleBlock);
  });

  bindEvents();
}

function generateReportHtml() {
  const requiredCount = getRequiredItems(product).length;
  const availableCount = getAvailableModuleCount(product);
  const newVersionCount = getNewVersionItems(product).length;
  const groups = getItemsByModule();
  const today = new Date().toISOString().slice(0, 10);

  const moduleSections = Object.entries(groups).map(([moduleName, items]) => {
    const rows = items.map(item => `
      <tr>
        <td>${item.code}</td>
        <td>${item.title}</td>
        <td>${item.required ? "필수" : "선택"}</td>
        <td>${item.ctdVersionStatus || "구버전"}</td>
        <td>${item.revisionDate || "-"}</td>
        <td>${item.available ? "구비" : "미구비"}</td>
      </tr>
    `).join("");

    return `
      <h2>${moduleName}</h2>
      <table>
        <thead>
          <tr>
            <th>코드</th>
            <th>제목</th>
            <th>필수여부</th>
            <th>현재 CTD 버전</th>
            <th>개정일</th>
            <th>구비현황</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <title>CTD 구비현황 보고서</title>
      <style>
        body {
          font-family: Arial, "Malgun Gothic", sans-serif;
          color: #111827;
          padding: 32px;
          font-size: 12px;
        }

        h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }

        h2 {
          font-size: 16px;
          margin-top: 28px;
          margin-bottom: 8px;
          border-bottom: 2px solid #334155;
          padding-bottom: 6px;
        }

        .meta {
          color: #475569;
          margin-bottom: 24px;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin: 20px 0;
        }

        .card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
        }

        .card-title {
          color: #64748b;
          font-size: 11px;
        }

        .card-value {
          font-size: 18px;
          font-weight: bold;
          margin-top: 4px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #cbd5e1;
          padding: 7px;
          vertical-align: top;
          word-break: keep-all;
        }

        th {
          background: #f1f5f9;
          font-weight: bold;
        }

        th:nth-child(1), td:nth-child(1) { width: 90px; }
        th:nth-child(2), td:nth-child(2) { width: auto; }
        th:nth-child(3), td:nth-child(3) { width: 70px; text-align: center; }
        th:nth-child(4), td:nth-child(4) { width: 95px; text-align: center; }
        th:nth-child(5), td:nth-child(5) { width: 90px; text-align: center; }
        th:nth-child(6), td:nth-child(6) { width: 80px; text-align: center; }

        @media print {
          body { padding: 20px; }
          h2 { page-break-after: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <h1>CTD 구비현황 보고서</h1>
      <div class="meta">보고서 출력일: ${today}</div>

      <h2>품목 정보</h2>
      <table>
        <tbody>
          <tr>
            <th>품목명</th>
            <td>${product.productName}</td>
            <th>허가번호</th>
            <td>${product.approvalNumber || "-"}</td>
          </tr>
          <tr>
            <th>제조구분</th>
            <td>${product.manufacturingType || "-"}</td>
            <th>수탁제조사</th>
            <td>${product.contractorManufacturer || "-"}</td>
          </tr>
          <tr>
            <th>제형</th>
            <td>${product.dosageForm || "-"}</td>
            <th>CTD 전환</th>
            <td>${product.ctdConverted ? "CTD 전환" : "CTD 미전환"}</td>
          </tr>
          <tr>
            <th>허가 상태</th>
            <td colspan="3">${product.status || "-"}</td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <div class="card">
          <div class="card-title">필수 항목 구비율</div>
          <div class="card-value">${getCompletionRate(product)}%</div>
          <div>${availableCount}/${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">신버전 반영률</div>
          <div class="card-value">${getNewVersionRate(product)}%</div>
          <div>${newVersionCount}/${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">필수 항목 수</div>
          <div class="card-value">${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">전체 CTD 항목 수</div>
          <div class="card-value">${product.ctdItems.length}</div>
        </div>
      </div>

      ${moduleSections}
    </body>
    </html>
  `;
}

function printPdfReport() {
  const reportWindow = window.open("", "_blank");
  reportWindow.document.open();
  reportWindow.document.write(generateReportHtml());
  reportWindow.document.close();

  reportWindow.onload = function () {
    reportWindow.focus();
    reportWindow.print();
  };
}

function bindEvents() {
  document.querySelectorAll("[data-module-toggle]").forEach(button => {
    button.addEventListener("click", event => {
      const moduleName = event.currentTarget.dataset.moduleToggle;
      openedModules[moduleName] = !openedModules[moduleName];
      renderModules();
    });
  });

  document.querySelectorAll(".module-required-toggle").forEach(checkbox => {
    checkbox.addEventListener("change", async event => {
      const moduleName = event.target.dataset.module;
      await setModuleRequired(moduleName, event.target.checked);
    });
  });

  document.querySelectorAll(".module-available-toggle").forEach(checkbox => {
    checkbox.addEventListener("change", async event => {
      const moduleName = event.target.dataset.module;
      await setModuleAvailable(moduleName, event.target.checked);
    });
  });

  document.querySelectorAll(".required-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async event => {
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].required = event.target.checked;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });

  document.querySelectorAll(".version-status-select").forEach(select => {
    select.addEventListener("change", async event => {
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].ctdVersionStatus = event.target.value;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });

  document.querySelectorAll(".revision-date-input").forEach(input => {
    input.addEventListener("change", async event => {
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].revisionDate = event.target.value;

      await saveCurrentProduct();
    });
  });

  document.querySelectorAll(".available-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async event => {
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].available = event.target.checked;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });
}

document.getElementById("printReportBtn").addEventListener("click", printPdfReport);

init();