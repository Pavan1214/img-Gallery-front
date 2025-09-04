const API_URL = "https://img-gallery-back.onrender.com/api/images";

let images = [];
let favourites = JSON.parse(localStorage.getItem("favourites")) || [];
let currentIndex = 0;

// --- DOM Elements ---
const masonry = document.getElementById("masonry");
const recentContainer = document.getElementById("recent-container");
const favouritesContainer = document.getElementById("favourites-container");
const loaderOverlay = document.getElementById("loader-overlay");
const progressBar = document.getElementById("progress");

// --- Full-View Gallery Elements ---
const galleryModal = document.createElement("div");
galleryModal.id = "gallery-modal";
galleryModal.className = "gallery-modal";
galleryModal.style.cssText = `
  position: fixed; top:0; left:0; width:100%; height:100%;
  background: rgba(212, 212, 212, 1); display:flex; flex-direction:column;
  justify-content:flex-start; align-items:center; opacity:0; pointer-events:none;
  overflow-y:auto; transition:opacity 0.4s ease; z-index:2500; padding:40px 0;
`;
document.body.appendChild(galleryModal);

// Close button
const closeBtn = document.createElement("button");
closeBtn.textContent = "✕";
closeBtn.style.cssText = `
  position:absolute; top:18px; right:28px; background:rgba(0,0,0,0.2);
  border-radius:50%; border:none; font-size:24px; color:white; cursor:pointer;
`;
galleryModal.appendChild(closeBtn);

// Content container
const galleryContent = document.createElement("div");
galleryContent.style.cssText = `
  max-width: 900px; width:90%; display:flex; flex-direction:column; align-items:center;
`;
galleryModal.appendChild(galleryContent);

// Main image
const galleryImg = document.createElement("img");
galleryImg.style.cssText = "max-width:100%; max-height:70vh; border-radius:12px; margin-bottom:10px;";
galleryContent.appendChild(galleryImg);

// Title
const galleryTitle = document.createElement("h2");
galleryTitle.style.cssText = "color:black; margin-bottom:12px; text-align:center;";
galleryContent.appendChild(galleryTitle);

// Buttons container
const galleryBtns = document.createElement("div");
galleryBtns.style.cssText = "display:flex; gap:10px; margin-bottom:12px;";
galleryContent.appendChild(galleryBtns);

// Favorite button
const favBtn = document.createElement("button");
favBtn.id = "fav-btn";
favBtn.style.cssText = "font-size:1.5rem; cursor:pointer; background: rgb(30,30,30); border:none; border-radius:12px; padding:2px;";
favBtn.innerHTML = `<i class="fa-solid fa-heart"></i>`;
galleryBtns.appendChild(favBtn);

// Download button
const dlBtn = document.createElement("button");
dlBtn.id = "dl-btn";
dlBtn.style.cssText = "font-size:1.5rem; cursor:pointer; background: rgb(30,30,30); border:none; border-radius:12px; padding:2px;";
dlBtn.innerHTML = `<i class="fa-solid fa-download"></i>`;
galleryBtns.appendChild(dlBtn);

// Related images feed
const relContainer = document.createElement("div");
relContainer.id = "gallery-rel-container";
relContainer.style.cssText = "display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;";
galleryContent.appendChild(relContainer);

// --- Toast ---
function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
    background:"#111", color:"#fff", padding:"8px 14px", borderRadius:"8px",
    zIndex:2000, opacity:0, transition:"opacity 0.3s"
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = 1);
  setTimeout(() => { t.style.opacity=0; setTimeout(()=>t.remove(),300); },1500);
}

// --- Fetch Images ---
async function fetchImages() {
  try {
    loaderOverlay.style.display = "flex";
    progressBar.style.width = "0%";

    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress += Math.random()*20;
      if(fakeProgress>90) fakeProgress=90;
      progressBar.style.width = fakeProgress+"%";
    },300);

    const res = await fetch(API_URL);
    images = await res.json();

    clearInterval(progressInterval);
    progressBar.style.width = "100%";
    setTimeout(()=> loaderOverlay.style.display="none",300);

    renderMasonry(images);
    renderRecent(images);
    renderFavourites();
  } catch(err){
    console.error("Failed to fetch images", err);
    loaderOverlay.style.display="none";
  }
}

// --- Templates ---
function cardTemplate({ _id,title,url,tags }) {
  return `
    <article class="card" data-id="${_id}" data-title="${title.toLowerCase()}" data-tags="${tags.join(",").toLowerCase()}">
      <img class="thumb" src="${url}" alt="${title}" loading="lazy" />
      <div class="meta"><div class="title">${title}</div></div>
    </article>
  `;
}

function relCardTemplate({ _id,title,url }) {
  return `
    <div class="rel-card" data-id="${_id}" style="flex:0 0 auto; width:120px; text-align:center; cursor:pointer;">
      <img src="${url}" style="width:100%; border-radius:8px;" />
      <p style="font-size:0.8rem; color:#eee; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
    </div>
  `;
}

// --- Render functions ---
function renderMasonry(list) { masonry.innerHTML = list.map(cardTemplate).join(""); }
function renderRecent(list) {
  const recent=list.slice(0,18);
  recentContainer.innerHTML=recent.map(relCardTemplate).join("");
}
function renderFavourites() {
  const favList=images.filter(i=>favourites.includes(i._id));
  favouritesContainer.innerHTML=favList.map(relCardTemplate).join("");
}

// --- Search ---
document.getElementById("search").addEventListener("input",e=>{
  const q=e.target.value.trim().toLowerCase();
  const designsHeading = document.getElementById("designs");
  designsHeading.scrollIntoView({behavior:"smooth", block:"start"});
  for(const card of masonry.children){
    const title=card.dataset.title;
    const tags=card.dataset.tags;
    card.style.display=title.includes(q)||tags.includes(q)?"":"none";
  }
  masonry.style.display="block";
});

function openGallery(id, pushHistory = true){
    const imgIndex = images.findIndex(i => i._id === id);
    if(imgIndex === -1) return;
    currentIndex = imgIndex;

    showImage(images[currentIndex]);
    galleryModal.style.opacity = "1";
    galleryModal.style.pointerEvents = "auto";

    if(pushHistory){
        history.pushState({ galleryOpen: true, pinId: id }, "", `?pin=${id}`);
    }
}

function closeGallery(pushHistory = true){
    galleryModal.style.opacity = "0";
    galleryModal.style.pointerEvents = "none";

    if(pushHistory){
        history.replaceState({}, "", window.location.pathname);
    }
}


function showImage(img){
  galleryImg.src=img.url;
  galleryTitle.textContent=img.title;
  favBtn.innerHTML=`<i class="fa-solid fa-heart ${favourites.includes(img._id)?"fav-active":""}"></i>`;
  const related = images.filter(i=>i._id!==img._id && i.tags.some(t=>img.tags.includes(t))).slice(0,20);
  relContainer.innerHTML=related.map(relCardTemplate).join("");
}

// --- Navigation ---
function nextImage(){ currentIndex=(currentIndex+1)%images.length; showImage(images[currentIndex]); history.pushState({pinId:images[currentIndex]._id},"",`?pin=${images[currentIndex]._id}`);}
function prevImage(){ currentIndex=(currentIndex-1+images.length)%images.length; showImage(images[currentIndex]); history.pushState({pinId:images[currentIndex]._id},"",`?pin=${images[currentIndex]._id}`);}

// --- Events ---
masonry.addEventListener("click", e => { const card=e.target.closest(".card"); if(card) openGallery(card.dataset.id); });
document.addEventListener("click", e=>{
  const relCard=e.target.closest(".rel-card");
  if(relCard) openGallery(relCard.dataset.id);
  if(e.target===closeBtn) closeGallery();
});

// Favorite toggle
favBtn.addEventListener("click",()=>{
  const id=images[currentIndex]._id;
  if(favourites.includes(id)) { favourites=favourites.filter(f=>f!==id); showToast("Removed from favorites"); }
  else { favourites.push(id); showToast("Added to favorites"); }
  localStorage.setItem("favourites", JSON.stringify(favourites));
  favBtn.querySelector("i").classList.toggle("fav-active", favourites.includes(id));
  renderFavourites();
});

// Download
dlBtn.addEventListener("click", async()=>{
  const img=images[currentIndex]; if(!img) return;
  try{
    const res=await fetch(img.url); const blob=await res.blob();
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=img.title||"image"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("Download started");
  }catch(err){console.error(err); showToast("Download failed");}
});

// Swipe support
let touchStartX=0;
galleryModal.addEventListener("touchstart", e=>{ touchStartX=e.changedTouches[0].screenX; });
galleryModal.addEventListener("touchend", e=>{
  const touchEndX=e.changedTouches[0].screenX;
  if(touchEndX-touchStartX>50) prevImage();
  if(touchStartX-touchEndX>50) nextImage();
});

// Arrow keys
document.addEventListener("keydown", e=>{
  if(galleryModal.style.pointerEvents==="auto"){
    if(e.key==="ArrowLeft") prevImage();
    if(e.key==="ArrowRight") nextImage();
    if(e.key==="Escape") closeGallery();
  }
});

// Handle back/forward
window.addEventListener("popstate", e=>{
    if(e.state && e.state.galleryOpen){
        // Open gallery with the image in state
        openGallery(e.state.pinId, false);
    } else {
        // Close gallery if modal is open
        if(galleryModal.style.pointerEvents === "auto"){
            closeGallery(false);
        }
    }
});
// Initial fetch
fetchImages();

// --- Menu Toggle ---
const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

menuToggle.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent the document click from immediately closing menu
  menu.classList.toggle("active");
});

// Close menu if click outside
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
    menu.classList.remove("active");
  }
});

// Ensure menu is above gallery modal
menu.style.zIndex = "3001"; // gallery modal is 2500
