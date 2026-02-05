const loginCard = document.getElementById("login-card");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");

const adminPanel = document.getElementById("admin-panel");
const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

const eventForm = document.getElementById("event-form");
const monthInput = document.getElementById("month-input");
const categoryInput = document.getElementById("category-input");
const firstInput = document.getElementById("first-input");
const secondInput = document.getElementById("second-input");
const thirdInput = document.getElementById("third-input");
const resetFormButton = document.getElementById("reset-form");
const formError = document.getElementById("form-error");

const yearFilter = document.getElementById("year-filter");
const overallTable = document.getElementById("overall-table");
const netTable = document.getElementById("net-table");
const stableTable = document.getElementById("stable-table");
const eventsTable = document.getElementById("events-table");

const TOKEN_KEY = "kimmane-admin-token";
let selectedYear = "all";

function setAdminView(isLoggedIn) {
  loginCard.classList.toggle("hidden", isLoggedIn);
  adminPanel.classList.toggle("hidden", !isLoggedIn);
}

function setStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("status--error", isError);
}

function setFormError(message) {
  formError.textContent = message || "";
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function ensureDefaultMonth() {
  if (monthInput.value) return;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  monthInput.value = `${now.getFullYear()}-${month}`;
}

function buildYearOptions(events) {
  const years = Array.from(
    new Set(events.map((event) => event.month.split("-")[0]))
  ).sort((a, b) => Number(b) - Number(a));

  yearFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All years";
  yearFilter.appendChild(allOption);

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  if (selectedYear !== "all" && !years.includes(selectedYear)) {
    selectedYear = "all";
  }
  yearFilter.value = selectedYear;
}

function renderTable(target, rows) {
  target.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="muted">No results yet.</td>`;
    target.appendChild(tr);
    return;
  }
  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.player}</td>
      <td>${row.points}</td>
    `;
    target.appendChild(tr);
  });
}

function renderEvents(events) {
  eventsTable.innerHTML = "";
  if (!events.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">No results yet.</td>`;
    eventsTable.appendChild(tr);
    return;
  }
  events.forEach((event) => {
    const [first, second, third] = event.placements;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${event.month}</td>
      <td>${event.category}</td>
      <td>${first.player}</td>
      <td>${second.player}</td>
      <td>${third.player}</td>
      <td><button class="btn btn--ghost" data-id="${event.id}">Remove</button></td>
    `;
    eventsTable.appendChild(tr);
  });
}

async function loadData() {
  const year = selectedYear;
  const [allEventsResponse, eventsResponse, leaderboardResponse] =
    await Promise.all([
      fetch("/api/events?year=all"),
      fetch(`/api/events?year=${encodeURIComponent(year)}`),
      fetch(`/api/leaderboard?year=${encodeURIComponent(year)}`),
    ]);

  const allEventsPayload = await allEventsResponse.json();
  const eventsPayload = await eventsResponse.json();
  const leaderboardPayload = await leaderboardResponse.json();

  buildYearOptions(allEventsPayload.events || []);
  renderTable(overallTable, leaderboardPayload.overall || []);
  renderTable(netTable, leaderboardPayload.byCategory?.["Net Stroke Play"] || []);
  renderTable(
    stableTable,
    leaderboardPayload.byCategory?.["Stable Ford"] || []
  );
  renderEvents(eventsPayload.events || []);
}

async function login(username, password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
  const payload = await response.json();
  setToken(payload.token);
}

async function addEvent(payload) {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    const errorPayload = await response.json();
    throw new Error(errorPayload.error || "Unable to save event.");
  }
}

async function removeEvent(id) {
  const response = await fetch(`/api/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (response.status === 401) {
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    const errorPayload = await response.json();
    throw new Error(errorPayload.error || "Unable to remove event.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  try {
    await login(usernameInput.value.trim() || undefined, passwordInput.value);
    passwordInput.value = "";
    setAdminView(true);
    ensureDefaultMonth();
    await loadData();
  } catch (error) {
    loginError.textContent = "Login failed. Check your credentials.";
  }
});

logoutButton.addEventListener("click", () => {
  setToken("");
  setAdminView(false);
  setStatus("");
});

yearFilter.addEventListener("change", async (event) => {
  selectedYear = event.target.value;
  await loadData();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError("");
  const month = monthInput.value;
  const category = categoryInput.value;
  const winners = [
    normalizeName(firstInput.value),
    normalizeName(secondInput.value),
    normalizeName(thirdInput.value),
  ];

  if (!month || !category) {
    setFormError("Please provide a month and category.");
    return;
  }

  if (winners.some((player) => !player)) {
    setFormError("Please enter all three player names.");
    return;
  }

  if (new Set(winners).size !== winners.length) {
    setFormError("Placements must be three different players.");
    return;
  }

  try {
    await addEvent({ month, category, winners });
    eventForm.reset();
    ensureDefaultMonth();
    setStatus("Results saved.");
    await loadData();
  } catch (error) {
    if (error.message === "unauthorized") {
      setToken("");
      setAdminView(false);
      setFormError("Session expired. Please log in again.");
      return;
    }
    setFormError(error.message);
  }
});

resetFormButton.addEventListener("click", () => {
  eventForm.reset();
  ensureDefaultMonth();
  setFormError("");
});

eventsTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  try {
    await removeEvent(button.dataset.id);
    setStatus("Entry removed.");
    await loadData();
  } catch (error) {
    if (error.message === "unauthorized") {
      setToken("");
      setAdminView(false);
      setStatus("Session expired. Please log in again.", true);
      return;
    }
    setStatus(error.message, true);
  }
});

const existingToken = getToken();
if (existingToken) {
  setAdminView(true);
  ensureDefaultMonth();
  loadData().catch(() => {
    setToken("");
    setAdminView(false);
  });
} else {
  setAdminView(false);
  ensureDefaultMonth();
}
