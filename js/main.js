const STORAGE_KEY = "capitalSandboxData";
const THEME_KEY = "capitalSandboxTheme";

const defaultState = {
  capital: 0,
  transactions: [],
  events: [],
};

const dom = {
  capitalDisplay: document.getElementById("capitalDisplay"),
  resetStateBtn: document.getElementById("resetStateBtn"),
  incomeForm: document.getElementById("incomeForm"),
  incomeName: document.getElementById("incomeName"),
  incomeAmount: document.getElementById("incomeAmount"),
  expenseForm: document.getElementById("expenseForm"),
  expenseName: document.getElementById("expenseName"),
  expenseAmount: document.getElementById("expenseAmount"),
  transactionTableBody: document.getElementById("transactionTableBody"),
  themeToggle: document.getElementById("themeToggle"),
};

let state = loadState();

initTheme();
renderAll();
bindEvents();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  dom.incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.incomeName.value.trim() || "دخل بدون اسم";
    const amount = Number(dom.incomeAmount.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addTransaction("income", name, amount);
    dom.incomeForm.reset();
  });

  dom.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.expenseName.value.trim() || "مصروف بدون اسم";
    const amount = Number(dom.expenseAmount.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addTransaction("expense", name, amount);
    dom.expenseForm.reset();
  });

  dom.resetStateBtn.addEventListener("click", () => {
    const confirmed = confirm("سيتم مسح جميع البيانات. هل أنت متأكد؟");
    if (!confirmed) return;
    state = { ...defaultState };
    saveState();
    renderAll();
  });

  dom.themeToggle.addEventListener("click", toggleTheme);
}

function addTransaction(type, name, amount) {
  const timestamp = Date.now();
  const signedAmount = type === "income" ? amount : -amount;
  state.capital = +(state.capital + signedAmount).toFixed(2);
  state.transactions.unshift({
    id: crypto.randomUUID(),
    type,
    name,
    amount,
    timestamp,
  });
  saveState();
  renderAll();
}

function renderAll() {
  renderCapital();
  renderTransactions();
}

function renderCapital() {
  dom.capitalDisplay.textContent = formatCurrency(state.capital);
}

function renderTransactions() {
  const rows = state.transactions;
  if (!rows.length) {
    dom.transactionTableBody.innerHTML =
      '<tr><td colspan="4" class="empty-row">لا توجد عمليات حتى الآن</td></tr>';
    return;
  }

  dom.transactionTableBody.innerHTML = rows
    .map((item) => {
      const date = new Date(item.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const badge = item.type === "income" ? "دخل" : "مصروف";
      const value = item.type === "income" ? `+${formatCurrency(item.amount)}` : `-${formatCurrency(item.amount)}`;
      return `
        <tr>
          <td>${date}</td>
          <td class="${item.type}">${badge}</td>
          <td>${item.name}</td>
          <td>${value}</td>
        </tr>
      `;
    })
    .join("");
}

function formatCurrency(value) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.body.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
}

function updateThemeIcon(mode) {
  if (!dom.themeToggle) return;
  if (mode === "dark") {
    dom.themeToggle.textContent = "وضع صباحي ☀️";
    dom.themeToggle.setAttribute("aria-label", "التبديل إلى الوضع الصباحي");
  } else {
    dom.themeToggle.textContent = "وضع ليلي 🌙";
    dom.themeToggle.setAttribute("aria-label", "التبديل إلى الوضع الليلي");
  }
}

