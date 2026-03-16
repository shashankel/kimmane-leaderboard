const seriesName = document.getElementById("series-name");
const seriesDates = document.getElementById("series-dates");
const seriesDescription = document.getElementById("series-description");
const seriesCover = document.getElementById("series-cover");
const overallTable = document.getElementById("overall-table");
const categoryTables = document.getElementById("category-tables");
const seriesEditions = document.getElementById("series-editions");

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates TBD";
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  return startDate ? `Starts ${formatDate(startDate)}` : `Ends ${formatDate(endDate)}`;
}

function formatPlacementRank(position) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return `${position}th`;
}

function renderCover(image, name) {
  if (!image) {
    seriesCover.classList.add("hidden");
    seriesCover.src = "";
    return;
  }
  seriesCover.classList.remove("hidden");
  seriesCover.src = image;
  seriesCover.alt = `${name} cover`;
}

function renderTable(target, rows) {
  target.innerHTML = "";
  if (!rows.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3" class="muted">No results yet.</td>';
    target.appendChild(row);
    return;
  }
  rows.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.player}</td>
      <td>${entry.points}</td>
    `;
    target.appendChild(row);
  });
}

function renderCategoryTables(byCategory) {
  categoryTables.innerHTML = "";
  const categories = Object.keys(byCategory || {});
  if (!categories.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "No category results yet.";
    categoryTables.appendChild(message);
    return;
  }
  categories.forEach((category) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <h4>${category}</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    const tbody = wrapper.querySelector("tbody");
    renderTable(tbody, byCategory[category]);
    categoryTables.appendChild(wrapper);
  });
}

function renderEditions(editions) {
  seriesEditions.innerHTML = "";
  if (!editions.length) {
    seriesEditions.innerHTML = '<p class="muted">No editions published yet.</p>';
    return;
  }
  editions.forEach((edition) => {
    const card = document.createElement("div");
    card.className = "edition-card";
    const label = edition.tournament.editionLabel
      ? `<span class="tag">${edition.tournament.editionLabel}</span>`
      : "";
    const results = edition.results
      .map((result) => {
        const placements = result.placements
          .map(
            (placement) =>
              `${formatPlacementRank(placement.position)} — ${placement.player}`
          )
          .join("<br/>");
        return `
          <div class="edition-result">
            <strong>${result.category}</strong>
            <div class="muted">${placements}</div>
          </div>
        `;
      })
      .join("");
    card.innerHTML = `
      <div class="edition-card__header">
        <div>
          <h3>${edition.tournament.name}</h3>
          <p class="muted">${formatDateRange(
            edition.tournament.startDate,
            edition.tournament.endDate
          )}</p>
        </div>
        ${label}
      </div>
      <div class="edition-card__results">
        ${results || '<p class="muted">No results yet.</p>'}
      </div>
      <a class="btn btn--ghost" href="/tournaments/${edition.tournament.id}">
        View full tournament
      </a>
    `;
    seriesEditions.appendChild(card);
  });
}

function getSeriesId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || "";
}

async function loadSeries() {
  const seriesId = getSeriesId();
  if (!seriesId) return;
  const response = await fetch(`/api/series/${seriesId}`);
  if (!response.ok) {
    seriesName.textContent = "Series not found";
    return;
  }
  const payload = await response.json();
  seriesName.textContent = payload.series.name;
  seriesDates.textContent = formatDateRange(
    payload.series.startDate,
    payload.series.endDate
  );
  seriesDescription.textContent = payload.series.description || "";
  renderCover(payload.series.coverImage, payload.series.name);
  renderTable(overallTable, payload.leaderboard?.overall || []);
  renderCategoryTables(payload.leaderboard?.byCategory || {});
  renderEditions(payload.editions || []);
}

loadSeries();
