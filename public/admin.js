const loginCard = document.getElementById("login-card");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");

const adminPanel = document.getElementById("admin-panel");
const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

const seriesForm = document.getElementById("series-form");
const seriesNameInput = document.getElementById("series-name-input");
const seriesStartInput = document.getElementById("series-start-input");
const seriesEndInput = document.getElementById("series-end-input");
const seriesDescriptionInput = document.getElementById(
  "series-description-input"
);
const seriesError = document.getElementById("series-error");

const tournamentForm = document.getElementById("tournament-form");
const tournamentNameInput = document.getElementById("tournament-name-input");
const seriesSelectInput = document.getElementById("series-select-input");
const editionLabelInput = document.getElementById("edition-label-input");
const tournamentStartInput = document.getElementById("tournament-start-input");
const tournamentEndInput = document.getElementById("tournament-end-input");
const tournamentDescriptionInput = document.getElementById(
  "tournament-description-input"
);
const tournamentError = document.getElementById("tournament-error");
const tournamentSelect = document.getElementById("tournament-select");
const tournamentSummary = document.getElementById("tournament-summary");
const tournamentUpdateForm = document.getElementById("tournament-update-form");
const tournamentUpdateName = document.getElementById("tournament-update-name");
const tournamentUpdateStart = document.getElementById("tournament-update-start");
const tournamentUpdateEnd = document.getElementById("tournament-update-end");
const tournamentUpdateDescription = document.getElementById(
  "tournament-update-description"
);
const seriesSelectUpdate = document.getElementById("series-select-update");
const editionLabelUpdate = document.getElementById("edition-label-update");
const tournamentUpdateError = document.getElementById("tournament-update-error");
const tournamentDeleteButton = document.getElementById("tournament-delete");

const photoForm = document.getElementById("photo-form");
const photoInput = document.getElementById("photo-input");
const photoCaptionInput = document.getElementById("photo-caption-input");
const photoCoverInput = document.getElementById("photo-cover-input");
const photoError = document.getElementById("photo-error");
const photoGrid = document.getElementById("photo-grid");

const resultForm = document.getElementById("result-form");
const categoryInput = document.getElementById("category-input");
const eventDateInput = document.getElementById("event-date-input");
const firstInput = document.getElementById("first-input");
const firstPhotoInput = document.getElementById("first-photo-input");
const secondInput = document.getElementById("second-input");
const secondPhotoInput = document.getElementById("second-photo-input");
const thirdInput = document.getElementById("third-input");
const thirdPhotoInput = document.getElementById("third-photo-input");
const resetFormButton = document.getElementById("reset-form");
const formError = document.getElementById("form-error");

const resultsTable = document.getElementById("results-table");

const TOKEN_KEY = "kimmane-admin-token";
let tournaments = [];
let series = [];
let activeTournamentId = null;

function setAdminView(isLoggedIn) {
  loginCard.classList.toggle("hidden", isLoggedIn);
  adminPanel.classList.toggle("hidden", !isLoggedIn);
}

function setStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("status--error", isError);
}

function setFormError(target, message) {
  target.textContent = message || "";
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

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function ensureActiveTournament() {
  if (activeTournamentId) return true;
  setStatus("Create or select a tournament to continue.", true);
  return false;
}

function renderTournamentSelect() {
  tournamentSelect.innerHTML = "";
  if (!tournaments.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No tournaments available";
    tournamentSelect.appendChild(option);
    tournamentSelect.disabled = true;
    activeTournamentId = null;
    return;
  }
  tournamentSelect.disabled = false;
  tournaments.forEach((tournament) => {
    const option = document.createElement("option");
    option.value = tournament.id;
    option.textContent = tournament.seriesName
      ? `${tournament.name} (${tournament.seriesName})`
      : tournament.name;
    tournamentSelect.appendChild(option);
  });
  if (activeTournamentId && tournaments.some((t) => t.id === activeTournamentId)) {
    tournamentSelect.value = activeTournamentId;
  } else {
    activeTournamentId = tournaments[0]?.id || null;
    tournamentSelect.value = activeTournamentId || "";
  }
}

function renderTournamentSummary(tournament) {
  if (!tournament) {
    tournamentSummary.textContent = "No tournament selected.";
    return;
  }
  const label = tournament.editionLabel ? ` · ${tournament.editionLabel}` : "";
  const seriesLabel = tournament.seriesName
    ? ` · Series: ${tournament.seriesName}`
    : "";
  tournamentSummary.textContent = `${tournament.name}${label}${seriesLabel} · ${formatDateRange(
    tournament.startDate,
    tournament.endDate
  )}`;
}

function renderPhotos(photos) {
  photoGrid.innerHTML = "";
  if (!photos.length) {
    photoGrid.innerHTML = '<p class="muted">No photos uploaded yet.</p>';
    return;
  }
  photos.forEach((photo) => {
    const card = document.createElement("div");
    card.className = "photo-card photo-card--admin";
    card.innerHTML = `
      <img src="${photo.image}" alt="${photo.caption || "Tournament photo"}" />
      <div class="photo-card__meta">
        <div>
          <p class="muted">${photo.caption || "No caption"}</p>
          ${photo.isCover ? '<span class="tag">Cover</span>' : ""}
        </div>
        <button class="btn btn--ghost" data-photo-id="${photo.id}">Remove</button>
      </div>
    `;
    photoGrid.appendChild(card);
  });
}

function renderResults(results) {
  resultsTable.innerHTML = "";
  if (!results.length) {
    resultsTable.innerHTML =
      '<tr><td colspan="6" class="muted">No results published yet.</td></tr>';
    return;
  }
  results.forEach((result) => {
    const [first, second, third] = result.placements;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${result.category}</td>
      <td>${result.eventDate ? formatDate(result.eventDate) : "-"}</td>
      <td>${first.player}</td>
      <td>${second.player}</td>
      <td>${third.player}</td>
      <td>
        <button class="btn btn--ghost" data-result-id="${result.id}">
          Remove
        </button>
      </td>
    `;
    resultsTable.appendChild(row);
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (response.status === 401) {
    setToken("");
    setAdminView(false);
    throw new Error("unauthorized");
  }
  return response;
}

async function loadTournaments() {
  const response = await fetch("/api/tournaments");
  const payload = await response.json();
  tournaments = payload.tournaments || [];
  renderTournamentSelect();
  await loadTournamentDetails(activeTournamentId);
}

function renderSeriesSelect() {
  seriesSelectInput.innerHTML = "";
  seriesSelectUpdate.innerHTML = "";
  const standaloneOption = document.createElement("option");
  standaloneOption.value = "";
  standaloneOption.textContent = "Standalone tournament";
  seriesSelectInput.appendChild(standaloneOption);
  seriesSelectUpdate.appendChild(standaloneOption.cloneNode(true));

  series.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    seriesSelectInput.appendChild(option);
    seriesSelectUpdate.appendChild(option.cloneNode(true));
  });
}

async function loadSeries() {
  const response = await fetch("/api/series");
  const payload = await response.json();
  series = payload.series || [];
  renderSeriesSelect();
}

async function loadTournamentDetails(tournamentId) {
  if (!tournamentId) {
    renderTournamentSummary(null);
    renderPhotos([]);
    renderResults([]);
    tournamentUpdateForm.reset();
    tournamentUpdateForm.classList.add("hidden");
    return;
  }
  const response = await fetch(`/api/tournaments/${tournamentId}`);
  const payload = await response.json();
  renderTournamentSummary(payload.tournament);
  renderPhotos(payload.photos || []);
  renderResults(payload.results || []);
  tournamentUpdateForm.classList.remove("hidden");
  tournamentUpdateName.value = payload.tournament.name || "";
  tournamentUpdateStart.value = payload.tournament.startDate || "";
  tournamentUpdateEnd.value = payload.tournament.endDate || "";
  tournamentUpdateDescription.value = payload.tournament.description || "";
  editionLabelUpdate.value = payload.tournament.editionLabel || "";
  seriesSelectUpdate.value = payload.tournament.seriesId || "";
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

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(loginError, "");
  try {
    await login(usernameInput.value.trim() || undefined, passwordInput.value);
    passwordInput.value = "";
    setAdminView(true);
    await loadSeries();
    await loadTournaments();
  } catch (error) {
    setFormError(loginError, "Login failed. Check your credentials.");
  }
});

logoutButton.addEventListener("click", () => {
  setToken("");
  setAdminView(false);
  setStatus("");
});

tournamentSelect.addEventListener("change", async (event) => {
  activeTournamentId = event.target.value;
  await loadTournamentDetails(activeTournamentId);
});

tournamentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(tournamentError, "");
  try {
    const response = await apiRequest("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tournamentNameInput.value.trim(),
        seriesId: seriesSelectInput.value || null,
        editionLabel: editionLabelInput.value.trim(),
        startDate: tournamentStartInput.value,
        endDate: tournamentEndInput.value,
        description: tournamentDescriptionInput.value.trim(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Failed to create tournament.");
    }
    tournamentForm.reset();
    renderSeriesSelect();
    await loadTournaments();
    setStatus("Tournament created.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setFormError(tournamentError, error.message);
  }
});

tournamentUpdateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(tournamentUpdateError, "");
  if (!ensureActiveTournament()) return;
  if (!tournamentUpdateName.value.trim()) {
    setFormError(tournamentUpdateError, "Tournament name is required.");
    return;
  }
  try {
    const response = await apiRequest(`/api/tournaments/${activeTournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tournamentUpdateName.value.trim(),
        seriesId: seriesSelectUpdate.value || null,
        editionLabel: editionLabelUpdate.value.trim(),
        startDate: tournamentUpdateStart.value,
        endDate: tournamentUpdateEnd.value,
        description: tournamentUpdateDescription.value.trim(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to update tournament.");
    }
    await loadTournaments();
    setStatus("Tournament updated.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setFormError(tournamentUpdateError, error.message);
  }
});

tournamentDeleteButton.addEventListener("click", async () => {
  if (!ensureActiveTournament()) return;
  const tournament = tournaments.find((item) => item.id === activeTournamentId);
  const name = tournament?.name || "this tournament";
  const confirmed = window.confirm(
    `Delete ${name} and all its results/photos? This cannot be undone.`
  );
  if (!confirmed) return;
  try {
    const response = await apiRequest(`/api/tournaments/${activeTournamentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to delete tournament.");
    }
    await loadTournaments();
    setStatus("Tournament deleted.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setStatus(error.message, true);
  }
});

seriesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(seriesError, "");
  try {
    const response = await apiRequest("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: seriesNameInput.value.trim(),
        startDate: seriesStartInput.value,
        endDate: seriesEndInput.value,
        description: seriesDescriptionInput.value.trim(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Failed to create series.");
    }
    seriesForm.reset();
    await loadSeries();
    setStatus("Series created.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setFormError(seriesError, error.message);
  }
});

photoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(photoError, "");
  if (!ensureActiveTournament()) return;
  if (!photoInput.files?.length) {
    setFormError(photoError, "Please select a photo to upload.");
    return;
  }
  const formData = new FormData();
  formData.append("photo", photoInput.files[0]);
  if (photoCaptionInput.value.trim()) {
    formData.append("caption", photoCaptionInput.value.trim());
  }
  if (photoCoverInput.checked) {
    formData.append("isCover", "true");
  }
  try {
    const response = await apiRequest(
      `/api/tournaments/${activeTournamentId}/photos`,
      {
        method: "POST",
        body: formData,
      }
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Failed to upload photo.");
    }
    photoForm.reset();
    await loadTournamentDetails(activeTournamentId);
    setStatus("Photo uploaded.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setFormError(photoError, error.message);
  }
});

photoGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-photo-id]");
  if (!button) return;
  if (!ensureActiveTournament()) return;
  try {
    const response = await apiRequest(
      `/api/tournaments/${activeTournamentId}/photos/${button.dataset.photoId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to remove photo.");
    }
    await loadTournamentDetails(activeTournamentId);
    setStatus("Photo removed.");
  } catch (error) {
    if (error.message === "unauthorized") return;
    setStatus(error.message, true);
  }
});

resultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError(formError, "");
  if (!ensureActiveTournament()) return;
  if (!categoryInput.value.trim()) {
    setFormError(formError, "Please enter a category.");
    return;
  }
  const winners = [
    normalizeName(firstInput.value),
    normalizeName(secondInput.value),
    normalizeName(thirdInput.value),
  ];
  if (winners.some((name) => !name)) {
    setFormError(formError, "Please enter all three player names.");
    return;
  }
  if (new Set(winners).size !== winners.length) {
    setFormError(formError, "Placements must be different players.");
    return;
  }

  const formData = new FormData();
  formData.append("category", categoryInput.value.trim());
  if (eventDateInput.value) {
    formData.append("eventDate", eventDateInput.value);
  }
  formData.append("firstName", winners[0]);
  formData.append("secondName", winners[1]);
  formData.append("thirdName", winners[2]);
  if (firstPhotoInput.files[0]) {
    formData.append("firstPhoto", firstPhotoInput.files[0]);
  }
  if (secondPhotoInput.files[0]) {
    formData.append("secondPhoto", secondPhotoInput.files[0]);
  }
  if (thirdPhotoInput.files[0]) {
    formData.append("thirdPhoto", thirdPhotoInput.files[0]);
  }

  try {
    const response = await apiRequest(
      `/api/tournaments/${activeTournamentId}/results`,
      {
        method: "POST",
        body: formData,
      }
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to publish results.");
    }
    resultForm.reset();
    setStatus("Results published.");
    await loadTournamentDetails(activeTournamentId);
  } catch (error) {
    if (error.message === "unauthorized") return;
    setFormError(formError, error.message);
  }
});

resetFormButton.addEventListener("click", () => {
  resultForm.reset();
  setFormError(formError, "");
});

resultsTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-result-id]");
  if (!button) return;
  if (!ensureActiveTournament()) return;
  try {
    const response = await apiRequest(
      `/api/tournaments/${activeTournamentId}/results/${button.dataset.resultId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to remove result.");
    }
    setStatus("Result removed.");
    await loadTournamentDetails(activeTournamentId);
  } catch (error) {
    if (error.message === "unauthorized") return;
    setStatus(error.message, true);
  }
});

const existingToken = getToken();
if (existingToken) {
  setAdminView(true);
  Promise.all([loadSeries(), loadTournaments()]).catch(() => {
    setToken("");
    setAdminView(false);
  });
} else {
  setAdminView(false);
}
