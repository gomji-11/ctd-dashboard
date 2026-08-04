import {
  requireLogin,
  injectAuthBar,
  canEditData,
  getUserRole
} from "./auth.js";

import {
  getProductById,
  saveProduct,
  getRequiredItems,
  getAvailableModuleCount,
  getNewVersionItems,
  getNewVersionRate,
  getCompletionRate
} from "./data.js";

if (!(await requireLogin())) {
  throw new Error("Login required");
}

injectAuthBar();

const productId = new URLSearchParams(window.location.search).get("id");

let product = null;
let activeRevisionId = null;
let selectedRevisionId = null;

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

  normalizeProductData();
  await ensureInitialRevision();
  selectedRevisionId = getLatestRevision()?.id || null;

  renderSummary();
  renderRevisionHistory();
  renderModuleLatestStatus();
  renderModules();
}

function cloneCtdItems() {
  return product.ctdItems.map(item => ({ ...item }));
}

function cloneRevisionSnapshot(revision) {
  const sourceItems = Array.isArray(revision?.ctdSnapshot) ? revision.ctdSnapshot : product.ctdItems;
  return sourceItems.map(item => ({ ...item }));
}

function parseRevisionNumber(revisionNumber) {
  const normalized = String(revisionNumber ?? "")
    .trim()
    .replace(/^(?:rev\.?|v)\s*/i, "")
    .replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : Number.NaN;
}

function normalizeRevisionNumber(revisionNumber) {
  const number = parseRevisionNumber(revisionNumber);
  return Number.isFinite(number) ? number.toFixed(1) : "";
}

function formatRevisionLabel(revisionNumber) {
  const normalized = normalizeRevisionNumber(revisionNumber);
  return normalized ? `v${normalized}` : "-";
}

function getNextRevisionNumber() {
  const numbers = product.revisionHistory
    .map(item => parseRevisionNumber(item.revisionNumber))
    .filter(Number.isFinite);
  const highest = numbers.length ? Math.max(...numbers) : 0;
  return (Math.round(highest * 10) + 1) / 10;
}

function getLatestRevision() {
  return getRevisionHistory()[0] || null;
}

function canEditCurrentRevision() {
  const latest = getLatestRevision();
  return canEditData() && Boolean(latest) && activeRevisionId === latest.id && selectedRevisionId === latest.id;
}

function getSelectedRevision() {
  return getRevisionHistory().find(item => item.id === selectedRevisionId) || getLatestRevision();
}

function selectRevision(revisionId) {
  activeRevisionId = null;
  selectedRevisionId = revisionId;
  renderRevisionHistory();
  renderModules();
  document.getElementById("moduleContainer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function startCtdEdit(revisionId) {
  if (!canEditData()) return;
  const latest = getLatestRevision();
  if (!latest || latest.id !== revisionId) {
    alert("과거 개정은 변경할 수 없습니다. 최신 개정의 구비현황만 수정해주세요.");
    return;
  }
  selectedRevisionId = revisionId;
  activeRevisionId = revisionId;
  renderRevisionHistory();
  renderModules();
  document.getElementById("moduleContainer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function finishCtdEdit() {
  activeRevisionId = null;
  renderRevisionHistory();
  renderModules();
}

function createInitialRevision() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `REV-INITIAL-${product.productId}`,
    revisionNumber: "0.1",
    revisionDate: today,
    reason: "최초 등록 구비현황",
    author: "시스템",
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: new Date().toISOString(),
    ctdSnapshot: cloneCtdItems()
  };
}

async function ensureInitialRevision() {
  if (product.revisionHistory.length) return;
  product.revisionHistory.push(createInitialRevision());
  if (canEditData()) await saveProduct(product);
}

function syncLatestRevisionSnapshot() {
  const latest = getLatestRevision();
  if (!latest) return;
  latest.ctdSnapshot = cloneCtdItems();
  latest.updatedAt = new Date().toISOString();
}

function normalizeProductData() {
  if (!product.ctdItems) {
    product.ctdItems = [];
  }

  if (!Array.isArray(product.revisionHistory)) product.revisionHistory = [];

  product.ctdItems = product.ctdItems.map(item => ({
    ...item,
    ctdVersionStatus: item.ctdVersionStatus ?? "구버전",
    versionNumber: item.versionNumber ?? "",
    revisionDate: item.revisionDate ?? "",
    available: item.available ?? false,
    required: item.required ?? false
  }));
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
  if (!canEditCurrentRevision()) return;
  syncLatestRevisionSnapshot();
  await saveProduct(product);
  renderModuleLatestStatus();
}

function getItemsByModule() {
  const selected = getSelectedRevision();
  const sourceItems = selected && selected.id !== getLatestRevision()?.id && Array.isArray(selected.ctdSnapshot)
    ? selected.ctdSnapshot
    : product.ctdItems;
  return sourceItems.reduce((groups, item, index) => {
    if (!groups[item.module]) groups[item.module] = [];

    groups[item.module].push({
      ...item,
      index
    });

    return groups;
  }, {});
}

async function setModuleRequired(moduleName, checked) {
  if (!canEditCurrentRevision()) return;
  product.ctdItems.forEach(item => {
    if (item.module === moduleName) {
      item.required = checked;
    }
  });

  await saveCurrentProduct();
  renderSummary();
  renderModules();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function getRevisionHistory() {
  return [...product.revisionHistory].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

const latestModuleCodes = [
  "2.3.S", "2.3.P.1", "2.3.P.2", "2.3.P.3", "2.3.P.4", "2.3.P.5", "2.3.P.6", "2.3.P.7", "2.3.P.8",
  "3.2.S", "3.2.P.1", "3.2.P.2", "3.2.P.3", "3.2.P.4", "3.2.P.5", "3.2.P.6", "3.2.P.7", "3.2.P.8"
];

function belongsToLatestModule(itemCode, moduleCode) {
  return itemCode === moduleCode || itemCode.startsWith(`${moduleCode}.`);
}

function moduleSnapshotSignature(snapshot, moduleCode) {
  return (Array.isArray(snapshot) ? snapshot : [])
    .filter(item => belongsToLatestModule(String(item.code || ""), moduleCode))
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .map(item => [item.code, item.required, item.ctdVersionStatus, item.versionNumber, item.revisionDate, item.available]
      .map(value => String(value ?? ""))
      .join("|")
    )
    .join("\n");
}

function getLatestRevisionForModule(moduleCode) {
  const revisions = [...getRevisionHistory()].reverse();
  let previousSignature = "";
  let latestMatch = null;

  revisions.forEach((revision, index) => {
    const snapshot = Array.isArray(revision.ctdSnapshot)
      ? revision.ctdSnapshot
      : (index === revisions.length - 1 ? product.ctdItems : []);
    const signature = moduleSnapshotSignature(snapshot, moduleCode);
    if (!signature) return;
    if (latestMatch === null || signature !== previousSignature) latestMatch = revision;
    previousSignature = signature;
  });

  return latestMatch;
}

function renderModuleLatestStatus() {
  const grid = document.getElementById("moduleLatestGrid");
  if (!grid) return;
  const latestRevision = getLatestRevision();

  grid.innerHTML = latestModuleCodes.map(moduleCode => {
    const moduleRevision = getLatestRevisionForModule(moduleCode);
    const changedInLatest = Boolean(moduleRevision && latestRevision && moduleRevision.id === latestRevision.id && getRevisionHistory().length > 1);
    return `
      <div class="min-w-0 rounded-md border px-1 py-2 text-center ${changedInLatest ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}" title="${escapeHtml(moduleCode)} · ${moduleRevision ? `버전 ${escapeHtml(formatRevisionLabel(moduleRevision.revisionNumber))}` : "등록 없음"}">
        <div class="truncate text-[10px] leading-tight font-semibold text-slate-700">${escapeHtml(moduleCode)}</div>
        <div class="mt-1 truncate text-[11px] leading-tight font-bold ${changedInLatest ? "text-amber-700" : "text-blue-700"}">${moduleRevision ? escapeHtml(formatRevisionLabel(moduleRevision.revisionNumber)) : "-"}</div>
      </div>`;
  }).join("");
}

function renderRevisionHistory() {
  const revisions = getRevisionHistory();
  document.getElementById("revisionTotalCount").textContent = revisions.length;

  const body = document.getElementById("revisionTableBody");
  if (!revisions.length) {
    body.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">등록된 개정이력이 없습니다.</td></tr>`;
  } else {
    body.innerHTML = revisions.map(item => `<tr class="revision-view-row cursor-pointer ${item.id === selectedRevisionId ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50"}" data-id="${escapeHtml(item.id)}">
      <td class="px-4 py-4 font-semibold">${escapeHtml(formatRevisionLabel(item.revisionNumber))}</td>
      <td class="px-4 py-4 text-center">${escapeHtml(item.revisionDate || item.completedDate || item.plannedDate || "-")}</td>
      <td class="px-4 py-4 whitespace-pre-line">${escapeHtml(item.reason || "-")}</td>
      <td class="px-4 py-4 text-center"><span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">${Array.isArray(item.ctdSnapshot) ? item.ctdSnapshot.length : 0}개 항목 연동</span></td>
      <td class="px-4 py-4 text-center">${escapeHtml(item.author || "-")}</td>
      <td class="px-4 py-4 text-center whitespace-nowrap"><button class="revision-view-btn text-violet-700 hover:underline mr-3" data-id="${escapeHtml(item.id)}">구비현황 보기</button>${canEditData() ? `<button class="revision-copy-btn text-indigo-700 hover:underline mr-3" data-id="${escapeHtml(item.id)}">새 개정 생성</button><button class="revision-edit-btn text-blue-600 hover:underline" data-id="${escapeHtml(item.id)}">이력 수정</button>` : ""}</td>
    </tr>`).join("");
  }
  document.getElementById("openRevisionModalBtn").classList.toggle("hidden", !canEditData());
  const latest = revisions[0];
  const selected = getSelectedRevision();
  document.getElementById("currentRevisionNumber").textContent = selected ? formatRevisionLabel(selected.revisionNumber) : "v0.1";
  document.getElementById("ctdSectionTitle").textContent = selected?.id === latest?.id ? "최신 CTD 세부 항목 구비현황" : "과거 CTD 세부 항목 구비현황";
  document.getElementById("ctdSectionDescription").textContent = selected?.id === latest?.id
    ? "위 개정이력과 자동 연동된 최신 현황입니다. 아래 ‘구비현황 수정’을 눌러야 변경할 수 있습니다."
    : "선택한 개정 당시 저장된 구비현황입니다. 바로 이전 개정과 달라진 항목에는 ‘변경’ 표시가 나타납니다.";
  const editing = canEditCurrentRevision();
  const status = document.getElementById("ctdEditStatus");
  status.textContent = editing
    ? `✏️ ${formatRevisionLabel(latest.revisionNumber)} 수정 중 · 변경 내용은 이 개정이력에 자동 저장됩니다.`
    : selected?.id !== latest?.id
      ? `🕘 ${formatRevisionLabel(selected?.revisionNumber)} 당시의 저장본 · 과거 개정은 조회만 가능합니다.`
      : "🔒 조회 상태 · 실수 방지를 위해 편집이 잠겨 있습니다.";
  status.className = editing
    ? "mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
    : "mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
  const startEditButton = document.getElementById("startCtdEditBtn");
  startEditButton.classList.toggle("hidden", !canEditData() || selected?.id !== latest?.id || editing);
  startEditButton.dataset.id = latest?.id || "";
  document.getElementById("finishCtdEditBtn").classList.toggle("hidden", !editing);
  bindRevisionTableEvents();
}

function openRevisionModal(revision = null) {
  if (!canEditData()) return;
  const nextRevisionNumber = getNextRevisionNumber();
  document.getElementById("revisionModalTitle").textContent = revision ? "개정이력 수정" : "개정이력 등록";
  document.getElementById("editingRevisionId").value = revision?.id || "";
  document.getElementById("revisionNumberInput").value = formatRevisionLabel(revision?.revisionNumber || nextRevisionNumber);
  document.getElementById("revisionDateInput").value = revision?.revisionDate || revision?.completedDate || revision?.plannedDate || new Date().toISOString().slice(0, 10);
  document.getElementById("revisionAuthorInput").value = revision?.author === "시스템" ? "" : (revision?.author || "");
  document.getElementById("revisionReasonInput").value = revision?.reason || "";
  const deleteButton = document.getElementById("deleteRevisionBtn");
  deleteButton.classList.toggle("hidden", !revision || !canEditData());
  deleteButton.dataset.id = revision?.id || "";
  document.getElementById("revisionModal").classList.remove("hidden");
}

function closeRevisionModal() {
  document.getElementById("revisionModal").classList.add("hidden");
  document.getElementById("revisionForm").reset();
  document.getElementById("editingRevisionId").value = "";
}

async function createRevisionFrom(revisionId) {
  if (!canEditData()) return;
  const sourceRevision = product.revisionHistory.find(item => item.id === revisionId);
  if (!sourceRevision) {
    alert("기준으로 사용할 개정본을 찾을 수 없습니다.");
    return;
  }

  const nextRevisionNumber = getNextRevisionNumber();
  if (!confirm(`${formatRevisionLabel(sourceRevision.revisionNumber)}의 구비현황을 복사해 ${formatRevisionLabel(nextRevisionNumber)}을(를) 만드시겠습니까?\n\n기존 개정본은 변경되지 않으며, 새 개정에서 필요한 항목만 수정할 수 있습니다.`)) return;

  const author = prompt("새 개정의 실제 작성자 이름을 입력하세요.", "")?.trim();
  if (!author) {
    alert("작성자를 입력해야 새 개정을 생성할 수 있습니다.");
    return;
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const copiedItems = cloneRevisionSnapshot(sourceRevision);
  const entry = {
    id: `REV-${Date.now()}`,
    revisionNumber: normalizeRevisionNumber(nextRevisionNumber),
    revisionDate: today,
    reason: `${formatRevisionLabel(sourceRevision.revisionNumber)} 기준 신규 개정`,
    author,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sourceRevisionId: sourceRevision.id,
    ctdSnapshot: copiedItems.map(item => ({ ...item }))
  };

  product.ctdItems = copiedItems.map(item => ({ ...item }));
  product.revisionHistory.push(entry);
  await saveProduct(product);
  selectedRevisionId = entry.id;
  activeRevisionId = entry.id;
  renderSummary();
  renderRevisionHistory();
  renderModuleLatestStatus();
  renderModules();
  document.getElementById("moduleContainer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindRevisionTableEvents() {
  document.querySelectorAll(".revision-view-btn").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    selectRevision(button.dataset.id);
  }));
  document.querySelectorAll(".revision-view-row").forEach(row => row.addEventListener("click", () => selectRevision(row.dataset.id)));
  document.querySelectorAll(".revision-copy-btn").forEach(button => button.addEventListener("click", async event => {
    event.stopPropagation();
    await createRevisionFrom(button.dataset.id);
  }));
  document.querySelectorAll(".revision-edit-btn").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openRevisionModal(product.revisionHistory.find(item => item.id === button.dataset.id));
  }));
}

async function deleteRevisionFromModal() {
  if (!canEditData()) return;
  const revisionId = document.getElementById("deleteRevisionBtn").dataset.id;
  const target = product.revisionHistory.find(item => item.id === revisionId);
  if (!target) return;
  if (product.revisionHistory.length <= 1) {
    alert("최소 한 개의 개정이력은 남아 있어야 합니다.");
    return;
  }
  if (!confirm(`${formatRevisionLabel(target.revisionNumber)} 이력과 저장된 구비현황을 삭제하시겠습니까?\n\n삭제 후에는 되돌릴 수 없습니다.`)) return;

  const wasLatest = getLatestRevision()?.id === revisionId;
  product.revisionHistory = product.revisionHistory.filter(item => item.id !== revisionId);
  const latest = getLatestRevision();
  if (wasLatest && Array.isArray(latest?.ctdSnapshot)) {
    product.ctdItems = latest.ctdSnapshot.map(item => ({ ...item }));
  }
  activeRevisionId = null;
  selectedRevisionId = latest?.id || null;
  await saveProduct(product);
  closeRevisionModal();
  renderSummary();
  renderRevisionHistory();
  renderModuleLatestStatus();
  renderModules();
}

async function saveRevision(event) {
  event.preventDefault();
  if (!canEditData()) return;
  const editingId = document.getElementById("editingRevisionId").value;
  const existing = product.revisionHistory.find(item => item.id === editingId);
  const normalizedRevisionNumber = normalizeRevisionNumber(document.getElementById("revisionNumberInput").value);
  if (!normalizedRevisionNumber) {
    alert("버전은 v0.1처럼 숫자와 소수점 첫째 자리로 입력해주세요.");
    return;
  }
  const entry = {
    id: editingId || `REV-${Date.now()}`,
    revisionNumber: normalizedRevisionNumber,
    revisionDate: document.getElementById("revisionDateInput").value,
    reason: document.getElementById("revisionReasonInput").value.trim(),
    author: document.getElementById("revisionAuthorInput").value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  entry.ctdSnapshot = existing?.ctdSnapshot || cloneCtdItems();
  if (existing) Object.assign(existing, entry); else product.revisionHistory.push(entry);
  syncLatestRevisionSnapshot();
  await saveProduct(product);
  selectedRevisionId = entry.id;
  closeRevisionModal();
  renderRevisionHistory();
}

async function setModuleAvailable(moduleName, checked) {
  if (!canEditCurrentRevision()) return;
  product.ctdItems.forEach(item => {
    if (item.module === moduleName) {
      item.available = checked;
    }
  });

  await saveCurrentProduct();
  renderSummary();
  renderModules();
}
function renderModules() {
  const container = document.getElementById("moduleContainer");
  container.innerHTML = "";

  const groups = getItemsByModule();
  const revisionsAsc = [...getRevisionHistory()].reverse();
  const selected = getSelectedRevision();
  const selectedIndex = revisionsAsc.findIndex(item => item.id === selected?.id);
  const previousSnapshot = selectedIndex > 0 && Array.isArray(revisionsAsc[selectedIndex - 1].ctdSnapshot)
    ? revisionsAsc[selectedIndex - 1].ctdSnapshot
    : [];
  const previousByCode = new Map(previousSnapshot.map(item => [item.code, item]));
  const isChanged = item => {
    if (!previousSnapshot.length) return false;
    const previous = previousByCode.get(item.code);
    if (!previous) return true;
    return ["required", "ctdVersionStatus", "versionNumber", "revisionDate", "available"]
      .some(key => String(previous[key] ?? "") !== String(item[key] ?? ""));
  };

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
        <table class="min-w-[980px] w-full text-sm table-fixed">
          <thead class="bg-white text-slate-600 border-y">
            <tr>
              <th class="px-4 py-3 text-left w-[100px]">코드</th>
              <th class="px-4 py-3 text-left w-[300px]">제목</th>

              <th class="px-4 py-3 text-center w-[90px]">
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

              <th class="px-4 py-3 text-left w-[140px]">현재 CTD 버전</th>
              <th class="px-4 py-3 text-left w-[130px]">버전 번호</th>
              <th class="px-4 py-3 text-left w-[130px]">개정일</th>

              <th class="px-4 py-3 text-center w-[120px]">
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
                    ${isChanged(item) ? `<span class="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">변경</span>` : ""}
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
                    type="text"
                    class="version-number-input w-full border rounded-lg px-2 py-1"
                    data-index="${item.index}"
                    placeholder="예: v1.0"
                    value="${item.versionNumber || ""}"
                  />
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
  applyRoleToDetail();
}
function generateReportHtml(reportType) {
  const includeRevisions = reportType !== "latest-required";
  const includeLatest = reportType !== "revisions";
  const includeAllItems = reportType === "revisions-latest-all";
  const latestRevision = getLatestRevision();
  const latestItems = cloneRevisionSnapshot(latestRevision);
  const reportItems = includeAllItems ? latestItems : latestItems.filter(item => item.required);
  const requiredItems = latestItems.filter(item => item.required);
  const requiredCount = requiredItems.length;
  const availableCount = requiredItems.filter(item => item.available).length;
  const newVersionCount = requiredItems.filter(item => item.ctdVersionStatus === "신버전").length;
  const completionRate = requiredCount ? Math.round((availableCount / requiredCount) * 100) : 0;
  const newVersionRate = requiredCount ? Math.round((newVersionCount / requiredCount) * 100) : 0;
  const groups = reportItems.reduce((result, item) => {
    if (!result[item.module]) result[item.module] = [];
    result[item.module].push(item);
    return result;
  }, {});
  const today = new Date().toISOString().slice(0, 10);
  const revisionRows = getRevisionHistory().map(item => `
    <tr>
      <td>${escapeHtml(formatRevisionLabel(item.revisionNumber))}</td>
      <td>${escapeHtml(item.revisionDate || item.completedDate || item.plannedDate || "-")}</td>
      <td>${escapeHtml(item.reason || "-")}</td>
      <td>${escapeHtml(item.author || "-")}</td>
    </tr>
  `).join("");

  const moduleSections = Object.entries(groups).map(([moduleName, items]) => {
    const rows = items.map(item => `
      <tr>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${item.required ? "필수" : "선택"}</td>
        <td>${item.ctdVersionStatus || "구버전"}</td>
        <td>${item.versionNumber || "-"}</td>
        <td>${item.revisionDate || "-"}</td>
        <td>${item.available ? "구비" : "미구비"}</td>
      </tr>
    `).join("");

    return `
      <h2>${escapeHtml(moduleName)}</h2>
      <table>
        <thead>
          <tr>
            <th>코드</th>
            <th>제목</th>
            <th>필수여부</th>
            <th>현재 CTD 버전</th>
            <th>버전 번호</th>
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

        h1 { font-size: 24px; margin-bottom: 8px; }

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

        th:nth-child(1), td:nth-child(1) { width: 80px; }
        th:nth-child(2), td:nth-child(2) { width: auto; }
        th:nth-child(3), td:nth-child(3) { width: 65px; text-align: center; }
        th:nth-child(4), td:nth-child(4) { width: 90px; text-align: center; }
        th:nth-child(5), td:nth-child(5) { width: 90px; text-align: center; }
        th:nth-child(6), td:nth-child(6) { width: 85px; text-align: center; }
        th:nth-child(7), td:nth-child(7) { width: 70px; text-align: center; }

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
      <div class="meta">보고서 출력일: ${today} · 출력 유형: ${escapeHtml(document.querySelector(`input[name="reportType"]:checked`)?.nextElementSibling?.querySelector("strong")?.textContent || "")}</div>

      <h2>품목 정보</h2>
      <table>
        <tbody>
          <tr>
            <th>품목명</th>
            <td>${escapeHtml(product.productName)}</td>
            <th>허가번호</th>
            <td>${escapeHtml(product.approvalNumber || "-")}</td>
          </tr>
          <tr>
            <th>제조구분</th>
            <td>${escapeHtml(product.manufacturingType || "-")}</td>
            <th>수탁제조사</th>
            <td>${escapeHtml(product.contractorManufacturer || "-")}</td>
          </tr>
          <tr>
            <th>제형</th>
            <td>${escapeHtml(product.dosageForm || "-")}</td>
            <th>CTD 전환</th>
            <td>${product.ctdConverted ? "CTD 전환" : "CTD 미전환"}</td>
          </tr>
          <tr>
            <th>허가 상태</th>
            <td colspan="3">${escapeHtml(product.status || "-")}</td>
          </tr>
        </tbody>
      </table>

      ${includeLatest ? `<div class="summary">
        <div class="card">
          <div class="card-title">필수 항목 구비율</div>
          <div class="card-value">${completionRate}%</div>
          <div>${availableCount}/${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">신버전 반영률</div>
          <div class="card-value">${newVersionRate}%</div>
          <div>${newVersionCount}/${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">필수 항목 수</div>
          <div class="card-value">${requiredCount}</div>
        </div>
        <div class="card">
          <div class="card-title">출력 CTD 항목 수</div>
          <div class="card-value">${reportItems.length}</div>
        </div>
      </div>` : ""}

      ${includeRevisions ? `<h2>CTD 개정이력</h2>
      <table>
        <thead><tr><th>버전</th><th>개정일</th><th>개정사유</th><th>작성자</th></tr></thead>
        <tbody>${revisionRows || `<tr><td colspan="4">등록된 개정이력이 없습니다.</td></tr>`}</tbody>
      </table>` : ""}

      ${includeLatest ? `<h2>최신 CTD 구비현황 · ${escapeHtml(formatRevisionLabel(latestRevision?.revisionNumber))}</h2>${moduleSections || "<p>출력할 CTD 항목이 없습니다.</p>"}` : ""}
    </body>
    </html>
  `;
}

function printPdfReport(reportType) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도해주세요.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(generateReportHtml(reportType));
  reportWindow.document.close();

  reportWindow.onload = function () {
    reportWindow.focus();
    reportWindow.print();
  };
}

function openReportModal() {
  document.getElementById("reportForm").reset();
  document.querySelector('input[name="reportType"][value="revisions-latest-required"]').checked = true;
  document.getElementById("reportModal").classList.remove("hidden");
}

function closeReportModal() {
  document.getElementById("reportModal").classList.add("hidden");
}

function submitReport(event) {
  event.preventDefault();
  const reportType = new FormData(event.currentTarget).get("reportType");
  if (!reportType) return;
  printPdfReport(reportType);
  closeReportModal();
}


function applyRoleToDetail() {
  const editableSelectors = [
    ".module-required-toggle",
    ".module-available-toggle",
    ".required-checkbox",
    ".version-status-select",
    ".version-number-input",
    ".revision-date-input",
    ".available-checkbox"
  ];

  editableSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      element.disabled = !canEditCurrentRevision();
      element.classList.toggle("opacity-60", !canEditCurrentRevision());
      element.classList.toggle("cursor-not-allowed", !canEditCurrentRevision());
    });
  });
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
      if (!canEditCurrentRevision()) return;
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].required = event.target.checked;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });

  document.querySelectorAll(".version-status-select").forEach(select => {
    select.addEventListener("change", async event => {
      if (!canEditCurrentRevision()) return;
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].ctdVersionStatus = event.target.value;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });

  document.querySelectorAll(".version-number-input").forEach(input => {
    input.addEventListener("change", async event => {
      if (!canEditCurrentRevision()) return;
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].versionNumber = event.target.value.trim();

      await saveCurrentProduct();
    });
  });

  document.querySelectorAll(".revision-date-input").forEach(input => {
    input.addEventListener("change", async event => {
      if (!canEditCurrentRevision()) return;
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].revisionDate = event.target.value;

      await saveCurrentProduct();
    });
  });

  document.querySelectorAll(".available-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async event => {
      if (!canEditCurrentRevision()) return;
      const index = Number(event.target.dataset.index);
      product.ctdItems[index].available = event.target.checked;

      await saveCurrentProduct();
      renderSummary();
      renderModules();
    });
  });
}

document.getElementById("printReportBtn").addEventListener("click", openReportModal);
document.getElementById("closeReportModalBtn").addEventListener("click", closeReportModal);
document.getElementById("cancelReportBtn").addEventListener("click", closeReportModal);
document.getElementById("reportForm").addEventListener("submit", submitReport);
document.getElementById("finishCtdEditBtn").addEventListener("click", finishCtdEdit);
document.getElementById("startCtdEditBtn").addEventListener("click", event => startCtdEdit(event.currentTarget.dataset.id));
document.getElementById("openRevisionModalBtn").addEventListener("click", () => openRevisionModal());
document.getElementById("closeRevisionModalBtn").addEventListener("click", closeRevisionModal);
document.getElementById("cancelRevisionBtn").addEventListener("click", closeRevisionModal);
document.getElementById("deleteRevisionBtn").addEventListener("click", deleteRevisionFromModal);
document.getElementById("revisionForm").addEventListener("submit", saveRevision);
init();
