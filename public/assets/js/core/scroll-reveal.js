const DEFAULTS = { duration: 500, easing: 'ease-out-cubic', threshold: 0.1 };

let observer;

function createObserver() {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.dataset.aosDelay || '0', 10);
        const duration = parseInt(el.dataset.aosDuration || DEFAULTS.duration, 10);

        el.style.transitionDelay = `${delay}ms`;
        el.style.transitionDuration = `${duration}ms`;
        el.classList.add('aos-animate');
        observer.unobserve(el);
      });
    },
    { threshold: DEFAULTS.threshold }
  );

  return observer;
}

export function initScrollReveal() {
  const obs = createObserver();
  document.querySelectorAll('[data-aos]').forEach((el) => {
    el.classList.add('aos-init');
    obs.observe(el);
  });
}

export function refreshScrollReveal() {
  const obs = createObserver();
  document.querySelectorAll('[data-aos]:not(.aos-init)').forEach((el) => {
    el.classList.add('aos-init');
    obs.observe(el);
  });
}
