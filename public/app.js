const form = document.getElementById("question-form");
const input = document.getElementById("question-input");
const list = document.getElementById("questions");
const template = document.getElementById("question-item-template");
const refreshBtn = document.getElementById("refresh-btn");
const charCount = document.getElementById("char-count");
const sortButtons = Array.from(document.querySelectorAll(".sort-chip"));
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageLabel = document.getElementById("page-label");
const adminLoginForm = document.getElementById("admin-login-form");
const adminUsernameInput = document.getElementById("admin-username");
const adminPasswordInput = document.getElementById("admin-password");
const adminLogoutBtn = document.getElementById("admin-logout");
const adminClearBtn = document.getElementById("admin-clear");
const adminStatus = document.getElementById("admin-status");
const adminToggle = document.getElementById("admin-toggle");
const adminSection = document.querySelector(".admin");
const versionLabel = document.getElementById("version-label");

let refreshTimer = null;
let isRefreshing = false;
let adminToken = localStorage.getItem("adminToken");
let voteStates = JSON.parse(localStorage.getItem("voteStates") || "{}");
let currentPage = 1;
const pageSize = 20;
let currentSort = "top";

function setCharCount() {
  charCount.textContent = `${input.value.length} / 280`;
}

async function fetchQuestions() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const query = new URLSearchParams({
      sort: currentSort,
      page: String(currentPage),
      limit: String(pageSize),
    });
    const response = await fetch(`/questions?${query.toString()}`);
    if (!response.ok) throw new Error("Failed to load questions");
    const payload = await response.json();
    renderQuestions(payload.items || []);
    updatePagination(payload.page || 1, payload.totalPages || 1, payload.totalItems || 0);
  } catch (error) {
    console.error(error);
  } finally {
    isRefreshing = false;
  }
}

function updatePagination(page, totalPages, totalItems) {
  currentPage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);
  pageLabel.textContent = `Page ${currentPage} of ${safeTotalPages} (${totalItems})`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= safeTotalPages;
}

function setSort(sort) {
  currentSort = sort;
  sortButtons.forEach((button) => {
    const isActive = button.dataset.sort === sort;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderQuestions(questions) {
  list.innerHTML = "";
  const fragment = document.createDocumentFragment();

  questions.forEach((question) => {
    const node = template.content.cloneNode(true);
    const item = node.querySelector(".question");
    item.dataset.id = String(question.id);
    node.querySelector(".text").textContent = question.text;
    node.querySelector(".score").textContent = String(question.votes);
    const currentState = voteStates[question.id] || "none";
    const upBtn = node.querySelector('.vote[data-direction="up"]');
    const downBtn = node.querySelector('.vote[data-direction="down"]');
    if (upBtn) upBtn.disabled = currentState === "up";
    if (downBtn) downBtn.disabled = currentState === "down";
    const deleteBtn = node.querySelector(".admin-delete");
    if (adminToken) {
      deleteBtn.style.display = "inline-flex";
    } else {
      deleteBtn.style.display = "none";
    }
    fragment.appendChild(node);
  });

  list.appendChild(fragment);
}

async function submitQuestion(text) {
  const response = await fetch("/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error" }));
    throw new Error(error.error || "Failed to submit");
  }
}

async function vote(id, direction) {
  const response = await fetch("/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, direction }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error" }));
    throw new Error(error.error || "Vote failed");
  }

  return response.json();
}

async function adminLogin(password) {
  const username = adminUsernameInput.value.trim();
  const response = await fetch("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error" }));
    throw new Error(error.error || "Login failed");
  }

  return response.json();
}

async function adminClear() {
  const response = await fetch("/admin/clear", {
    method: "POST",
    headers: { "x-admin-token": adminToken },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error" }));
    throw new Error(error.error || "Clear failed");
  }
}

async function adminDelete(id) {
  const response = await fetch(`/admin/question/${id}`, {
    method: "DELETE",
    headers: { "x-admin-token": adminToken },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error" }));
    throw new Error(error.error || "Delete failed");
  }
}

function setAdminStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.dataset.error = isError ? "true" : "false";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  try {
    await submitQuestion(text);
    input.value = "";
    setCharCount();
    currentPage = 1;
    await fetchQuestions();
  } catch (error) {
    alert(error.message);
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest(".vote");
  const deleteBtn = event.target.closest(".admin-delete");
  const item = event.target.closest(".question");
  if (!item) return;
  const id = Number(item.dataset.id);
  if (!id) return;

  if (button) {
    const direction = button.dataset.direction;
    if (!direction) return;
    try {
      const currentState = voteStates[id] || "none";
      if (direction === currentState) {
        alert("You already voted that way for this question.");
        return;
      }
      await vote(id, direction);
      voteStates[id] = direction;
      localStorage.setItem("voteStates", JSON.stringify(voteStates));
      const scoreEl = item.querySelector(".score");
      if (scoreEl) {
        scoreEl.classList.remove("bump-up", "bump-down");
        scoreEl.classList.add(direction === "up" ? "bump-up" : "bump-down");
        scoreEl.addEventListener(
          "animationend",
          () => scoreEl.classList.remove("bump-up", "bump-down"),
          { once: true }
        );
      }
      button.classList.remove("pulse-up", "pulse-down");
      button.classList.add(direction === "up" ? "pulse-up" : "pulse-down");
      button.addEventListener(
        "animationend",
        () => button.classList.remove("pulse-up", "pulse-down"),
        { once: true }
      );
      await fetchQuestions();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (deleteBtn && adminToken) {
    const confirmDelete = confirm("Delete this question?");
    if (!confirmDelete) return;
    try {
      await adminDelete(id);
      await fetchQuestions();
    } catch (error) {
      alert(error.message);
    }
  }
});

refreshBtn.addEventListener("click", fetchQuestions);
input.addEventListener("input", setCharCount);
sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sort = button.dataset.sort || "top";
    if (sort === currentSort) return;
    setSort(sort);
    currentPage = 1;
    fetchQuestions();
  });
});
prevPageBtn.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  fetchQuestions();
});
nextPageBtn.addEventListener("click", () => {
  currentPage += 1;
  fetchQuestions();
});

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value;
  if (!username || !password) return;
  try {
    const result = await adminLogin(password);
    adminToken = result.token;
    localStorage.setItem("adminToken", adminToken);
    adminUsernameInput.value = "";
    adminPasswordInput.value = "";
    setAdminStatus("Logged in as admin.");
    await fetchQuestions();
  } catch (error) {
    setAdminStatus(error.message, true);
  }
});

adminLogoutBtn.addEventListener("click", async () => {
  adminToken = null;
  localStorage.removeItem("adminToken");
  setAdminStatus("Logged out.");
  await fetchQuestions();
});

adminToggle.addEventListener("click", () => {
  adminSection.classList.toggle("open");
});

adminClearBtn.addEventListener("click", async () => {
  if (!adminToken) {
    setAdminStatus("Login required.", true);
    return;
  }
  const confirmClear = confirm("Clear all questions?");
  if (!confirmClear) return;
  try {
    await adminClear();
    currentPage = 1;
    await fetchQuestions();
  } catch (error) {
    setAdminStatus(error.message, true);
  }
});

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchQuestions, 5000);
}

async function loadVersion() {
  if (!versionLabel) return;
  try {
    const response = await fetch("/version");
    if (!response.ok) throw new Error("Version fetch failed");
    const data = await response.json();
    if (data.startedAt) {
      const date = new Date(data.startedAt);
      const formatted = date.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      versionLabel.textContent = `Updated ${formatted}`;
    }
  } catch (error) {
    console.error(error);
  }
}

setCharCount();
setSort(currentSort);
fetchQuestions();
startAutoRefresh();
loadVersion();
