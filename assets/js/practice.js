(() => {
  const root = document.documentElement;
  const body = document.body;
  const modeButtons = [...document.querySelectorAll('.mode-btn')];
  const modeStatus = document.querySelector('#mode-status');
  const warning = document.querySelector('#assessment-warning');
  const coach = document.querySelector('#coach-card');
  const coachBody = document.querySelector('#coach-body');
  const coachToggle = document.querySelector('#coach-toggle');
  const drawer = document.querySelector('#reference-drawer');
  const backdrop = document.querySelector('#drawer-backdrop');
  const referenceToggle = document.querySelector('#reference-toggle');
  const referenceClose = document.querySelector('#reference-close');
  const timer = document.querySelector('#timer');
  const langAr = document.querySelector('#lang-ar');
  const langEn = document.querySelector('#lang-en');
  const themeToggle = document.querySelector('#theme-toggle');
  let mode = 'learn';
  let seconds = 42;
  let language = 'ar';

  const labels = {
    learn: { ar: 'وضع التعلم', en: 'Learn mode' },
    practice: { ar: 'وضع التدريب', en: 'Practice mode' },
    assessment: { ar: 'وضع التقييم', en: 'Assessment mode' }
  };

  function setLanguage(nextLanguage) {
    language = nextLanguage;
    root.lang = language;
    body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar][data-en]').forEach((element) => {
      element.textContent = element.dataset[language];
    });
    langAr.setAttribute('aria-pressed', String(language === 'ar'));
    langEn.setAttribute('aria-pressed', String(language === 'en'));
    modeStatus.textContent = labels[mode][language];
    coachToggle.textContent = coach.classList.contains('is-collapsed') ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse');
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    modeStatus.textContent = labels[mode][language];
    const assessment = mode === 'assessment';
    warning.hidden = !assessment;
    coach.hidden = assessment;
    referenceToggle.disabled = assessment;
    referenceToggle.setAttribute('aria-disabled', String(assessment));
    timer.classList.toggle('is-prominent', assessment);
    if (assessment) closeDrawer();
  }

  function openDrawer() {
    if (mode === 'assessment') return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    referenceToggle.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    referenceToggle.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  langAr.addEventListener('click', () => setLanguage('ar'));
  langEn.addEventListener('click', () => setLanguage('en'));
  themeToggle.addEventListener('click', () => {
    const light = root.classList.toggle('theme-light');
    root.classList.toggle('theme-dark', !light);
    root.style.colorScheme = light ? 'light' : 'dark';
  });
  coachToggle.addEventListener('click', () => {
    const collapsed = coach.classList.toggle('is-collapsed');
    coachToggle.setAttribute('aria-expanded', String(!collapsed));
    coachToggle.textContent = collapsed ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse');
  });
  referenceToggle.addEventListener('click', openDrawer);
  referenceClose.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  setInterval(() => {
    seconds += 1;
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const remainder = String(seconds % 60).padStart(2, '0');
    timer.textContent = `${minutes}:${remainder}`;
  }, 1000);
  setLanguage('ar');
})();
