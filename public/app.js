const form = document.getElementById("question-form");
const input = document.getElementById("question-input");
const list = document.getElementById("questions");
const template = document.getElementById("question-item-template");
const refreshBtn = document.getElementById("refresh-btn");
const charCount = document.getElementById("char-count");
const sortSelect = document.getElementById("sort-select");

let refreshTimer = null;
let isRefreshing = false;

function setCharCount() {
  charCount.textContent = `${input.value.length} / 280`;
}

async function fetchQuestions() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const sort = sortSelect?.value || "top";
    const response = await fetch(`/questions?sort=${encodeURIComponent(sort)}`);
    if (!response.ok) throw new Error("Failed to load questions");
    const questions = await response.json();
    renderQuestions(questions);
  } catch (error) {
    console.error(error);
  } finally {
    isRefreshing = false;
  }
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  try {
    await submitQuestion(text);
    input.value = "";
    setCharCount();
    await fetchQuestions();
  } catch (error) {
    alert(error.message);
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest(".vote");
  if (!button) return;

  const item = event.target.closest(".question");
  if (!item) return;

  const id = Number(item.dataset.id);
  const direction = button.dataset.direction;
  if (!id || !direction) return;

  try {
    await vote(id, direction);
    await fetchQuestions();
  } catch (error) {
    alert(error.message);
  }
});

refreshBtn.addEventListener("click", fetchQuestions);
input.addEventListener("input", setCharCount);
sortSelect.addEventListener("change", fetchQuestions);

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchQuestions, 5000);
}

setCharCount();
fetchQuestions();
startAutoRefresh();
