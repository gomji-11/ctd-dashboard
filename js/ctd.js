import {
  requireLogin,
  injectAuthBar,
  canEditData
} from "./auth.js";

import {
  createCtdItems,
  generateProductId,
  saveProduct,
  deleteProductById,
  subscribeProducts,
  getRequiredItems,
  getAvailableModuleCount,
  getNewVersionItems,
  getNewVersionRate,
  isComplete,
  getCompletionRate
} from "./data.js";

if (!(await requireLogin())) {
  throw new Error("Login required");
}

injectAuthBar();

let products = [];
let activeManufacturingType = "자사제조";

function normalizeManufacturingType(product) {
  const value = String(product.manufacturingType || "").trim();
  if (["자사제조", "자사 제조", "자사"].includes(value)) return "자사제조";
  if (["위탁제조", "위탁 제조", "위탁품목", "위탁 품목", "위탁"].includes(value)) return "위탁제조";
  return value;
}

function getFilteredProducts() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const ctd = document.getElementById("ctdFilter").value;
  const status = document.getElementById("statusFilter").value;

  return products.filter(product => {
    const searchTarget = [product.productName, product.approvalNumber, product.contractorManufacturer].join(" ").toLowerCase();
    const matchesType = normalizeManufacturingType(product) === activeManufacturingType;
    const matchesKeyword = !keyword || searchTarget.includes(keyword);
    const matchesCtd = !ctd || String(product.ctdConverted) === ctd;
    let matchesStatus = true;
    if (status === "none") matchesStatus = !product.status;
    else if (status) matchesStatus = product.status === status;
    return matchesType && matchesKeyword && matchesCtd && matchesStatus;
  }).sort((a, b) => String(a.productName || "").localeCompare(String(b.productName || ""), "ko"));
}


function applyRoleToDashboard() {
  const editMode = canEditData();

  const adminOnlyElements = [
    document.getElementById("openAddModalBtn"),
    document.getElementById("backupDataBtn"),
    document.getElementById("downloadCsvBtn"),
    document.getElementById("importDataInput")?.closest("label")
  ];

  adminOnlyElements.forEach(element => {
    if (!element) return;
    element.classList.toggle("hidden", !editMode);
  });

  document.querySelectorAll(".admin-action").forEach(element => {
    element.classList.toggle("hidden", !editMode);
  });
}

function isCtdConvertedProduct(product) {
  return product.ctdConverted === true || String(product.ctdConverted).toLowerCase() === "true";
}

function renderPage() {
  const ownCount = products.filter(product => normalizeManufacturingType(product) === "자사제조").length;
  const contractCount = products.filter(product => normalizeManufacturingType(product) === "위탁제조").length;
  document.getElementById("ownTabCount").textContent = ownCount;
  document.getElementById("contractTabCount").textContent = contractCount;
  renderProductTable();
  applyRoleToDashboard();
}


function renderProductTable() {
  const tableBody = document.getElementById("productTableBody");
  tableBody.innerHTML = "";

  const filteredProducts = getFilteredProducts();

  if (filteredProducts.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="px-6 py-10 text-center text-slate-500">
          검색 조건에 해당하는 품목이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  filteredProducts.forEach(product => {
    const availableCount = getAvailableModuleCount(product);
    const requiredCount = getRequiredItems(product).length;
    const completionRate = getCompletionRate(product);
    const newVersionCount = getNewVersionItems(product).length;
    const newVersionRate = getNewVersionRate(product);
    const manufacturingType = normalizeManufacturingType(product);
    const ctdConverted = isCtdConvertedProduct(product);

    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50";

    row.innerHTML = `
      <td class="px-5 py-6 align-middle w-[260px]">
        <a href="detail.html?id=${product.productId}" class="text-blue-600 hover:underline font-medium whitespace-normal break-words leading-5 block" title="${product.productName}">
          ${product.productName}
        </a>
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        ${product.approvalNumber || "-"}
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
          manufacturingType === "자사제조"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-purple-100 text-purple-700"
        }">
          ${manufacturingType || "-"}
        </span>
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        ${product.contractorManufacturer || "-"}
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        ${product.dosageForm || "-"}
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
          ctdConverted
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"
        }">
          ${ctdConverted ? "CTD 전환" : "CTD 미전환"}
        </span>
      </td>

      <td class="px-4 py-6 text-center align-middle">
        <div class="w-[110px] mx-auto">
          <div class="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div class="bg-emerald-500 h-2 rounded-full" style="width: ${completionRate}%"></div>
          </div>
          <div class="text-slate-600 whitespace-nowrap">
            ${availableCount}/${requiredCount} (${completionRate}%)
          </div>
        </div>
      </td>

      <td class="px-4 py-6 text-center align-middle">
        <div class="w-[110px] mx-auto">
          <div class="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div class="bg-blue-500 h-2 rounded-full" style="width: ${newVersionRate}%"></div>
          </div>
          <div class="text-slate-600 whitespace-nowrap">
            ${newVersionCount}/${requiredCount} (${newVersionRate}%)
          </div>
        </div>
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        ${product.status || "-"}
      </td>

      <td class="px-4 py-6 text-center align-middle whitespace-nowrap">
        <button onclick="openEditModal('${product.productId}')" class="admin-action block mx-auto text-blue-600 hover:underline mb-2">
          수정
        </button>
        <button onclick="deleteProduct('${product.productId}')" class="admin-action block mx-auto text-rose-600 hover:underline">
          삭제
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function toggleContractorField() {
  const manufacturingType = document.getElementById("manufacturingTypeInput").value;
  const contractorField = document.getElementById("contractorField");
  const contractorInput = document.getElementById("contractorManufacturerInput");

  if (manufacturingType === "위탁제조") {
    contractorField.classList.remove("hidden");
    contractorInput.required = true;
  } else {
    contractorField.classList.add("hidden");
    contractorInput.required = false;
    contractorInput.value = "";
  }
}

function openAddModal() {
  if (!canEditData()) return;
  document.getElementById("modalTitle").textContent = "품목 추가";
  document.getElementById("productForm").reset();
  document.getElementById("editingProductId").value = "";
  toggleContractorField();
  document.getElementById("productModal").classList.remove("hidden");
}

function openEditModal(productId) {
  if (!canEditData()) return;
  const product = products.find(item => item.productId === productId);
  if (!product) return;

  document.getElementById("modalTitle").textContent = "품목 수정";
  document.getElementById("editingProductId").value = product.productId;
  document.getElementById("productNameInput").value = product.productName || "";
  document.getElementById("approvalNumberInput").value = product.approvalNumber || "";
  document.getElementById("manufacturingTypeInput").value = normalizeManufacturingType(product) || "자사제조";
  document.getElementById("contractorManufacturerInput").value = product.contractorManufacturer || "";
  document.getElementById("dosageFormInput").value = product.dosageForm || "정제";
  document.getElementById("ctdConvertedInput").value = String(product.ctdConverted);
  document.getElementById("statusInput").value = product.status || "";

  toggleContractorField();
  document.getElementById("productModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("productModal").classList.add("hidden");
  document.getElementById("productForm").reset();
}

async function deleteProduct(productId) {
  if (!canEditData()) return;
  const product = products.find(item => item.productId === productId);
  if (!product) return;

  const confirmed = confirm(`'${product.productName}' 품목을 삭제하시겠습니까?`);
  if (!confirmed) return;

  await deleteProductById(productId);
}

function backupData() {
  const data = JSON.stringify(products, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");

  link.href = url;
  link.download = `ctd-products-backup-${today}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

async function importData(event) {
  if (!canEditData()) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function(e) {
    try {
      const importedProducts = JSON.parse(e.target.result);

      if (!Array.isArray(importedProducts)) {
        alert("올바른 JSON 형식이 아닙니다.");
        return;
      }

      const confirmed = confirm("가져온 JSON 데이터를 Firebase에 저장하시겠습니까?");
      if (!confirmed) return;

      for (const product of importedProducts) {
        await saveProduct(product);
      }

      alert("JSON 데이터를 불러왔습니다.");
    } catch (error) {
      console.error(error);
      alert("JSON 파일을 읽는 중 오류가 발생했습니다.");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const targetProducts = getFilteredProducts();

  const headers = [
    "품목명",
    "허가번호",
    "제조구분",
    "수탁제조사",
    "제형",
    "CTD 전환 여부",
    "필수 구비 항목",
    "필수 전체 항목",
    "필수 구비율(%)",
    "신버전 항목",
    "신버전 전체 항목",
    "신버전 반영률(%)",
    "허가 상태"
  ];

  const rows = targetProducts.map(product => {
    const availableCount = getAvailableModuleCount(product);
    const requiredCount = getRequiredItems(product).length;
    const completionRate = getCompletionRate(product);
    const newVersionCount = getNewVersionItems(product).length;
    const newVersionRate = getNewVersionRate(product);

    return [
      product.productName,
      product.approvalNumber || "",
      product.manufacturingType || "",
      product.contractorManufacturer || "",
      product.dosageForm || "",
      product.ctdConverted ? "CTD 전환" : "CTD 미전환",
      availableCount,
      requiredCount,
      completionRate,
      newVersionCount,
      requiredCount,
      newVersionRate,
      product.status || ""
    ];
  });

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map(row => row.map(escapeCsvValue).join(","))
  ].join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");

  link.href = url;
  link.download = `ctd-dashboard-${today}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

document.querySelectorAll(".type-tab").forEach(button => {
  button.addEventListener("click", () => {
    activeManufacturingType = button.dataset.type;

    document.querySelectorAll(".type-tab").forEach(tab => {
      const active = tab === button;
      tab.classList.toggle("bg-white", active);
      tab.classList.toggle("shadow-sm", active);
      tab.classList.toggle("text-blue-700", active);
      tab.classList.toggle("text-slate-600", !active);
    });

    renderProductTable();
  });
});

document.getElementById("openAddModalBtn").addEventListener("click", openAddModal);
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
document.getElementById("manufacturingTypeInput").addEventListener("change", toggleContractorField);

document.getElementById("searchInput").addEventListener("input", renderProductTable);
document.getElementById("ctdFilter").addEventListener("change", renderProductTable);
document.getElementById("statusFilter").addEventListener("change", renderProductTable);

document.getElementById("backupDataBtn").addEventListener("click", backupData);
document.getElementById("importDataInput").addEventListener("change", importData);
document.getElementById("downloadCsvBtn").addEventListener("click", downloadCsv);

document.getElementById("productForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!canEditData()) return;

  const editingProductId = document.getElementById("editingProductId").value;

  const productData = {
    productId: editingProductId || generateProductId(),
    productName: document.getElementById("productNameInput").value.trim(),
    approvalNumber: document.getElementById("approvalNumberInput").value.trim(),
    manufacturingType: document.getElementById("manufacturingTypeInput").value,
    contractorManufacturer: document.getElementById("manufacturingTypeInput").value === "위탁제조"
      ? document.getElementById("contractorManufacturerInput").value.trim()
      : "",
    dosageForm: document.getElementById("dosageFormInput").value,
    ctdConverted: document.getElementById("ctdConvertedInput").value === "true",
    status: document.getElementById("statusInput").value
  };

  if (editingProductId) {
    const existingProduct = products.find(item => item.productId === editingProductId);

    await saveProduct({
      ...existingProduct,
      ...productData
    });
  } else {
    await saveProduct({
      ...productData,
      ctdItems: createCtdItems()
    });
  }

  closeModal();
});

window.openEditModal = openEditModal;
window.deleteProduct = deleteProduct;

subscribeProducts(firebaseProducts => {
  products = firebaseProducts;
  renderPage();
});
