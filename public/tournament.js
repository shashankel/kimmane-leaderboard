const tournamentName = document.getElementById("tournament-name");
const tournamentDates = document.getElementById("tournament-dates");
const tournamentDescription = document.getElementById("tournament-description");
const tournamentCover = document.getElementById("tournament-cover");
const tournamentResults = document.getElementById("tournament-results");
const tournamentPhotos = document.getElementById("tournament-photos");
const tournamentSeries = document.getElementById("tournament-series");

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
  if (tournament.seriesId && tournament.seriesName) {
    const edition = tournament.editionLabel
      ? ` · ${tournament.editionLabel}`
      : "";
    tournamentSeries.innerHTML = `Part of the <a href="/series/${tournament.seriesId}">${tournament.seriesName}</a> series${edition}`;
  } else {
    tournamentSeries.textContent = tournament.editionLabel
      ? `Standalone tournament · ${tournament.editionLabel}`
      : "Standalone tournament";
  }
  renderCover(tournament.coverImage, tournament.name);
  renderResults(results);
  renderPhotos(photos);
}

function getTournamentId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || "";
}

async function loadTournament() {
  const tournamentId = getTournamentId();
  if (!tournamentId) {
    tournamentName.textContent = "Tournament not found";
    return;
  }
  const response = await fetch(`/api/tournaments/${tournamentId}`);
  if (!response.ok) {
    tournamentName.textContent = "Tournament not found";
    return;
  }
  const payload = await response.json();
  renderTournamentDetails(payload);
}

loadTournament();
