/* BBG Electrical — vanilla JS interactions (no frameworks/libraries) */
(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header background ---------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Full-screen nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var navOverlay = document.getElementById("navOverlay");

  function closeNav() {
    if (!navOverlay) return;
    navOverlay.classList.remove("is-open");
    header && header.classList.remove("menu-open");
    navToggle && navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function toggleNav() {
    if (!navOverlay) return;
    var isOpen = navOverlay.classList.toggle("is-open");
    header && header.classList.toggle("menu-open", isOpen);
    navToggle && navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  if (navToggle) {
    navToggle.addEventListener("click", toggleNav);
  }

  if (navOverlay) {
    navOverlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- Scroll-reveal (mimics AOS fade-up) ---------- */
  var revealEls = document.querySelectorAll(".js-reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el, i) {
      // small stagger so grids don't all pop in at once
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Projects horizontal carousel ---------- */
  var track = document.getElementById("projectsTrack");
  var prevBtn = document.getElementById("projPrev");
  var nextBtn = document.getElementById("projNext");

  function scrollByCard(direction) {
    if (!track) return;
    var card = track.querySelector(".project-card");
    var gap = 28; // matches $ 1.75rem gap in _projects.scss
    var amount = card ? card.getBoundingClientRect().width + gap : 320;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { scrollByCard(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { scrollByCard(1); });

  function updateArrows() {
    if (!track || !prevBtn || !nextBtn) return;
    var max = track.scrollWidth - track.clientWidth - 4;
    prevBtn.disabled = track.scrollLeft <= 4;
    nextBtn.disabled = track.scrollLeft >= max;
  }

  if (track) {
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  }

  /* ---------- Footer accordion (mobile only, CSS handles the collapse) ---------- */
  document.querySelectorAll(".footer-col > h4").forEach(function (h4) {
    h4.addEventListener("click", function () {
      var col = h4.parentElement;
      var isOpen = col.classList.contains("is-open");
      document.querySelectorAll(".footer-col.is-open").forEach(function (c) {
        if (c !== col) c.classList.remove("is-open");
      });
      col.classList.toggle("is-open", !isOpen);
    });
  });

  /* ---------- Projects page: category filter ---------- */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var galleryItems = document.querySelectorAll("#fullGallery .full-gallery__item");

  if (filterBtns.length && galleryItems.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var filter = btn.getAttribute("data-filter");
        galleryItems.forEach(function (item) {
          var match = filter === "all" || item.getAttribute("data-cat") === filter;
          item.style.display = match ? "" : "none";
        });
      });
    });
  }
})();
