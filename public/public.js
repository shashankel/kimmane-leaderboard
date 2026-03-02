const tournamentList = document.getElementById("tournament-list");
const tournamentEmpty = document.getElementById("tournament-empty");
const tournamentName = document.getElementById("tournament-name");
const tournamentDates = document.getElementById("tournament-dates");
const tournamentDescription = document.getElementById("tournament-description");
const tournamentCover = document.getElementById("tournament-cover");
const tournamentResults = document.getElementById("tournament-results");
const tournamentPhotos = document.getElementById("tournament-photos");

let tournaments = [];
let activeTournamentId = null;

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

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatPlacementRank(position) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return `${position}th`;
}

function renderTournamentList() {
  tournamentList.innerHTML = "";
  if (!tournaments.length) {
    tournamentEmpty.classList.remove("hidden");
    return;
  }
  tournamentEmpty.classList.add("hidden");
  tournaments.forEach((tournament) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "tournament-card";
    if (tournament.id === activeTournamentId) {
      card.classList.add("tournament-card--active");
    }
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
    card.addEventListener("click", () => selectTournament(tournament.id));
    tournamentList.appendChild(card);
  });
}

function renderCover(image, name) {
  if (!image) {
    tournamentCover.classList.add("hidden");
    tournamentCover.src = "";
    return;
  }
  tournamentCover.classList.remove("hidden");
  tournamentCover.src = image;
  tournamentCover.alt = `${name} cover`;
}

function renderResults(results) {
  tournamentResults.innerHTML = "";
  if (!results.length) {
    tournamentResults.innerHTML =
      '<p class="muted">No results published yet.</p>';
    return;
  }
  results.forEach((result) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const dateLabel = result.eventDate
      ? `<p class="muted">${formatDate(result.eventDate)}</p>`
      : "";
    const placements = result.placements
      .map((placement) => {
        const photo = placement.photo
          ? `<img src="${placement.photo}" alt="${placement.player}" />`
          : `<div class="placement__placeholder">${getInitials(
              placement.player
            )}</div>`;
        return `
          <div class="placement-card">
            <div class="placement-card__rank">${formatPlacementRank(
              placement.position
            )}</div>
            <div class="placement-card__photo">${photo}</div>
            <div class="placement-card__name">${placement.player}</div>
          </div>
        `;
      })
      .join("");
    card.innerHTML = `
      <div class="result-card__header">
        <h4>${result.category}</h4>
        ${dateLabel}
      </div>
      <div class="placement-grid">
        ${placements}
      </div>
    `;
    tournamentResults.appendChild(card);
  });
}

function renderPhotos(photos) {
  tournamentPhotos.innerHTML = "";
  if (!photos.length) {
    tournamentPhotos.innerHTML =
      '<p class="muted">No photos available yet.</p>';
    return;
  }
  photos.forEach((photo) => {
    const figure = document.createElement("figure");
    figure.className = "photo-card";
    figure.innerHTML = `
      <img src="${photo.image}" alt="${photo.caption || "Tournament photo"}" />
      ${
        photo.caption
          ? `<figcaption class="muted">${photo.caption}</figcaption>`
          : ""
      }
    `;
    tournamentPhotos.appendChild(figure);
  });
}

function renderTournamentDetails(payload) {
  const { tournament, results = [], photos = [] } = payload;
  tournamentName.textContent = tournament.name;
  tournamentDates.textContent = formatDateRange(
    tournament.startDate,
    tournament.endDate
  );
  tournamentDescription.textContent = tournament.description || "";
  renderCover(tournament.coverImage, tournament.name);
  renderResults(results);
  renderPhotos(photos);
}

async function selectTournament(id) {
  activeTournamentId = id;
  renderTournamentList();
  const response = await fetch(`/api/tournaments/${id}`);
  if (!response.ok) {
    return;
  }
  const payload = await response.json();
  renderTournamentDetails(payload);
}

async function loadTournaments() {
  const response = await fetch("/api/tournaments");
  const payload = await response.json();
  tournaments = payload.tournaments || [];
  activeTournamentId = tournaments[0]?.id || null;
  renderTournamentList();
  if (activeTournamentId) {
    await selectTournament(activeTournamentId);
  }
}

loadTournaments().catch(() => {
  tournamentEmpty.classList.remove("hidden");
});
