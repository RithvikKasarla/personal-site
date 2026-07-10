// THROWAWAY PROTOTYPE — remove after a direction is selected.
(() => {
  const variants = [
    { key: "A", name: "Vertical workshop cutaway" },
    { key: "B", name: "Rithvik’s workbench" },
    { key: "C", name: "Loop engine + recovery" },
    { key: "D", name: "The world-engine" },
    { key: "E", name: "Mechanical elevator" },
  ];

  const root = document.documentElement;
  const panels = [...document.querySelectorAll("[data-variant-panel]")];
  const switcherLabel = document.querySelector(".prototype-switcher span");
  let currentIndex = Math.max(
    0,
    variants.findIndex(({ key }) => key === new URLSearchParams(location.search).get("variant")),
  );

  function showVariant(index, shouldResetScroll = true) {
    currentIndex = (index + variants.length) % variants.length;
    const current = variants[currentIndex];

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.variantPanel !== current.key;
    });

    document.body.dataset.variant = current.key;
    switcherLabel.textContent = `${current.key} — ${current.name}`;

    const url = new URL(location.href);
    url.searchParams.set("variant", current.key);
    history.replaceState({}, "", url);

    if (shouldResetScroll) window.scrollTo({ top: 0, behavior: "auto" });
    updateMechanism();
  }

  document.querySelector('[data-switch="previous"]').addEventListener("click", () => showVariant(currentIndex - 1));
  document.querySelector('[data-switch="next"]').addEventListener("click", () => showVariant(currentIndex + 1));

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target.matches("input, textarea, [contenteditable]")) return;
    if (event.key === "ArrowLeft") showVariant(currentIndex - 1);
    if (event.key === "ArrowRight") showVariant(currentIndex + 1);
  });

  let framePending = false;
  function updateMechanism() {
    framePending = false;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
    const turn = progress * 1800;

    root.style.setProperty("--turn", `${turn}deg`);
    root.style.setProperty("--turn-reverse", `${-turn * 0.78}deg`);
    root.style.setProperty("--camera-turn", `${-18 + progress * 36}deg`);
    root.style.setProperty("--governor-turn", `${-24 + Math.sin(progress * Math.PI * 10) * 8}deg`);
    root.style.setProperty("--gauge-turn", `${-70 + progress * 140}deg`);
    root.style.setProperty("--travel", `${6 + progress * 82}%`);
    root.style.setProperty("--piston", `${Math.sin(progress * Math.PI * 14) * 44}px`);
    const worldPanel = document.querySelector(".variant-d");
    worldPanel.style.setProperty("--world-turn", `${turn * 1.18}deg`);
    worldPanel.style.setProperty("--world-turn-back", `${-turn * .82}deg`);
    worldPanel.style.setProperty("--airship-x", `${-340 + progress * (innerWidth + 680)}px`);
    worldPanel.style.setProperty("--airship-y", `${Math.sin(progress * Math.PI * 5) * 54}px`);
    worldPanel.style.setProperty("--steam-lift", `${progress * 90}px`);
    worldPanel.style.setProperty("--cloud-shift", `${progress * -160}px`);
    worldPanel.style.setProperty("--cloud-shift-back", `${progress * 120}px`);

    const liftPanel = document.querySelector(".variant-e");
    liftPanel.style.setProperty("--lift-airship-x", `${innerWidth * .58 - progress * (innerWidth + 940)}px`);
    liftPanel.style.setProperty("--lift-parallax", `${progress * -120}px`);
    liftPanel.style.setProperty("--lift-scene-shift", `${Math.sin(progress * Math.PI * 7) * 22}px`);
    liftPanel.style.setProperty("--lift-needle", `${-64 + progress * 128}deg`);

    const floorNumber = Math.min(6, Math.floor(progress * 7));
    document.querySelectorAll(".floor-dial b").forEach((dial) => {
      dial.textContent = String(floorNumber).padStart(2, "0");
    });

    const gearFrame = Math.floor(turn / 90) % 4;
    document.querySelectorAll("[data-gear]").forEach((gear) => {
      const frame = (gearFrame + Number(gear.dataset.gearOffset || 0)) % 4;
      const src = `assets/prototype-world/gears/Gear ${gear.dataset.gear} - Bronze_0${frame}.png`;
      if (!gear.src.endsWith(src.replaceAll(" ", "%20")) && gear.getAttribute("src") !== src) gear.src = src;
    });
  }

  window.addEventListener("scroll", () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateMechanism);
  }, { passive: true });

  const benchTools = [...document.querySelectorAll("[data-bench-target]")];
  const benchChapters = [...document.querySelectorAll("[data-bench-chapter]")];

  benchTools.forEach((tool) => {
    tool.addEventListener("click", () => {
      document.querySelector(`#bench-${tool.dataset.benchTarget}`).scrollIntoView({ behavior: "smooth" });
    });
  });

  const benchObserver = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    benchTools.forEach((tool) => {
      tool.classList.toggle("is-active", tool.dataset.benchTarget === visible.target.dataset.benchChapter);
    });
  }, { threshold: 0.6 });
  benchChapters.forEach((chapter) => benchObserver.observe(chapter));

  const jamLever = document.querySelector(".jam-lever");
  jamLever.addEventListener("click", () => {
    const engine = document.querySelector(".variant-c");
    const note = document.querySelector(".recovery-note");
    const cleared = engine.classList.toggle("jam-cleared");
    note.hidden = !cleared;
    jamLever.lastChild.textContent = cleared ? " Reset the fault" : " Pull the recovery lever";
  });

  const worldValve = document.querySelector(".world-valve");
  worldValve.addEventListener("click", () => {
    const world = document.querySelector(".variant-d");
    const note = document.querySelector(".world-recovery");
    const released = world.classList.toggle("pressure-released");
    note.hidden = !released;
    worldValve.querySelector("span").textContent = released ? "Repressurize the loop" : "Crank the relief valve";
  });

  const liftRelief = document.querySelector(".lift-relief");
  liftRelief.addEventListener("click", () => {
    const lift = document.querySelector(".variant-e");
    const note = document.querySelector(".lift-recovery");
    const released = lift.classList.toggle("fault-vented");
    note.hidden = !released;
    liftRelief.querySelector("span").textContent = released ? "Repressurize the fault line" : "Vent the fault line";
  });

  showVariant(currentIndex, false);
})();
