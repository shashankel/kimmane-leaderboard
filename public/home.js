const tournamentList = document.getElementById("tournament-list");
const tournamentEmpty = document.getElementById("tournament-empty");
const seriesList = document.getElementById("series-list");
const seriesEmpty = document.getElementById("series-empty");

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

function renderTournamentCards(tournaments) {
  tournamentList.innerHTML = "";
  if (!tournaments.length) {
    tournamentEmpty.classList.remove("hidden");
    return;
  }
  tournamentEmpty.classList.add("hidden");
  tournaments.forEach((tournament) => {
    const card = document.createElement("a");
    card.href = `/tournaments/${tournament.id}`;
    card.className = "tournament-card";
    const cover = tournament.coverImage
      ? `<img src="${tournament.coverImage}" alt="${tournament.name} cover" />`
      : `<div class="tournament-card__placeholder">KG</div>`;
    card.innerHTML = `
      <div class="tournament-card__media">
        ${cover}
      </div>
      <div class="tournament-card__body">
        <h3>${tournament.name}</h3>
        <p class="muted">${formatDateRange(
          tournament.startDate,
          tournament.endDate
        )}</p>
      </div>
    `;
    tournamentList.appendChild(card);
  });
}

function renderSeriesCards(series) {
  seriesList.innerHTML = "";
  if (!series.length) {
    seriesEmpty.classList.remove("hidden");
    return;
  }
  seriesEmpty.classList.add("hidden");
  series.forEach((item) => {
    const card = document.createElement("a");
    card.href = `/series/${item.id}`;
    card.className = "tournament-card tournament-card--series";
    const cover = item.coverImage
      ? `<img src="${item.coverImage}" alt="${item.name} cover" />`
      : `<div class="tournament-card__placeholder">Series</div>`;
    card.innerHTML = `
      <div class="tournament-card__media">
        ${cover}
      </div>
      <div class="tournament-card__body">
        <div class="tag">Series</div>
        <h3>${item.name}</h3>
        <p class="muted">${formatDateRange(item.startDate, item.endDate)}</p>
      </div>
    `;
    seriesList.appendChild(card);
  });
}

async function loadHome() {
  const [tournamentResponse, seriesResponse] = await Promise.all([
    fetch("/api/tournaments"),
    fetch("/api/series"),
  ]);
  const tournamentPayload = await tournamentResponse.json();
  const seriesPayload = await seriesResponse.json();

  const standalone = (tournamentPayload.tournaments || []).filter(
    (tournament) => !tournament.seriesId
  );
  renderTournamentCards(standalone);
  renderSeriesCards(seriesPayload.series || []);
}

loadHome().catch(() => {
  tournamentEmpty.classList.remove("hidden");
  seriesEmpty.classList.remove("hidden");
});
