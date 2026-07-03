import {
  db,
  doc,
  getDoc,
  setDoc
} from "./firebase.js";

const AUTH_KEY = "ctd_auth_role";
const AUTH_TIME_KEY = "ctd_auth_time";
const AUTO_LOGOUT_MINUTES = 30;
const SETTINGS_COLLECTION = "settings";
const AUTH_DOC_ID = "auth";

const DEFAULT_AUTH_SETTINGS = {
  adminPassword: "admin1234",
  viewerPassword: "view1234",
  updatedAt: new Date().toISOString()
};

let cachedAuthSettings = null;

async function getAuthSettings() {
  if (cachedAuthSettings) return cachedAuthSettings;

  const authRef = doc(db, SETTINGS_COLLECTION, AUTH_DOC_ID);
  const authSnap = await getDoc(authRef);

  if (!authSnap.exists()) {
    await setDoc(authRef, DEFAULT_AUTH_SETTINGS);
    cachedAuthSettings = { ...DEFAULT_AUTH_SETTINGS };
    return cachedAuthSettings;
  }

  cachedAuthSettings = {
    ...DEFAULT_AUTH_SETTINGS,
    ...authSnap.data()
  };

  return cachedAuthSettings;
}

async function saveAuthSettings(settings) {
  const nextSettings = {
    ...settings,
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, SETTINGS_COLLECTION, AUTH_DOC_ID), nextSettings);
  cachedAuthSettings = nextSettings;
  return nextSettings;
}

async function login(password) {
  const settings = await getAuthSettings();

  if (password === settings.adminPassword) {
    sessionStorage.setItem(AUTH_KEY, "admin");
    sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
    return "admin";
  }

  if (password === settings.viewerPassword) {
    sessionStorage.setItem(AUTH_KEY, "viewer");
    sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
    return "viewer";
  }

  return null;
}

function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_TIME_KEY);
  location.reload();
}

function refreshLoginTime() {
  if (sessionStorage.getItem(AUTH_KEY)) {
    sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
  }
}

function getUserRole() {
  const role = sessionStorage.getItem(AUTH_KEY);
  const loginTime = Number(sessionStorage.getItem(AUTH_TIME_KEY));

  if (!role || !loginTime) return null;

  const elapsedMinutes = (Date.now() - loginTime) / 1000 / 60;

  if (elapsedMinutes > AUTO_LOGOUT_MINUTES) {
    logout();
    return null;
  }

  return role;
}

function isAdmin() {
  return getUserRole() === "admin";
}

function isViewer() {
  return getUserRole() === "viewer";
}

function renderLoginScreen() {
  document.body.innerHTML = `
    <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div class="bg-white w-full max-w-md rounded-2xl shadow p-8">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold mb-2">CTD 구비현황 관리시스템</h1>
          <p class="text-slate-500">Aju Healthcare · v1.1</p>
        </div>

        <label class="block text-sm font-medium mb-2">비밀번호</label>
        <input
          id="passwordInput"
          type="password"
          placeholder="비밀번호를 입력하세요"
          class="w-full border rounded-lg px-4 py-3 mb-4"
          autocomplete="current-password"
        />

        <button
          id="loginBtn"
          class="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
        >
          입장하기
        </button>

        <p id="loginError" class="hidden text-rose-600 text-sm text-center mt-4">
          비밀번호가 올바르지 않습니다.
        </p>

        <p class="text-xs text-slate-400 text-center mt-6">
          관리자 또는 조회용 비밀번호로 접속할 수 있습니다.
        </p>
      </div>
    </div>
  `;

  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");

  loginBtn.addEventListener("click", async () => {
    loginBtn.disabled = true;
    loginBtn.textContent = "확인 중...";

    const result = await login(passwordInput.value);

    if (result) {
      location.reload();
      return;
    }

    loginError.classList.remove("hidden");
    loginBtn.disabled = false;
    loginBtn.textContent = "입장하기";
  });

  passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      loginBtn.click();
    }
  });

  passwordInput.focus();
}

async function requireLogin() {
  const role = getUserRole();

  if (!role) {
    renderLoginScreen();
    return false;
  }

  refreshLoginTime();
  return true;
}

function getRoleLabel() {
  const role = getUserRole();
  if (role === "admin") return "관리자 모드";
  if (role === "viewer") return "조회 모드";
  return "로그인 필요";
}

function injectAuthBar() {
  if (document.getElementById("authBar")) return;

  const root = document.querySelector("body > div");
  if (!root) return;

  const role = getUserRole();
  const roleClass = role === "admin"
    ? "bg-blue-100 text-blue-700"
    : "bg-slate-200 text-slate-700";

  const authBar = document.createElement("div");
  authBar.id = "authBar";
  authBar.className = "mb-4 flex flex-wrap justify-end items-center gap-2";
  authBar.innerHTML = `
    <span class="px-3 py-1 rounded-full text-xs font-semibold ${roleClass}">
      ${getRoleLabel()}
    </span>

    ${role === "admin" ? `
      <button
        id="openPasswordModalBtn"
        class="px-3 py-1.5 rounded-lg border bg-white text-slate-700 text-xs hover:bg-slate-50"
      >
        비밀번호 변경
      </button>
    ` : ""}

    <button
      id="logoutBtn"
      class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-800"
    >
      로그아웃
    </button>
  `;

  root.prepend(authBar);

  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("openPasswordModalBtn")?.addEventListener("click", openPasswordModal);
}

function ensurePasswordModal() {
  if (document.getElementById("passwordModal")) return;

  const modal = document.createElement("div");
  modal.id = "passwordModal";
  modal.className = "hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold">비밀번호 변경</h2>
        <button id="closePasswordModalBtn" class="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">현재 관리자 비밀번호</label>
          <input id="currentAdminPasswordInput" type="password" class="w-full border rounded-lg px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">새 관리자 비밀번호</label>
          <input id="newAdminPasswordInput" type="password" placeholder="변경하지 않으려면 비워두세요" class="w-full border rounded-lg px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">새 조회용 비밀번호</label>
          <input id="newViewerPasswordInput" type="password" placeholder="변경하지 않으려면 비워두세요" class="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>

      <p id="passwordChangeError" class="hidden text-rose-600 text-sm mt-4"></p>

      <div class="flex justify-end gap-3 mt-6">
        <button id="cancelPasswordChangeBtn" class="px-4 py-2 rounded-lg border">취소</button>
        <button id="savePasswordChangeBtn" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">저장</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("closePasswordModalBtn").addEventListener("click", closePasswordModal);
  document.getElementById("cancelPasswordChangeBtn").addEventListener("click", closePasswordModal);
  document.getElementById("savePasswordChangeBtn").addEventListener("click", savePasswordChange);
}

function openPasswordModal() {
  ensurePasswordModal();
  document.getElementById("passwordModal").classList.remove("hidden");
  document.getElementById("currentAdminPasswordInput").value = "";
  document.getElementById("newAdminPasswordInput").value = "";
  document.getElementById("newViewerPasswordInput").value = "";
  document.getElementById("passwordChangeError").classList.add("hidden");
}

function closePasswordModal() {
  document.getElementById("passwordModal")?.classList.add("hidden");
}

async function savePasswordChange() {
  const errorEl = document.getElementById("passwordChangeError");
  const currentPassword = document.getElementById("currentAdminPasswordInput").value;
  const newAdminPassword = document.getElementById("newAdminPasswordInput").value.trim();
  const newViewerPassword = document.getElementById("newViewerPasswordInput").value.trim();

  const settings = await getAuthSettings();

  if (currentPassword !== settings.adminPassword) {
    errorEl.textContent = "현재 관리자 비밀번호가 올바르지 않습니다.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!newAdminPassword && !newViewerPassword) {
    errorEl.textContent = "변경할 새 비밀번호를 하나 이상 입력하세요.";
    errorEl.classList.remove("hidden");
    return;
  }

  if ((newAdminPassword && newAdminPassword.length < 4) || (newViewerPassword && newViewerPassword.length < 4)) {
    errorEl.textContent = "비밀번호는 최소 4자 이상으로 입력하세요.";
    errorEl.classList.remove("hidden");
    return;
  }

  await saveAuthSettings({
    adminPassword: newAdminPassword || settings.adminPassword,
    viewerPassword: newViewerPassword || settings.viewerPassword
  });

  alert("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호가 적용됩니다.");
  closePasswordModal();
}

export {
  login,
  logout,
  getUserRole,
  isAdmin,
  isViewer,
  requireLogin,
  injectAuthBar,
  getAuthSettings,
  saveAuthSettings
};
