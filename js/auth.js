const ADMIN_PASSWORD = "admin1234";
const VIEWER_PASSWORD = "view1234";

const AUTH_KEY = "ctd_auth_role";
const AUTH_TIME_KEY = "ctd_auth_time";

const AUTO_LOGOUT_MINUTES = 30;

function login(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "admin");
    sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
    return "admin";
  }

  if (password === VIEWER_PASSWORD) {
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

function requireLogin() {
  const role = getUserRole();

  if (!role) {
    document.body.innerHTML = `
      <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div class="bg-white w-full max-w-md rounded-2xl shadow p-8">
          <h1 class="text-2xl font-bold text-center mb-2">CTD 구비현황 관리시스템</h1>
          <p class="text-slate-500 text-center mb-6">비밀번호를 입력하세요.</p>

          <input
            id="passwordInput"
            type="password"
            placeholder="비밀번호"
            class="w-full border rounded-lg px-4 py-3 mb-4"
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
        </div>
      </div>
    `;

    document.getElementById("loginBtn").addEventListener("click", () => {
      const password = document.getElementById("passwordInput").value;
      const result = login(password);

      if (result) {
        location.reload();
      } else {
        document.getElementById("loginError").classList.remove("hidden");
      }
    });

    document.getElementById("passwordInput").addEventListener("keydown", event => {
      if (event.key === "Enter") {
        document.getElementById("loginBtn").click();
      }
    });

    return false;
  }

  return true;
}

export {
  login,
  logout,
  getUserRole,
  isAdmin,
  isViewer,
  requireLogin
};