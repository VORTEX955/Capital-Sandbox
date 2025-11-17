const STORAGE_KEY = "capitalSandboxData";
const THEME_KEY = "capitalSandboxTheme";

const dom = {
  capitalChart: document.getElementById("capitalChart"),
  ratioChart: document.getElementById("ratioChart"),
  todayCount: document.getElementById("todayCount"),
  weekCount: document.getElementById("weekCount"),
  totalCount: document.getElementById("totalCount"),
  themeToggle: document.getElementById("themeToggle"),
};

const state = loadState();

initTheme();
renderCounts();
drawCapitalChart();
drawRatioChart();
bindThemeToggle();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { capital: 0, transactions: [], events: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      capital: Number(parsed.capital) || 0,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { capital: 0, transactions: [], events: [] };
  }
}

function renderCounts() {
  if (!dom.todayCount || !dom.weekCount || !dom.totalCount) return;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 6 * 24 * 60 * 60 * 1000;

  let today = 0;
  let week = 0;

  state.transactions.forEach((t) => {
    if (!t.timestamp) return;
    if (t.timestamp >= startOfDay) today += 1;
    if (t.timestamp >= startOfWeek) week += 1;
  });

  dom.todayCount.textContent = `${today} عملية`;
  dom.weekCount.textContent = `${week} عملية`;
  dom.totalCount.textContent = `${state.transactions.length} عملية`;
}

function drawCapitalChart() {
  if (!dom.capitalChart) return;
  const ctx = dom.capitalChart.getContext("2d");
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--card");
  ctx.fillRect(0, 0, width, height);

  const data = buildCapitalHistory();
  if (data.length < 2) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.font = "16px Cairo";
    ctx.textAlign = "center";
    ctx.fillText("لا توجد بيانات كافية بعد", width / 2, height / 2);
    return;
  }

  const times = data.map((point) => point.time);
  const values = data.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rangeValue = Math.max(maxValue - minValue, 1);
  const rangeTime = Math.max(maxTime - minTime, 1);

  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--primary");
  ctx.lineWidth = 3;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = ((point.time - minTime) / rangeTime) * (width - 40) + 20;
    const y = height - ((point.value - minValue) / rangeValue) * (height - 40) - 20;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function buildCapitalHistory() {
  const history = [];
  const transactions = [...state.transactions].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (!transactions.length) {
    history.push({ time: Date.now(), value: state.capital });
    return history;
  }

  let running = 0;
  transactions.forEach((tx) => {
    const amount = tx.type === "income" ? Number(tx.amount) : -Number(tx.amount);
    running += amount;
    history.push({ time: tx.timestamp || Date.now(), value: running });
  });
  return history;
}

function drawRatioChart() {
  if (!dom.ratioChart) return;
  const ctx = dom.ratioChart.getContext("2d");
  const { width, height } = ctx.canvas;
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--card");
  ctx.fillRect(0, 0, width, height);

  const totals = state.transactions.reduce(
    (acc, tx) => {
      if (tx.type === "income") acc.income += Number(tx.amount) || 0;
      if (tx.type === "expense") acc.expense += Number(tx.amount) || 0;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const total = totals.income + totals.expense;
  if (!total) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.font = "16px Cairo";
    ctx.textAlign = "center";
    ctx.fillText("لا توجد بيانات للمقارنة", centerX, centerY);
    return;
  }

  const incomeAngle = (totals.income / total) * Math.PI * 2;

  // Expense arc
  ctx.beginPath();
  ctx.fillStyle = "rgba(242,100,100,0.8)";
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Income arc
  ctx.beginPath();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--accent");
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + incomeAngle, false);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--card");
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
  ctx.font = "18px Cairo";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round((totals.income / total) * 100)}٪ دخل`, centerX, centerY - 8);
  ctx.fillText(`${Math.round((totals.expense / total) * 100)}٪ مصروف`, centerX, centerY + 20);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.body.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function bindThemeToggle() {
  if (!dom.themeToggle) return;
  dom.themeToggle.addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
  drawCapitalChart();
  drawRatioChart();
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

