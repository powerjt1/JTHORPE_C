/* =========================================================
   Lucy AI — landing page interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---- Current year in footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close menu after tapping a link (mobile)
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Lead form (front-end only; wire to a backend/service later) ---- */
  var form = document.getElementById("leadForm");
  var note = document.getElementById("formNote");

  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      note.className = "form-note";

      if (!form.checkValidity()) {
        note.textContent = "Please fill in the required fields with a valid email.";
        note.classList.add("error");
        var firstInvalid = form.querySelector(":invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // NOTE: No endpoint is wired up yet. Replace the block below with a POST
      // to your form handler (JABB Networks backend, Formspree, Netlify Forms, etc.).
      var data = Object.fromEntries(new FormData(form).entries());
      // eslint-disable-next-line no-console
      console.log("Lead submitted (demo):", data);

      note.textContent = "Thanks, " + (data.name || "there") + "! We'll be in touch within one business day.";
      note.classList.add("success");
      form.reset();
    });
  }
})();
