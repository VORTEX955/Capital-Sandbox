const STORAGE_KEY = "capitalSandboxData";
const THEME_KEY = "capitalSandboxTheme";

const dom = {
  eventForm: document.getElementById("eventForm"),
  eventTitle: document.getElementById("eventTitle"),
  eventValue: document.getElementById("eventValue"),
  eventImpact: document.getElementById("eventImpact"),
  eventNote: document.getElementById("eventNote"),
  eventsTableBody: document.getElementById("eventsTableBody"),
  themeToggle: document.getElementById("themeToggle"),
};

let state = loadState();

initTheme();
renderEvents();
bindEvents();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { capital: 0, transactions: [], events: [] };
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  dom.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = dom.eventTitle.value.trim();
    const value = Number(dom.eventValue.value);
    const impact = dom.eventImpact.value;
    const note = dom.eventNote.value.trim();

    if (!title || !Number.isFinite(value)) return;

    state.events.unshift({
      id: crypto.randomUUID(),
      title,
      value,
      impact,
      note,
      timestamp: Date.now(),
    });

    saveState();
    renderEvents();
    dom.eventForm.reset();
  });

  dom.eventsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const id = button.dataset.id;
    state.events = state.events.filter((evt) => evt.id !== id);
    saveState();
    renderEvents();
  });

  dom.themeToggle.addEventListener("click", toggleTheme);
}

function renderEvents() {
  if (!dom.eventsTableBody) return;
  const events = state.events;
  if (!events.length) {
    dom.eventsTableBody.innerHTML =
      '<tr><td colspan="5" class="empty-row">لا توجد أحداث بعد</td></tr>';
    return;
  }

  dom.eventsTableBody.innerHTML = events
    .map((evt) => {
      const date = new Date(evt.timestamp).toLocaleDateString("ar-EG", {
        dateStyle: "medium",
      });
      const impactLabel = evt.impact === "increase" ? "زيادة" : "نقص";
      return `
        <tr>
          <td>
            <strong>${evt.title}</strong>
            <div class="muted">${date}</div>
          </td>
          <td>${formatCurrency(evt.value)}</td>
          <td>${impactLabel}</td>
          <td>${evt.note || "—"}</td>
          <td><button class="remove-btn" data-id="${evt.id}">حذف</button></td>
        </tr>
      `;
    })
    .join("");
}

function formatCurrency(value) {
  return Number(value).toLocaleString("ar-EG", {
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

