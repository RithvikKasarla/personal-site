// Stage motion for the cardboard diorama:
//  - entrance: flats spring onto the stage (pop up on sticks, lower on strings, slide in from the wings)
//  - "whoosh" scene change: on navigation the flats are yanked off the nearest wing, then the next page's
//    flats come in. Wraps Astro's ClientRouter loader so the exit runs while the next page is fetched.
//  - mouse parallax: sets --mx/--my, which every .flat scales by its --depth in CSS.

type Dir = 'up' | 'down' | 'left' | 'right';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');

/** Damped spring sampled into a CSS linear() easing, so WAAPI can play it with no JS per frame. */
function springEasing(stiffness = 170, damping = 15) {
  const dt = 1 / 60;
  const points: number[] = [0];
  let x = 0;
  let v = 0;
  for (let i = 0; i < 240; i++) {
    v += (-stiffness * (x - 1) - damping * v) * dt;
    x += v * dt;
    points.push(x);
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break;
  }
  points[points.length - 1] = 1;
  return {
    easing: `linear(${points.map((p) => +p.toFixed(4)).join(', ')})`,
    duration: Math.round((points.length - 1) * dt * 1000),
  };
}

const SPRING = springEasing();

function offstage(dir: Dir, tilt: number) {
  switch (dir) {
    case 'up':
      return `translateY(-110vh) rotate(${tilt * 0.4}deg)`;
    case 'down':
      return `translateY(105vh) rotate(${tilt}deg)`;
    case 'left':
      return `translateX(calc(-100vw - 100%)) rotate(${-Math.abs(tilt) * 2}deg)`;
    case 'right':
      return `translateX(calc(100vw + 100%)) rotate(${Math.abs(tilt) * 2}deg)`;
  }
}

/** Small deterministic tilt per piece so the motion looks hand-operated, not uniform. */
const tiltFor = (i: number) => (i % 2 ? -1 : 1) * (3 + (i % 3) * 1.5);

function flats() {
  return [...document.querySelectorAll<HTMLElement>('[data-flat]')];
}

/** The felt ground under a section page's content. It rises in under the scene and sinks on exit. */
const ground = () => document.querySelector<HTMLElement>('[data-ground]');

function enter() {
  const root = document.documentElement;
  if (reducedMotion.matches) {
    root.classList.remove('pre-enter');
    return;
  }
  flats().forEach((el, i) => {
    const move = el.querySelector<HTMLElement>('.flat-move')!;
    const from = el.dataset.enter as Dir;
    // "up" means the piece rises into place, so it starts below the stage; "down" starts above it.
    const start = offstage(from === 'up' ? 'down' : from === 'down' ? 'up' : from, tiltFor(i));
    const order = Number(el.dataset.order ?? 0);
    move.animate([{ transform: start }, { transform: 'none' }], {
      ...SPRING,
      delay: 60 + order * 75,
      fill: 'backwards',
    });
  });
  ground()?.animate([{ transform: 'translateY(100vh)' }, { transform: 'none' }], {
    duration: 650,
    delay: 60,
    easing: 'cubic-bezier(.2,.8,.3,1)',
    fill: 'backwards',
  });
  root.classList.remove('pre-enter');
}

function exit(): Promise<unknown> {
  if (reducedMotion.matches) return Promise.resolve();
  const mid = innerWidth / 2;
  const pieces = flats().map((el, i) => {
    const r = el.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const dir: Dir =
      (el.dataset.exit as Dir) ?? (el.dataset.enter === 'down' ? 'up' : cx < mid ? 'left' : 'right');
    return { el, i, dir, edgeness: Math.abs(cx - mid) };
  });
  // Stagehands clear the wings first: pieces nearest the edges leave first, the centre last.
  pieces.sort((a, b) => b.edgeness - a.edgeness);
  // The ground goes last, taking whatever is still standing on it.
  const sink = ground()?.animate([{ transform: 'none' }, { transform: 'translateY(100vh)' }], {
    duration: 460,
    delay: 140 + pieces.length * 22,
    easing: 'cubic-bezier(.5,0,.9,.5)',
    fill: 'forwards',
  }).finished;
  return Promise.all([
    sink,
    ...pieces.map(({ el, i, dir }, rank) => {
      const move = el.querySelector<HTMLElement>('.flat-move')!;
      const tilt = tiltFor(i);
      const lift = dir === 'left' ? -1 : 1;
      // Easing lives on each keyframe: a quick ease-out lift and lean (anticipation), then an
      // accelerating yank off stage. One easing across the whole timeline would squash the yank.
      return move.animate(
        [
          { transform: 'none', easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: `translateY(-4%) rotate(${lift * 2.5}deg)`, offset: 0.28, easing: 'cubic-bezier(.4,0,.85,.6)' },
          { transform: offstage(dir, tilt) },
        ],
        { duration: 560, delay: rank * 22, fill: 'forwards' },
      ).finished;
    }),
  ]);
}

// Content further down the page comes alive as it scrolls into view:
//   [data-reveal="swing"]  hangs from its top edge and swings into place on a spring
//   [data-reveal]          just gets .revealed (CSS hangs effects off it, e.g. a stamp)
//   [data-count]           inside a revealed element ticks up from 0 to its value (it shows 0 while it waits)
let revealObserver: IntersectionObserver | undefined;

function countUp(el: HTMLElement) {
  const to = Number(el.dataset.count);
  const prefix = el.textContent!.replace(/[\d,]+.*/, '');
  const suffix = el.textContent!.replace(/^\D*[\d,]+/, '');
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.max(0, Math.min(1, (now - start) / 1200));
    el.textContent = `${prefix}${Math.round(to * (1 - (1 - t) ** 3))}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function reveal(el: HTMLElement, stagger: number) {
  el.classList.remove('await-reveal');
  el.classList.add('revealed');
  el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
  if (el.dataset.reveal === 'swing') {
    el.animate([{ transform: 'translateY(-24px) rotate(-24deg)' }, { transform: 'none' }], {
      ...SPRING,
      delay: stagger * 90,
      fill: 'backwards',
    });
  }
}

function watchReveals() {
  revealObserver?.disconnect();
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!items.length) return;
  if (reducedMotion.matches) {
    items.forEach((el) => el.classList.add('revealed'));
    return;
  }
  items.forEach((el) => {
    el.classList.add('await-reveal');
    el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
      n.textContent = n.textContent!.replace(/[\d,]+/, '0');
    });
  });
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => {
          revealObserver!.unobserve(e.target);
          reveal(e.target as HTMLElement, i);
        });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  // Start watching once the scene has mostly arrived, so things already in view reveal after it.
  setTimeout(() => items.forEach((el) => revealObserver!.observe(el)), 900);
}

// Run the exit while the next page loads; swap only when both are done.
document.addEventListener('astro:before-preparation', (event) => {
  const loadNext = event.loader;
  event.loader = async () => {
    await Promise.all([loadNext(), exit()]);
  };
});

// After the DOM swap (before the browser paints it), start the new page's entrance.
document.addEventListener('astro:after-swap', () => {
  enter();
  watchReveals();
});

// Mouse parallax.
let frame = 0;
addEventListener('pointermove', (e) => {
  if (reducedMotion.matches || !finePointer.matches || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const root = document.documentElement.style;
    root.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
    root.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  });
});

enter();
watchReveals();
