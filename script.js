const API_URL = "https://image-backend-t48h.onrender.com/images";

let images = [];
let favourites = JSON.parse(localStorage.getItem("favourites")) || [];

// --- DOM Elements ---
const masonry = document.getElementById("masonry");
const recentContainer = document.getElementById("recent-container");
const favouritesContainer = document.getElementById("favourites-container");

const pinModal = document.getElementById("pin-modal");
const pinImg = document.getElementById("pin-img");
const pinTitle = document.getElementById("pin-title");
const pinTags = document.getElementById("pin-tags");
const relCarousel = document.getElementById("rel-carousel");
const favBtn = document.getElementById("fav-btn");
const dlBtn = document.getElementById("dl-btn");

// --- Toast notification ---
function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.bottom = "20px";
  t.style.left = "50%";
  t.style.transform = "translateX(-50%)";
  t.style.background = "#111";
  t.style.color = "#fff";
  t.style.padding = "8px 14px";
  t.style.borderRadius = "8px";
  t.style.zIndex = 2000;
  t.style.opacity = 0;
  t.style.transition = "opacity 0.3s";
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = 1));
  setTimeout(() => {
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 300);
  }, 1500);
}

// --- Fetch images ---
const loaderOverlay = document.getElementById("loader-overlay");
const progressBar = document.getElementById("progress");

async function fetchImages() {
  try {
    // Show loader
    loaderOverlay.style.display = "flex";
    progressBar.style.width = "0%";

    // Simulate progress (optional, you can remove if real progress available)
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress += Math.random() * 20;
      if (fakeProgress > 90) fakeProgress = 90; // max before load
      progressBar.style.width = fakeProgress + "%";
    }, 300);

    // Fetch images
    const res = await fetch(API_URL);
    images = await res.json();

    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    // Short delay to show 100%
    setTimeout(() => {
      loaderOverlay.style.display = "none";
    }, 300);

    // Render content
    renderMasonry(images);
    renderRecent(images);
    renderFavourites();
  } catch (err) {
    console.error("Failed to fetch images", err);
    loaderOverlay.style.display = "none";
  }
}

// --- Templates ---
function cardTemplate({ _id, title, url, tags }) {
  return `
    <article class="card" data-id="${_id}" data-title="${title.toLowerCase()}" data-tags="${tags.join(",").toLowerCase()}">
      <img class="thumb" src="${url}" alt="${title}" loading="lazy" />
      <div class="meta">
        <div class="title">${title}</div>
      </div>
    </article>
  `;
}

function relCardTemplate({ _id, title, url }) {
  return `
    <div class="rel-card" data-id="${_id}">
      <img src="${url}" alt="${title}" loading="lazy"/>
      <p>${title}</p>
    </div>
  `;
}

// --- Render functions ---
function renderMasonry(list) {
  masonry.innerHTML = list.map(cardTemplate).join("");
}

function renderRecent(list) {
  const recent = list.slice(0, 10);
  recentContainer.innerHTML = recent.map(relCardTemplate).join("");
}

function renderFavourites() {
  const favList = images.filter(img => favourites.includes(img._id));
  favouritesContainer.innerHTML = favList.map(relCardTemplate).join("");
}

// --- Search ---
document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();

  // Scroll "Designs" heading into view
  const designsHeading = document.getElementById("designs");
  designsHeading.scrollIntoView({ behavior: "smooth", block: "start" });

  for (const card of masonry.children) {
    const title = card.dataset.title;
    const tags = card.dataset.tags;
    card.style.display = title.includes(q) || tags.includes(q) ? "" : "none";
  }

  // Ensure masonry is visible
  masonry.style.display = "block";
});

// --- Pin Page ---
let lastScrollY = 0;

function openPinPage(id, pushHistory = true) {
  const img = images.find(i => i._id === id);
  if (!img) return;

  if (!pinModal.classList.contains("open")) {
    // Save current scroll
    lastScrollY = window.scrollY;

    // Freeze background
    document.body.style.top = `-${lastScrollY}px`;
    document.body.classList.add("body-no-scroll");
  }

  pinImg.src = img.url;
  pinTitle.textContent = img.title;
  pinTags.innerHTML = img.tags.map(t => `<span>${t}</span>`).join("");

  const related = images
    .filter(i => i._id !== img._id && i.tags.some(t => img.tags.includes(t)))
    .slice(0, 10);
  relCarousel.innerHTML = related.map(relCardTemplate).join("");

  favBtn.innerHTML = `<i class="fa-solid fa-heart ${favourites.includes(id) ? "fav-active" : ""}"></i>`;

  pinModal.classList.add("open");
  pinModal.scrollTop = 0;

  if (pushHistory) {
    history.pushState({ pinId: id, scrollY: lastScrollY }, "", `?pin=${id}`);
  }
}

function closePinPage() {
  pinModal.classList.remove("open");

  // Unfreeze background
  document.body.classList.remove("body-no-scroll");
  document.body.style.top = "";

  // Restore scroll
  window.scrollTo(0, lastScrollY);

  history.replaceState({}, "", window.location.pathname);
}


// Handle back/forward
window.addEventListener("popstate", e => {
  if (e.state && e.state.pinId) {
    openPinPage(e.state.pinId, false);
  } else {
    pinModal.classList.remove("open");
    if (e.state && typeof e.state.scrollY === "number") {
      window.scrollTo(0, e.state.scrollY);
    }
  }
});

// --- Favorite toggle ---
favBtn?.addEventListener("click", () => {
  const id = new URLSearchParams(window.location.search).get("pin");
  if (!id) return;

  if (favourites.includes(id)) {
    favourites = favourites.filter(f => f !== id);
    showToast("Removed from favorites");
  } else {
    favourites.push(id);
    showToast("Added to favorites");
  }
  localStorage.setItem("favourites", JSON.stringify(favourites));

  // Update icon
  favBtn.querySelector("i").classList.toggle("fav-active", favourites.includes(id));

  renderFavourites();
});

// --- Download button ---
dlBtn?.addEventListener("click", async () => {
  const id = new URLSearchParams(window.location.search).get("pin");
  if (!id) return;

  const img = images.find(i => i._id === id);
  if (!img) return;

  try {
    const response = await fetch(img.url);
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = img.title || "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("Download started");
  } catch (err) {
    console.error("Download failed", err);
    showToast("Download failed");
  }
});

// --- Masonry click ---
masonry.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openPinPage(card.dataset.id);
});

// --- Carousel click (recent/favourites/related) ---
document.addEventListener("click", e => {
  const relCard = e.target.closest(".rel-card");
  if (relCard) {
    const id = relCard.dataset.id;
    openPinPage(id);
  }

  if (e.target.id === "pin-close") closePinPage();
});

// --- Browser back/forward handling ---
window.addEventListener("popstate", e => {
  if (e.state && e.state.pinId) {
    openPinPage(e.state.pinId, false); // open pin without pushing new history
  } else {
    // Close pin modal
    pinModal.classList.remove("open");

    // Unfreeze background
    document.body.classList.remove("body-no-scroll");
    document.body.style.top = "";

    // Restore scroll position if saved
    if (e.state && typeof e.state.scrollY === "number") {
      window.scrollTo(0, e.state.scrollY);
    } else {
      // fallback scroll
      window.scrollTo(0, lastScrollY);
    }
  }
});


// --- Initial fetch ---
fetchImages();


const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

menuToggle.addEventListener("click", () => {
  menu.classList.toggle("active");
});

// Optional: close menu if click outside
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
    menu.classList.remove("active");
  }
});

