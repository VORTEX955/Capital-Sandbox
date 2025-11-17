const STORAGE_KEY = "capitalSandboxState-v1";

const defaultState = {
  capital: 10000,
  incomes: [],
  expenses: [],
  logs: [],
  history: [],
  tickInterval: 2000,
  isFlowing: true,
  tickCount: 0,
};

const clone = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

let state = clone(defaultState);
let loopId = null;

const dom = {
  capitalDisplay: document.getElementById("capitalDisplay"),
  netChangeDisplay: document.getElementById("netChangeDisplay"),
  incomeTotalDisplay: document.getElementById("incomeTotalDisplay"),
  expenseTotalDisplay: document.getElementById("expenseTotalDisplay"),
  timeDisplay: document.getElementById("timeDisplay"),
  tickSpeedDisplay: document.getElementById("tickSpeedDisplay"),
  capitalForm: document.getElementById("capitalForm"),
  capitalDeltaInput: document.getElementById("capitalDeltaInput"),
  quickButtons: document.querySelectorAll(".quick-buttons button"),
  resetStateBtn: document.getElementById("resetStateBtn"),
  incomeForm: document.getElementById("incomeForm"),
  incomeName: document.getElementById("incomeName"),
  incomeAmount: document.getElementById("incomeAmount"),
  incomeMultiplier: document.getElementById("incomeMultiplier"),
  incomeMultiplierValue: document.getElementById("incomeMultiplierValue"),
  incomeList: document.getElementById("incomeList"),
  expenseForm: document.getElementById("expenseForm"),
  expenseName: document.getElementById("expenseName"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseMultiplier: document.getElementById("expenseMultiplier"),
  expenseMultiplierValue: document.getElementById("expenseMultiplierValue"),
  expenseList: document.getElementById("expenseList"),
  toggleFlowBtn: document.getElementById("toggleFlowBtn"),
  randomEventBtn: document.getElementById("randomEventBtn"),
  logsList: document.getElementById("logsList"),
  clearLogsBtn: document.getElementById("clearLogsBtn"),
  speedSlider: document.getElementById("speedSlider"),
  chart: document.getElementById("capitalChart"),
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const events = [
  () => {
    const swing = randomBetween(150, 600);
    state.capital += swing;
    return `مكافأة غير متوقعة +${formatCurrency(swing)}`;
  },
  () => {
    const dip = randomBetween(100, 400);
    state.capital -= dip;
    return `صيانة طارئة -${formatCurrency(dip)}`;
  },
  () => {
    if (!state.incomes.length) {
      state.capital += 200;
      return "إلهام جديد يضيف 200 لرأس المال";
    }
    const item = pickRandom(state.incomes);
    item.amount = +(item.amount * 1.15).toFixed(2);
    return `دخل "${item.name}" تحسّن بنسبة 15٪`;
  },
  () => {
    if (!state.expenses.length) {
      state.capital -= 150;
      return "ضريبة رمزية -150";
    }
    const item = pickRandom(state.expenses);
    item.amount = +(item.amount * 0.9).toFixed(2);
    return `المصروف "${item.name}" صار أخف بـ10٪`;
  },
];

function init() {
  loadState();
  bindEvents();
  ensureHistorySeed();
  renderAll();
  startLoop();
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = {
        ...clone(defaultState),
        ...parsed,
        incomes: parsed.incomes ?? [],
        expenses: parsed.expenses ?? [],
        logs: parsed.logs ?? [],
        history: parsed.history ?? [],
      };
    }
  } catch (error) {
    console.warn("تعذر قراءة البيانات المخزنة:", error);
    state = clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  dom.capitalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const delta = Number(dom.capitalDeltaInput.value);
    if (!Number.isFinite(delta) || delta === 0) return;
    adjustCapital(delta, "تعديل يدوي على رأس المال");
    dom.capitalDeltaInput.value = "";
  });

  dom.quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.delta);
      adjustCapital(delta, "تعديل سريع على رأس المال");
    });
  });

  dom.resetStateBtn.addEventListener("click", () => {
    const confirmed = confirm("هل تريد إعادة الضبط؟ سيتم مسح كل الإعدادات.");
    if (!confirmed) return;
    state = clone(defaultState);
    ensureHistorySeed();
    logEntry("تمت إعادة ضبط الساندبوكس");
    renderAll();
    startLoop();
    saveState();
  });

  dom.incomeMultiplier.addEventListener("input", () => {
    dom.incomeMultiplierValue.textContent = `x${dom.incomeMultiplier.value}`;
  });
  dom.expenseMultiplier.addEventListener("input", () => {
    dom.expenseMultiplierValue.textContent = `x${dom.expenseMultiplier.value}`;
  });

  dom.incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.incomeName.value.trim() || "دخل بدون اسم";
    const amount = Number(dom.incomeAmount.value);
    const multiplier = Number(dom.incomeMultiplier.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const item = createBudgetItem(name, amount, multiplier);
    state.incomes.push(item);
    logEntry(`أُضيف دخل "${name}" بقيمة ${formatCurrency(amount)} (x${multiplier})`);
    dom.incomeForm.reset();
    dom.incomeMultiplier.value = 1;
    dom.incomeMultiplierValue.textContent = "x1";
    renderAndPersist();
  });

  dom.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.expenseName.value.trim() || "مصروف بدون اسم";
    const amount = Number(dom.expenseAmount.value);
    const multiplier = Number(dom.expenseMultiplier.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const item = createBudgetItem(name, amount, multiplier);
    state.expenses.push(item);
    logEntry(
      `أُضيف مصروف "${name}" بقيمة ${formatCurrency(amount)} (x${multiplier})`
    );
    dom.expenseForm.reset();
    dom.expenseMultiplier.value = 1;
    dom.expenseMultiplierValue.textContent = "x1";
    renderAndPersist();
  });

  dom.toggleFlowBtn.addEventListener("click", () => {
    state.isFlowing = !state.isFlowing;
    dom.toggleFlowBtn.textContent = state.isFlowing ? "إيقاف التدفق" : "تشغيل التدفق";
    logEntry(state.isFlowing ? "تم تشغيل التدفق التلقائي" : "تم إيقاف التدفق");
    startLoop();
    saveState();
  });

  dom.speedSlider.addEventListener("input", () => {
    state.tickInterval = Number(dom.speedSlider.value);
    dom.tickSpeedDisplay.textContent = `سرعة: ${(state.tickInterval / 1000).toFixed(
      1
    )}ث`;
    startLoop();
    saveState();
  });

  dom.randomEventBtn.addEventListener("click", () => {
    const eventFn = pickRandom(events);
    const description = eventFn();
    logEntry(description);
    renderAndPersist();
  });

  dom.clearLogsBtn.addEventListener("click", () => {
    state.logs = [];
    renderLogs();
    saveState();
  });
}

function createBudgetItem(name, amount, multiplier) {
  return {
    id: makeId(),
    name,
    amount,
    multiplier,
  };
}

function adjustCapital(delta, reason) {
  state.capital = +(state.capital + delta).toFixed(2);
  logEntry(`${reason}: ${delta > 0 ? "+" : ""}${formatCurrency(delta)}`);
  updateHistory();
  renderAndPersist();
}

function renderAll() {
  updateDisplays();
  renderBudgetLists();
  renderLogs();
  drawChart();
}

function renderAndPersist() {
  renderAll();
  saveState();
}

function updateDisplays() {
  const incomeTotal = sumItems(state.incomes);
  const expenseTotal = sumItems(state.expenses);
  const net = incomeTotal - expenseTotal;

  dom.capitalDisplay.textContent = formatCurrency(state.capital);
  dom.netChangeDisplay.textContent = `${net >= 0 ? "+" : ""}${formatCurrency(net)}`;
  dom.incomeTotalDisplay.textContent = `+${formatCurrency(incomeTotal)}`;
  dom.expenseTotalDisplay.textContent = `-${formatCurrency(expenseTotal)}`;
  dom.timeDisplay.textContent = `الوقت: ${state.tickCount} دورة`;
  dom.tickSpeedDisplay.textContent = `سرعة: ${(state.tickInterval / 1000).toFixed(
    1
  )}ث`;
}

function renderBudgetLists() {
  renderBudgetList(dom.incomeList, state.incomes, "income");
  renderBudgetList(dom.expenseList, state.expenses, "expense");
}

function renderBudgetList(container, items, type) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = type === "income" ? "لا يوجد دخل بعد" : "لا توجد مصاريف بعد";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <span class="muted">${
          type === "income" ? "تدفق إيجابي" : "تدفق سلبي"
        }</span>
      </div>
      <label>
        القيمة
        <input type="number" value="${item.amount}" step="50" data-field="amount" data-id="${
      item.id
    }" data-type="${type}" />
      </label>
      <label>
        معامل السرعة
        <input type="range" min="0.25" max="3" step="0.25" value="${
          item.multiplier
        }" data-field="multiplier" data-id="${item.id}" data-type="${type}" />
        <span class="muted">x${item.multiplier}</span>
      </label>
      <div>
        <span class="muted">ناتج الدورة</span>
        <strong>${formatCurrency(item.amount * item.multiplier)}</strong>
      </div>
      <button data-action="remove" data-type="${type}" data-id="${item.id}">
        إزالة
      </button>
    `;
    container.appendChild(li);
  });

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      const id = event.target.dataset.id;
      const dayType = event.target.dataset.type;
      const value = Number(event.target.value);
      if (!Number.isFinite(value)) return;
      updateBudgetItem(dayType, id, field, value);
      if (field === "multiplier" && event.target.nextElementSibling) {
        event.target.nextElementSibling.textContent = `x${value}`;
      }
    });
  });

  container.querySelectorAll("button[data-action='remove']").forEach((button) => {
    button.addEventListener("click", () => {
      const { id, type: itemType } = button.dataset;
      removeBudgetItem(itemType, id);
    });
  });
}

function updateBudgetItem(type, id, field, value) {
  const list = type === "income" ? state.incomes : state.expenses;
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  item[field] = field === "amount" ? Math.max(value, 0) : value;
  logEntry(
    `تم تعديل ${type === "income" ? "الدخل" : "المصروف"} "${
      item.name
    }" (${field})`
  );
  renderAndPersist();
}

function removeBudgetItem(type, id) {
  const listKey = type === "income" ? "incomes" : "expenses";
  const list = state[listKey];
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const [removed] = list.splice(index, 1);
  logEntry(`تم حذف "${removed.name}" من قائمة ${type === "income" ? "الدخل" : "المصاريف"}`);
  renderAndPersist();
}

function renderLogs() {
  dom.logsList.innerHTML = "";
  if (!state.logs.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "لا توجد أحداث بعد.";
    dom.logsList.appendChild(empty);
    return;
  }

  state.logs.slice(-40).forEach((log) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${log.message}</span>
      <span class="log-time">${log.time}</span>
    `;
    dom.logsList.prepend(li);
  });
}

function logEntry(message) {
  const time = new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.logs.push({ message, time });
  state.logs = state.logs.slice(-100);
  renderLogs();
}

function ensureHistorySeed() {
  if (!state.history.length) {
    state.history = [{ time: state.tickCount, value: state.capital }];
  }
}

function updateHistory() {
  state.history.push({ time: state.tickCount, value: state.capital });
  if (state.history.length > 120) {
    state.history.shift();
  }
}

function drawChart() {
  const ctx = dom.chart.getContext("2d");
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, width, height);

  const data = state.history;
  if (data.length < 2) return;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || 1) * 0.2;
  const rangeMin = min - padding;
  const rangeMax = max + padding;

  // grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(91,110,245,0.85)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const valuePosition = (point.value - rangeMin) / (rangeMax - rangeMin);
    const y = height - valuePosition * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(91,110,245,0.15)";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function runTick() {
  if (!state.isFlowing) return;
  state.tickCount += 1;
  const incomeTotal = sumItems(state.incomes);
  const expenseTotal = sumItems(state.expenses);
  const delta = incomeTotal - expenseTotal;
  if (delta !== 0) {
    state.capital = +(state.capital + delta).toFixed(2);
    logEntry(`تدفق تلقائي: ${delta > 0 ? "+" : ""}${formatCurrency(delta)}`);
  }
  updateHistory();
  renderAndPersist();
}

function startLoop() {
  if (loopId) clearInterval(loopId);
  loopId = setInterval(runTick, state.tickInterval);
}

function sumItems(list) {
  return list.reduce((total, item) => total + item.amount * item.multiplier, 0);
}

function formatCurrency(value) {
  return numberFormatter.format(Math.round(value));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

init();

