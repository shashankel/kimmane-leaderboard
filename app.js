const STORAGE_KEY = "kimmane-leaderboard-v1";
const CATEGORIES = ["Net Stroke Play", "Stable Ford"];
const POINTS = {
  1: 3,
  2: 2,
  3: 1,
};

const form = document.getElementById("event-form");
const monthInput = document.getElementById("month-input");
const categoryInput = document.getElementById("category-input");
const firstInput = document.getElementById("first-input");
const secondInput = document.getElementById("second-input");
const thirdInput = document.getElementById("third-input");
const playersList = document.getElementById("players-list");
const resetFormButton = document.getElementById("reset-form");
const formError = document.getElementById("form-error");

const yearFilter = document.getElementById("year-filter");
const overallTable = document.getElementById("overall-table");
const netTable = document.getElementById("net-table");
const stableTable = document.getElementById("stable-table");
const leaderName = document.getElementById("leader-name");
const leaderPoints = document.getElementById("leader-points");
const eventsTable = document.getElementById("events-table");

const downloadJsonButton = document.getElementById("download-json");
const uploadJsonInput = document.getElementById("upload-json");
const resetDataButton = document.getElementById("reset-data");
const backupStatus = document.getElementById("backup-status");

let state = loadState();
let selectedYear = "all";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { players: [], events: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid data");
    }
    return {
      players: Array.isArray(parsed.players) ? parsed.players : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch (error) {
    console.warn("Failed to read saved data", error);
    return { players: [], events: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function getMonthLabel(value) {
  if (!value) return "";
  const [year, month] = value.split("-");
  return `${year}-${month}`;
}

function getYear(value) {
  return value ? value.split("-")[0] : "";
}

function ensureDefaultMonth() {
  if (monthInput.value) return;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  monthInput.value = `${now.getFullYear()}-${month}`;
}

function setFormError(message) {
  formError.textContent = message || "";
}

function updatePlayersList() {
  playersList.innerHTML = "";
  const sortedPlayers = [...state.players].sort((a, b) => a.localeCompare(b));
  for (const player of sortedPlayers) {
    const option = document.createElement("option");
    option.value = player;
    playersList.appendChild(option);
  }
}

function eventExists(month, category) {
  return state.events.some(
    (event) => event.month === month && event.category === category
  );
}

function addEvent({ month, category, winners }) {
  const event = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    month,
    category,
    placements: [
      { position: 1, player: winners[0] },
      { position: 2, player: winners[1] },
      { position: 3, player: winners[2] },
    ],
    createdAt: new Date().toISOString(),
  };
  state.events.push(event);
  for (const player of winners) {
    if (!state.players.includes(player)) {
      state.players.push(player);
    }
  }
  saveState();
}

function removeEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  saveState();
}

function computeTotals(events) {
  const overall = new Map();
  const byCategory = {
    "Net Stroke Play": new Map(),
    "Stable Ford": new Map(),
  };

  for (const event of events) {
    for (const placement of event.placements) {
      const points = POINTS[placement.position] || 0;
      addPoints(overall, placement.player, points);
      if (!byCategory[event.category]) {
        byCategory[event.category] = new Map();
      }
      addPoints(byCategory[event.category], placement.player, points);
    }
  }

  return { overall, byCategory };
}

function addPoints(map, player, points) {
  map.set(player, (map.get(player) || 0) + points);
}

function mapToSortedRows(map) {
  return [...map.entries()]
    .map(([player, points]) => ({ player, points }))
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.player.localeCompare(b.player);
    });
}

function renderLeaderboardTable(target, rows) {
  target.innerHTML = "";
  if (!rows.length) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "muted";
    cell.textContent = "No results yet.";
    emptyRow.appendChild(cell);
    target.appendChild(emptyRow);
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
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="6" class="muted">No events yet.</td>`;
    eventsTable.appendChild(emptyRow);
    return;
  }

  const sorted = [...events].sort((a, b) => {
    if (a.month === b.month) {
      return a.category.localeCompare(b.category);
    }
    return a.month.localeCompare(b.month);
  });

  for (const event of sorted) {
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
  }
}

function rebuildYearFilter(events) {
  const years = Array.from(
    new Set(events.map((event) => getYear(event.month)).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const previous = selectedYear;
  yearFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All years";
  yearFilter.appendChild(allOption);

  for (const year of years) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  }

  if (years.includes(previous)) {
    selectedYear = previous;
  } else {
    selectedYear = "all";
  }
  yearFilter.value = selectedYear;
}

function filterEventsByYear(events) {
  if (selectedYear === "all") {
    return events;
  }
  return events.filter((event) => getYear(event.month) === selectedYear);
}

function renderLeaderHighlight(rows) {
  if (!rows.length) {
    leaderName.textContent = "No results yet";
    leaderPoints.textContent = "0 points";
    return;
  }
  leaderName.textContent = rows[0].player;
  leaderPoints.textContent = `${rows[0].points} points`;
}

function renderAll() {
  updatePlayersList();
  rebuildYearFilter(state.events);
  const filteredEvents = filterEventsByYear(state.events);
  const { overall, byCategory } = computeTotals(filteredEvents);
  const overallRows = mapToSortedRows(overall);
  const netRows = mapToSortedRows(byCategory["Net Stroke Play"] || new Map());
  const stableRows = mapToSortedRows(byCategory["Stable Ford"] || new Map());

  renderLeaderHighlight(overallRows);
  renderLeaderboardTable(overallTable, overallRows);
  renderLeaderboardTable(netTable, netRows);
  renderLeaderboardTable(stableTable, stableRows);
  renderEvents(filteredEvents);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setFormError("");
  const month = getMonthLabel(monthInput.value);
  const category = categoryInput.value;
  const winners = [
    normalizeName(firstInput.value),
    normalizeName(secondInput.value),
    normalizeName(thirdInput.value),
  ];

  if (!month || !category) {
    setFormError("Please provide the month and category.");
    return;
  }

  if (winners.some((player) => !player)) {
    setFormError("Please enter all three player names.");
    return;
  }

  const uniqueWinners = new Set(winners);
  if (uniqueWinners.size !== winners.length) {
    setFormError("Placements must be three different players.");
    return;
  }

  if (!CATEGORIES.includes(category)) {
    setFormError("Please select a valid category.");
    return;
  }

  if (eventExists(month, category)) {
    setFormError(
      "Results already exist for this month and category. Remove them first."
    );
    return;
  }

  addEvent({ month, category, winners });
  form.reset();
  ensureDefaultMonth();
  renderAll();
});

resetFormButton.addEventListener("click", () => {
  form.reset();
  ensureDefaultMonth();
  setFormError("");
});

yearFilter.addEventListener("change", (event) => {
  selectedYear = event.target.value;
  renderAll();
});

eventsTable.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = button.getAttribute("data-id");
  removeEvent(id);
  renderAll();
});

downloadJsonButton.addEventListener("click", () => {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kimmane-leaderboard.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  backupStatus.textContent = "Leaderboard data downloaded.";
});

uploadJsonInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.events)
      ) {
        throw new Error("Invalid data structure.");
      }
      state = {
        players: Array.isArray(parsed.players) ? parsed.players : [],
        events: parsed.events,
      };
      saveState();
      renderAll();
      backupStatus.textContent = "Leaderboard data restored.";
    } catch (error) {
      backupStatus.textContent = "Could not read that JSON file.";
    }
  };
  reader.readAsText(file);
  uploadJsonInput.value = "";
});

resetDataButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "This will remove all stored leaderboard data. Continue?"
  );
  if (!confirmed) return;
  state = { players: [], events: [] };
  saveState();
  renderAll();
  backupStatus.textContent = "All leaderboard data cleared.";
});

ensureDefaultMonth();
renderAll();
