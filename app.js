const portfolioItems = Array.from({ length: 8 }, (_, index) => ({
  id: String(index + 1).padStart(2, "0"),
  title: ["Dış yüzey", "İç detay", "Boya bakımı", "Far yenileme", "Koltuk", "Koruma", "Teslim", "Atölye"][index],
  src: null,
  alt: ""
}));

// Yalnızca görüntüleyici testinde kullanılır; normal ziyaretçiler görmez.
if (new URLSearchParams(window.location.search).has("gallery-test")) {
  portfolioItems[0] = {
    id: "01",
    title: "Etkileşim testi",
    src: "assets/og.png",
    alt: "Detailing İzmir galeri yakınlaştırma test görseli"
  };
}

const gallery = document.querySelector("[data-gallery]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxStage = document.querySelector("[data-lightbox-stage]");
const lightboxIndex = document.querySelector("[data-lightbox-index]");
const zoomReset = document.querySelector("[data-zoom-reset]");

let lastFocused = null;
let scale = 1;
let panX = 0;
let panY = 0;
let startScale = 1;
let startDistance = 0;
let dragOrigin = null;
let previousTap = 0;
const pointers = new Map();

function renderGallery() {
  if (!gallery) return;
  gallery.innerHTML = portfolioItems.map((item) => {
    if (!item.src) {
      return `<article class="gallery-slot gallery-empty" aria-label="${item.id} numaralı boş ${item.title} galeri alanı"><span>${item.id} / ${item.title}</span><p>Gerçek çalışma görseli bekleniyor.</p></article>`;
    }
    return `<button class="gallery-slot gallery-photo" type="button" data-gallery-photo data-src="${item.src}" data-alt="${item.alt}" data-index="${item.id}" aria-label="${item.alt} görselini büyüt"><img src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async" /><span>${item.id} / ${item.title}</span></button>`;
  }).join("");
}

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function updateTransform() {
  if (!lightboxImage || !lightboxStage || !zoomReset) return;
  const maxX = (lightboxStage.clientWidth * (scale - 1)) / 2;
  const maxY = (lightboxStage.clientHeight * (scale - 1)) / 2;
  panX = clamp(panX, -maxX, maxX);
  panY = clamp(panY, -maxY, maxY);
  lightboxImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
  zoomReset.textContent = `${Math.round(scale * 100)}%`;
}

function setScale(nextScale) {
  scale = clamp(nextScale, 1, 4);
  if (scale === 1) { panX = 0; panY = 0; }
  updateTransform();
}

function resetViewer() {
  scale = 1; panX = 0; panY = 0; pointers.clear(); dragOrigin = null; updateTransform();
}

function openLightbox(trigger) {
  if (!lightbox || !lightboxImage || !lightboxIndex) return;
  lastFocused = trigger;
  lightboxImage.src = trigger.dataset.src;
  lightboxImage.alt = trigger.dataset.alt;
  lightboxIndex.textContent = trigger.dataset.index;
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  resetViewer();
  lightbox.querySelector("[data-lightbox-close]")?.focus();
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  resetViewer();
  lightboxImage.removeAttribute("src");
  lastFocused?.focus();
}

function pointerDistance() {
  const values = [...pointers.values()];
  if (values.length < 2) return 0;
  return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
}

function pointerDown(event) {
  lightboxStage?.setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    startDistance = pointerDistance(); startScale = scale; dragOrigin = null;
  } else {
    dragOrigin = { x: event.clientX, y: event.clientY, panX, panY };
  }
}

function pointerMove(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && startDistance > 0) {
    setScale(startScale * (pointerDistance() / startDistance));
  } else if (pointers.size === 1 && dragOrigin && scale > 1) {
    panX = dragOrigin.panX + event.clientX - dragOrigin.x;
    panY = dragOrigin.panY + event.clientY - dragOrigin.y;
    updateTransform();
  }
}

function pointerUp(event) {
  pointers.delete(event.pointerId);
  if (pointers.size === 1) {
    const point = [...pointers.values()][0];
    dragOrigin = { x: point.x, y: point.y, panX, panY };
  } else { dragOrigin = null; }
  if (event.pointerType === "touch") {
    const now = Date.now();
    if (now - previousTap < 290) setScale(scale > 1 ? 1 : 2.25);
    previousTap = now;
  }
}

renderGallery();

gallery?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-gallery-photo]") : null;
  if (target) openLightbox(target);
});
document.querySelectorAll("[data-lightbox-close]").forEach((button) => button.addEventListener("click", closeLightbox));
document.querySelector("[data-zoom-in]")?.addEventListener("click", () => setScale(scale + 0.5));
document.querySelector("[data-zoom-out]")?.addEventListener("click", () => setScale(scale - 0.5));
zoomReset?.addEventListener("click", resetViewer);
lightboxStage?.addEventListener("pointerdown", pointerDown);
lightboxStage?.addEventListener("pointermove", pointerMove);
lightboxStage?.addEventListener("pointerup", pointerUp);
lightboxStage?.addEventListener("pointercancel", pointerUp);
lightboxStage?.addEventListener("wheel", (event) => { event.preventDefault(); setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25)); }, { passive: false });

document.addEventListener("keydown", (event) => {
  if (!lightbox || lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "Tab") {
    const controls = [...lightbox.querySelectorAll("button:not([disabled])")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

function closeMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileMenu.hidden = isOpen;
});
mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

const header = document.querySelector("[data-header]");
let scrollScheduled = false;

function updateScroll() {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  document.documentElement.style.setProperty("--scroll-progress", String(window.scrollY / scrollable));
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  scrollScheduled = false;
}

window.addEventListener("scroll", () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  window.requestAnimationFrame(updateScroll);
}, { passive: true });
window.addEventListener("resize", () => { if (window.innerWidth > 760) closeMenu(); updateTransform(); });
document.querySelector("[data-year]").textContent = new Date().getFullYear();
updateScroll();
