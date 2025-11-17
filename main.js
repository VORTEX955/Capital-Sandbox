const STORAGE_KEY = "capitalSandboxState-v2";

const defaultState = {
  capital: 12000,
  incomes: [],
  expenses: [],
  logs: [],
  history: [],
  tickInterval: 2000,
  isFlowing: true,
  tickCount: 0,
  variables: {
    growthBoost: 10,
    costPressure: 5,
    volatility: 15,
  },
  scenarioNote: "",
  snapshots: [],
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
  runwayDisplay: document.getElementById("runwayDisplay"),
  trendPill: document.getElementById("trendPill"),
  capitalForm: document.getElementById("capitalForm"),
  capitalDeltaInput: document.getElementById("capitalDeltaInput"),
  resetStateBtn: document.getElementById("resetStateBtn"),
  quickButtons: document.querySelectorAll(".quick-buttons button"),
  toggleFlowBtn: document.getElementById("toggleFlowBtn"),
  speedSlider: document.getElementById("speedSlider"),
  tickSpeedDisplay: document.getElementById("tickSpeedDisplay"),
  timeDisplay: document.getElementById("timeDisplay"),
  randomEventBtn: document.getElementById("randomEventBtn"),
  incomeForm: document.getElementById("incomeForm"),
  incomeName: document.getElementById("incomeName"),
  incomeAmount: document.getElementById("incomeAmount"),
  incomeCadence: document.getElementById("incomeCadence"),
  incomeMultiplier: document.getElementById("incomeMultiplier"),
  incomeMultiplierValue: document.getElementById("incomeMultiplierValue"),
  incomeList: document.getElementById("incomeList"),
  expenseForm: document.getElementById("expenseForm"),
  expenseName: document.getElementById("expenseName"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseCadence: document.getElementById("expenseCadence"),
  expenseMultiplier: document.getElementById("expenseMultiplier"),
  expenseMultiplierValue: document.getElementById("expenseMultiplierValue"),
  expenseList: document.getElementById("expenseList"),
  growthSlider: document.getElementById("growthSlider"),
  costSlider: document.getElementById("costSlider"),
  volatilitySlider: document.getElementById("volatilitySlider"),
  growthValue: document.getElementById("growthValue"),
  costValue: document.getElementById("costValue"),
  volatilityValue: document.getElementById("volatilityValue"),
  scenarioNote: document.getElementById("scenarioNote"),
  saveSnapshotBtn: document.getElementById("saveSnapshotBtn"),
  snapshotsList: document.getElementById("snapshotsList"),
  presetButtons: document.querySelectorAll(".preset-buttons button"),
  insightsList: document.getElementById("insightsList"),
  insightActions: document.querySelectorAll(".insight-actions button"),
  logsList: document.getElementById("logsList"),
  clearLogsBtn: document.getElementById("clearLogsBtn"),
  chart: document.getElementById("capitalChart"),
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const eventPool = [
  () => {
    const swing =
      randomBetween(200, 700) * (1 + state.variables.volatility / 200);
    state.capital += swing;
    return `دفعة إبداعية أضافت +${formatCurrency(swing)} لرأس المال`;
  },
  () => {
    if (!state.expenses.length) {
      const fee = randomBetween(120, 320);
      state.capital -= fee;
      return `رسوم غير متوقعة -${formatCurrency(fee)}`;
    }
    const target = pickRandom(state.expenses);
    target.amount = +(target.amount * 0.9).toFixed(2);
    return `تم تخفيف المصروف "${target.name}" بنسبة 10٪`;
  },
  () => {
    if (!state.incomes.length) {
      const bonus = 400;
      state.capital += bonus;
      return `تلقيت مكافأة +${formatCurrency(bonus)} لتعويض غياب الدخل`;
    }
    const stream = pickRandom(state.incomes);
    stream.multiplier = +(stream.multiplier * 1.2).toFixed(2);
    return `المصدر "${stream.name}" تحسّن بمعامل x${stream.multiplier.toFixed(
      2
    )}`;
  },
  () => {
    const drag =
      randomBetween(150, 450) * (1 + state.variables.volatility / 150);
    state.capital -= drag;
    return `اختبار مفاجئ سحب -${formatCurrency(drag)}`;
  },
  () => {
    if (!state.incomes.length || !state.expenses.length) {
      const neutral = 0;
      return "حدث عابر بدون تأثير لأن القوائم فارغة.";
    }
    const income = pickRandom(state.incomes);
    const expense = pickRandom(state.expenses);
    [income.cadence, expense.cadence] = [expense.cadence, income.cadence];
    return `تبدلت إيقاعات "${income.name}" و"${expense.name}" لجرعة حماس!`;
  },
];

const presets = {
  calm: { growthBoost: 6, costPressure: 2, volatility: 6 },
  balanced: { growthBoost: 12, costPressure: 6, volatility: 15 },
  aggressive: { growthBoost: 25, costPressure: 12, volatility: 32 },
};

init();

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
    if (!stored) return;
    const parsed = JSON.parse(stored);
    state = {
      ...clone(defaultState),
      ...parsed,
      incomes: parsed.incomes ?? [],
      expenses: parsed.expenses ?? [],
      logs: parsed.logs ?? [],
      history: parsed.history ?? [],
      snapshots: parsed.snapshots ?? [],
      variables: {
        ...defaultState.variables,
        ...(parsed.variables ?? {}),
      },
    };
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

  dom.resetStateBtn.addEventListener("click", () => {
    const confirmed = confirm("سيتم مسح كل شيء والعودة للوضع الافتراضي، متأكد؟");
    if (!confirmed) return;
    state = clone(defaultState);
    ensureHistorySeed();
    logEntry("تمت إعادة تهيئة Capital Sandbox");
    renderAll();
    startLoop();
    saveState();
  });

  dom.quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.delta);
      adjustCapital(delta, "تعديل سريع");
    });
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
    updateTickSpeedDisplay();
    startLoop();
    saveState();
  });

  dom.randomEventBtn.addEventListener("click", () => {
    const description = triggerEvent();
    logEntry(description);
    renderAndPersist();
  });

  dom.incomeMultiplier.addEventListener("input", () => {
    dom.incomeMultiplierValue.textContent = `x${Number(dom.incomeMultiplier.value).toFixed(2)}`;
  });

  dom.expenseMultiplier.addEventListener("input", () => {
    dom.expenseMultiplierValue.textContent = `x${Number(dom.expenseMultiplier.value).toFixed(2)}`;
  });

  dom.incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.incomeName.value.trim() || "دخل بدون اسم";
    const amount = Number(dom.incomeAmount.value);
    const multiplier = Number(dom.incomeMultiplier.value);
    const cadence = Number(dom.incomeCadence.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const item = createBudgetItem(name, amount, multiplier, cadence, "income");
    state.incomes.push(item);
    logEntry(`أُضيف مصدر دخل "${name}" بقيمة ${formatCurrency(amount)} (كل ${cadence} دورة)`);
    dom.incomeForm.reset();
    dom.incomeMultiplierValue.textContent = "x1.00";
    renderAndPersist();
  });

  dom.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = dom.expenseName.value.trim() || "مصروف بدون اسم";
    const amount = Number(dom.expenseAmount.value);
    const multiplier = Number(dom.expenseMultiplier.value);
    const cadence = Number(dom.expenseCadence.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const item = createBudgetItem(name, amount, multiplier, cadence, "expense");
    state.expenses.push(item);
    logEntry(`أُضيف مصروف "${name}" بقيمة ${formatCurrency(amount)} (كل ${cadence} دورة)`);
    dom.expenseForm.reset();
    dom.expenseMultiplierValue.textContent = "x1.00";
    renderAndPersist();
  });

  dom.growthSlider.addEventListener("input", () => {
    state.variables.growthBoost = Number(dom.growthSlider.value);
    renderScenarioValues();
    renderAndPersist();
  });

  dom.costSlider.addEventListener("input", () => {
    state.variables.costPressure = Number(dom.costSlider.value);
    renderScenarioValues();
    renderAndPersist();
  });

  dom.volatilitySlider.addEventListener("input", () => {
    state.variables.volatility = Number(dom.volatilitySlider.value);
    renderScenarioValues();
    renderAndPersist();
  });

  dom.scenarioNote.addEventListener("input", () => {
    state.scenarioNote = dom.scenarioNote.value.slice(0, 280);
    saveState();
  });

  dom.saveSnapshotBtn.addEventListener("click", () => {
    saveSnapshot();
  });

  dom.snapshotsList.addEventListener("click", (event) => {
    const loadId = event.target.closest("[data-snapshot-load]")?.dataset.snapshotLoad;
    const deleteId = event.target.closest("[data-snapshot-delete]")?.dataset.snapshotDelete;
    if (loadId) {
      loadSnapshot(loadId);
    } else if (deleteId) {
      deleteSnapshot(deleteId);
    }
  });

  dom.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const presetKey = button.dataset.preset;
      applyPreset(presetKey);
    });
  });

  dom.insightActions.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.pulse;
      applyPulseAction(action);
    });
  });

  dom.clearLogsBtn.addEventListener("click", () => {
    state.logs = [];
    renderLogs();
    saveState();
  });
}

function createBudgetItem(name, amount, multiplier, cadence, type) {
  return {
    id: makeId(),
    name,
    amount,
    multiplier,
    cadence,
    type,
  };
}

function adjustCapital(delta, reason, options = {}) {
  state.capital = +(state.capital + delta).toFixed(2);
  if (!options.silentLog) {
    logEntry(`${reason}: ${delta >= 0 ? "+" : ""}${formatCurrency(delta)}`);
  }
  updateHistory();
  if (!options.deferRender) {
    renderAndPersist();
  }
}

function renderAll() {
  renderScenarioValues();
  updateDisplays();
  renderBudgetLists();
  renderSnapshots();
  renderLogs();
  renderInsights();
  drawChart();
}

function renderAndPersist() {
  renderAll();
  saveState();
}

function updateDisplays() {
  const incomePerCycle = sumPerCycle(state.incomes);
  const expensePerCycle = sumPerCycle(state.expenses);
  const boostedIncome = incomePerCycle * (1 + state.variables.growthBoost / 100);
  const pressuredExpense = expensePerCycle * (1 + state.variables.costPressure / 100);
  const net = boostedIncome - pressuredExpense;

  dom.capitalDisplay.textContent = formatCurrency(state.capital);
  dom.netChangeDisplay.textContent = `${net >= 0 ? "+" : ""}${formatCurrency(net)}`;
  dom.incomeTotalDisplay.textContent = `+${formatCurrency(boostedIncome)}`;
  dom.expenseTotalDisplay.textContent = `-${formatCurrency(pressuredExpense)}`;
  dom.runwayDisplay.textContent = formatRunway(net);
  dom.timeDisplay.textContent = `${state.tickCount} دورة`;
  updateTrendPill();
  updateTickSpeedDisplay();
}

function renderScenarioValues() {
  dom.growthSlider.value = state.variables.growthBoost;
  dom.costSlider.value = state.variables.costPressure;
  dom.volatilitySlider.value = state.variables.volatility;
  dom.growthValue.textContent = `+${state.variables.growthBoost}٪`;
  dom.costValue.textContent = `+${state.variables.costPressure}٪`;
  dom.volatilityValue.textContent = `+${state.variables.volatility}٪`;
  dom.scenarioNote.value = state.scenarioNote;
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
    empty.textContent = type === "income" ? "أضف أول مصدر دخل." : "أضف أول مصروف.";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="badge">${item.cadence === 1 ? "كل دورة" : `كل ${item.cadence} دورات`}</div>
      </div>
      <label>
        القيمة
        <input type="number" value="${item.amount}" data-field="amount" data-id="${item.id}" data-type="${type}" min="0" step="50" />
      </label>
      <label>
        المعامل
        <input type="range" min="0.25" max="3" step="0.25" value="${item.multiplier}" data-field="multiplier" data-id="${item.id}" data-type="${type}" />
        <span class="muted">x${item.multiplier.toFixed(2)}</span>
      </label>
      <label>
        التكرار
        <select data-field="cadence" data-id="${item.id}" data-type="${type}">
          <option value="1" ${item.cadence === 1 ? "selected" : ""}>كل دورة</option>
          <option value="2" ${item.cadence === 2 ? "selected" : ""}>كل دورتين</option>
          <option value="4" ${item.cadence === 4 ? "selected" : ""}>كل 4 دورات</option>
          <option value="6" ${item.cadence === 6 ? "selected" : ""}>كل 6 دورات</option>
        </select>
      </label>
      <div>
        <span class="muted">متوسط الدورة</span>
        <strong>${formatCurrency(calcPerCycle(item))}</strong>
      </div>
      <button data-action="remove" data-type="${type}" data-id="${item.id}">إزالة</button>
    `;
    container.appendChild(li);
  });

  container.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      const id = event.target.dataset.id;
      const listType = event.target.dataset.type;
      const value = field === "cadence" ? Number(event.target.value) : Number(event.target.value);
      if (!Number.isFinite(value)) return;
      updateBudgetItem(listType, id, field, value);
      if (field === "multiplier" && event.target.nextElementSibling) {
        event.target.nextElementSibling.textContent = `x${value.toFixed(2)}`;
      }
    });
  });

  container.querySelectorAll("button[data-action='remove']").forEach((button) => {
    button.addEventListener("click", () => {
      removeBudgetItem(button.dataset.type, button.dataset.id);
    });
  });
}

function updateBudgetItem(type, id, field, value) {
  const list = type === "income" ? state.incomes : state.expenses;
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  if (field === "amount") {
    item.amount = Math.max(value, 0);
  } else if (field === "multiplier") {
    item.multiplier = Math.max(value, 0.1);
  } else if (field === "cadence") {
    item.cadence = Math.max(1, Math.round(value));
  }
  logEntry(`تم تعديل ${type === "income" ? "الدخل" : "المصروف"} "${item.name}"`);
  renderAndPersist();
}

function removeBudgetItem(type, id) {
  const listKey = type === "income" ? "incomes" : "expenses";
  const list = state[listKey];
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const [removed] = list.splice(index, 1);
  logEntry(`حُذف "${removed.name}" من ${type === "income" ? "الدخل" : "المصاريف"}`);
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

  state.logs.slice(-60).forEach((log) => {
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
  state.logs = state.logs.slice(-120);
}

function renderSnapshots() {
  dom.snapshotsList.innerHTML = "";
  if (!state.snapshots.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "احفظ أول لقطة لتعود لها لاحقًا.";
    dom.snapshotsList.appendChild(empty);
    return;
  }

  state.snapshots.slice(-6).forEach((snapshot) => {
    const li = document.createElement("li");
    li.className = "snapshot-card";
    li.innerHTML = `
      <div>
        <strong>${snapshot.name}</strong>
        <div class="muted">${snapshot.meta}</div>
      </div>
      <div>
        <button class="ghost-button" data-snapshot-load="${snapshot.id}">تحميل</button>
        <button class="ghost-button" data-snapshot-delete="${snapshot.id}">حذف</button>
      </div>
    `;
    dom.snapshotsList.prepend(li);
  });
}

function saveSnapshot() {
  const snapshot = {
    id: makeId(),
    name: state.scenarioNote || `لقطة ${state.snapshots.length + 1}`,
    capital: state.capital,
    variables: clone(state.variables),
    incomes: clone(state.incomes),
    expenses: clone(state.expenses),
    meta: new Date().toLocaleString("ar-EG", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  state.snapshots.push(snapshot);
  state.snapshots = state.snapshots.slice(-8);
  logEntry("تم حفظ لقطة جديدة للسيناريو");
  renderAndPersist();
}

function loadSnapshot(id) {
  const snapshot = state.snapshots.find((snap) => snap.id === id);
  if (!snapshot) return;
  state.capital = snapshot.capital;
  state.variables = clone(snapshot.variables);
  state.incomes = clone(snapshot.incomes);
  state.expenses = clone(snapshot.expenses);
  logEntry(`تم تحميل لقطة "${snapshot.name}"`);
  ensureHistorySeed();
  renderAndPersist();
}

function deleteSnapshot(id) {
  state.snapshots = state.snapshots.filter((snap) => snap.id !== id);
  logEntry("تم حذف لقطة");
  renderAndPersist();
}

function renderInsights() {
  const insights = generateInsights();
  dom.insightsList.innerHTML = "";
  insights.forEach((insight) => {
    const li = document.createElement("li");
    li.className = "insight-card";
    li.innerHTML = `
      <span>${insight.title}</span>
      <strong>${insight.value}</strong>
      <small>${insight.detail}</small>
    `;
    dom.insightsList.appendChild(li);
  });
}

function generateInsights() {
  const incomePerCycle = sumPerCycle(state.incomes) * (1 + state.variables.growthBoost / 100);
  const expensePerCycle = sumPerCycle(state.expenses) * (1 + state.variables.costPressure / 100);
  const ratio = expensePerCycle ? incomePerCycle / expensePerCycle : incomePerCycle ? Infinity : 0;

  const history = state.history;
  const recent = history.slice(-8).map((point) => point.value);
  const mid = recent.length ? recent[0] : state.capital;
  const trend = recent.length ? recent[recent.length - 1] - mid : 0;

  return [
    {
      title: " اتجاه المسار",
      value: `${trend >= 0 ? "+" : ""}${formatCurrency(trend)}`,
      detail: "مقارنة آخر 8 نقاط مع بدايتها.",
    },
    {
      title: "معامل التوازن",
      value: ratio === Infinity ? "∞" : `${ratio.toFixed(2)}x`,
      detail:
        ratio >= 1
          ? "الدخل يغطي المصاريف مع هامش إيجابي."
          : "المصاريف تتفوق، راجع السيناريو.",
    },
    {
      title: "ملاحظتك",
      value: state.scenarioNote ? state.scenarioNote : "أضف ملاحظة لتوثيق السيناريو.",
      detail: state.scenarioNote ? "تساعدك الملاحظة في تذكر الحالة." : "اكتب ما يحدث الآن لتعود إليه.",
    },
    {
      title: "حساسية الأحداث",
      value: `+${state.variables.volatility}٪`,
      detail: "كلما زادت الحساسية زادت فرص المفاجآت الممتعة أو القوية.",
    },
  ];
}

function drawChart() {
  const ctx = dom.chart.getContext("2d");
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#040916";
  ctx.fillRect(0, 0, width, height);

  const data = state.history;
  if (data.length < 2) return;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || 1) * 0.15;
  const rangeMin = min - padding;
  const rangeMax = max + padding;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(91,110,245,0.45)");
  gradient.addColorStop(1, "rgba(91,110,245,0.02)");

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = "rgba(112,131,255,0.95)";
  ctx.lineWidth = 2.5;

  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const valuePosition = (point.value - rangeMin) / (rangeMax - rangeMin || 1);
    const y = height - valuePosition * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function runTick() {
  if (!state.isFlowing) return;
  state.tickCount += 1;
  const incomeDelta = computeRuntimeDelta(state.incomes) * (1 + state.variables.growthBoost / 100);
  const expenseDelta =
    computeRuntimeDelta(state.expenses) * (1 + state.variables.costPressure / 100);
  const delta = +(incomeDelta - expenseDelta).toFixed(2);
  if (delta !== 0) {
    adjustCapital(delta, "تدفق تلقائي", { deferRender: true });
  }
  maybeAmbientEvent();
  updateHistory();
  renderAndPersist();
}

function startLoop() {
  if (loopId) clearInterval(loopId);
  loopId = setInterval(runTick, state.tickInterval);
}

function ensureHistorySeed() {
  if (!state.history.length) {
    state.history = [{ value: state.capital }];
  }
}

function updateHistory() {
  state.history.push({ value: state.capital });
  if (state.history.length > 240) {
    state.history.shift();
  }
}

function computeRuntimeDelta(list) {
  return list.reduce((total, item) => {
    if (state.tickCount % item.cadence !== 0) return total;
    return total + item.amount * item.multiplier;
  }, 0);
}

function sumPerCycle(list) {
  return list.reduce((total, item) => total + calcPerCycle(item), 0);
}

function calcPerCycle(item) {
  return (item.amount * item.multiplier) / item.cadence;
}

function updateTrendPill() {
  const history = state.history;
  if (history.length < 2) {
    dom.trendPill.textContent = "لا بيانات كافية بعد";
    return;
  }
  const last = history[history.length - 1].value;
  const prev = history[history.length - 2].value;
  const diff = last - prev;
  dom.trendPill.textContent = `${diff >= 0 ? "+" : ""}${formatCurrency(diff)} خلال آخر دورة`;
}

function formatRunway(net) {
  if (net >= 0) return "∞";
  if (state.capital <= 0) return "0";
  const cycles = Math.floor(state.capital / Math.abs(net));
  return `${Math.max(cycles, 0)} دورة`;
}

function updateTickSpeedDisplay() {
  dom.tickSpeedDisplay.textContent = `سرعة: ${(state.tickInterval / 1000).toFixed(1)}ث`;
}

function triggerEvent() {
  const fn = pickRandom(eventPool);
  return fn();
}

function maybeAmbientEvent() {
  const chance = state.variables.volatility / 500;
  if (Math.random() > chance) return;
  const description = triggerEvent();
  logEntry(description);
}

function applyPreset(key) {
  const preset = presets[key];
  if (!preset) return;
  state.variables = { ...state.variables, ...preset };
  renderScenarioValues();
  logEntry(`طُبق وضع ${key === "calm" ? "مطمئن" : key === "balanced" ? "متوازن" : "هجومي"}`);
  renderAndPersist();
}

function applyPulseAction(action) {
  if (action === "boost") {
    if (!state.incomes.length) {
      const instant = createBudgetItem("دفعة تلقائية", 600, 1, 1, "income");
      state.incomes.push(instant);
    } else {
      const target = pickRandom(state.incomes);
      target.amount = +(target.amount * 1.25).toFixed(2);
    }
    logEntry("تم تعزيز مصادر الدخل");
  } else if (action === "trim") {
    if (!state.expenses.length) {
      adjustCapital(300, "ترشيد سريع", { silentLog: true, deferRender: true });
    } else {
      state.expenses.forEach((expense) => {
        expense.amount = +(expense.amount * 0.92).toFixed(2);
      });
    }
    logEntry("تم ترشيد المصاريف");
  } else if (action === "shock") {
    state.variables.volatility = Math.min(60, state.variables.volatility + 10);
    const description = triggerEvent();
    logEntry(`اختبار صدمة: ${description}`);
  }
  renderAndPersist();
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

