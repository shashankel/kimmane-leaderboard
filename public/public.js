const yearFilter = document.getElementById("year-filter");
const leaderName = document.getElementById("leader-name");
const leaderPoints = document.getElementById("leader-points");
const overallTable = document.getElementById("overall-table");
const netTable = document.getElementById("net-table");
const stableTable = document.getElementById("stable-table");
const eventsTable = document.getElementById("events-table");

let selectedYear = "all";

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

function renderLeader(rows) {
  if (!rows.length) {
    leaderName.textContent = "No results yet";
    leaderPoints.textContent = "0 points";
    return;
  }
  leaderName.textContent = rows[0].player;
  leaderPoints.textContent = `${rows[0].points} points`;
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
    tr.innerHTML = `<td colspan="5" class="muted">No results yet.</td>`;
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
  renderLeader(leaderboardPayload.overall || []);
  renderTable(overallTable, leaderboardPayload.overall || []);
  renderTable(netTable, leaderboardPayload.byCategory?.["Net Stroke Play"] || []);
  renderTable(
    stableTable,
    leaderboardPayload.byCategory?.["Stable Ford"] || []
  );
  renderEvents(eventsPayload.events || []);
}

yearFilter.addEventListener("change", (event) => {
  selectedYear = event.target.value;
  loadData().catch(() => {
    renderEvents([]);
  });
});

loadData().catch(() => {
  renderEvents([]);
});
