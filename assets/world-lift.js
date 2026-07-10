(() => {
  const dial = document.querySelector(".floor-dial b");
  const needle = document.querySelector(".floor-dial i");
  const floors = [...document.querySelectorAll("[data-floor]")];
  const root = document.documentElement;

  const observer = new IntersectionObserver((entries) => {
    const active = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;
    const floor = active.target.dataset.floor;
    dial.textContent = floor;
    needle.style.setProperty("--needle", `${-54 + Number(floor) * 25}deg`);
    document.body.dataset.floor = floor;
  }, { threshold: [0.35, 0.55, 0.75] });

  floors.forEach((floor) => observer.observe(floor));

  let scrollFramePending = false;
  const updateDriveTrain = () => {
    scrollFramePending = false;
    const turn = window.scrollY * 0.34;
    root.style.setProperty("--gear-turn", `${turn}deg`);
    root.style.setProperty("--gear-turn-reverse", `${-turn * 0.78}deg`);
  };

  window.addEventListener("scroll", () => {
    if (scrollFramePending) return;
    scrollFramePending = true;
    requestAnimationFrame(updateDriveTrain);
  }, { passive: true });

  updateDriveTrain();
})();
