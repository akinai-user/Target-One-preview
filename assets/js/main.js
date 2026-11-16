'use strict';
const config = window.TARGET_ONE_CONFIG || {};
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function setMenuOpen(open) {
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  const icon = menuButton?.querySelector('span');
  if (icon) {
    icon.textContent = open ? '×' : '☰';
    icon.setAttribute('aria-hidden', 'true');
  }
  navigation?.classList.toggle('open', open);
}
setMenuOpen(false);
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  setMenuOpen(open);
});
const navGroups = [...document.querySelectorAll('.nav-group')];
navGroups.forEach((group) => {
  group.addEventListener('toggle', () => {
    if (group.open)
      navGroups.forEach((other) => {
        if (group !== other) other.open = false;
      });
  });
  group.addEventListener('mouseenter', () => {
    if (window.matchMedia('(min-width:1100px) and (hover:hover)').matches) group.open = true;
  });
  group.addEventListener('mouseleave', () => {
    if (window.matchMedia('(min-width:1100px) and (hover:hover)').matches) group.open = false;
  });
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.header')) navGroups.forEach((group) => (group.open = false));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    navGroups.forEach((group) => (group.open = false));
    setMenuOpen(false);
  }
});
const filters = [...document.querySelectorAll('[data-filter]')];
if (filters.length) {
  const cards = [...document.querySelectorAll('.card[data-category]')].filter(
    (card) => card.dataset.category,
  );
  const grid = cards[0]?.parentElement;
  const empty = document.createElement('p');
  empty.className = 'empty-results';
  empty.textContent = 'このカテゴリのコンテンツは現在準備中です。';
  empty.hidden = true;
  grid?.after(empty);
  function applyFilter(category) {
    let count = 0;
    cards.forEach((card) => {
      card.hidden = category !== 'すべて' && card.dataset.category !== category;
      if (!card.hidden) count++;
    });
    filters.forEach((button) => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    empty.hidden = count !== 0;
    if (grid) grid.setAttribute('aria-live', 'polite');
  }
  filters.forEach((button) =>
    button.addEventListener('click', () => {
      applyFilter(button.dataset.filter);
      const url = new URL(location.href);
      if (button.dataset.filter === 'すべて') url.searchParams.delete('category');
      else url.searchParams.set('category', button.dataset.filter);
      history.replaceState(null, '', url);
    }),
  );
  const category = new URLSearchParams(location.search).get('category');
  if (filters.some((button) => button.dataset.filter === category)) applyFilter(category);
}
document.querySelectorAll('.more-button').forEach((button) =>
  button.addEventListener('click', () => {
    button.hidden = true;
    button.nextElementSibling.hidden = false;
  }),
);
// 日程は日本時間を基準に、3営業日以降。祝日カレンダーは2026〜2030年を同梱。
const holidays = new Set(window.TARGET_ONE_HOLIDAYS || []);
const dateKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const isBusinessDay = (date) => ![0, 6].includes(date.getUTCDay()) && !holidays.has(dateKey(date));
const todayJP = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const minimumDate = new Date(`${todayJP}T00:00:00Z`);
let days = 0;
while (days < 3) {
  minimumDate.setUTCDate(minimumDate.getUTCDate() + 1);
  if (isBusinessDay(minimumDate)) days++;
}
document.querySelectorAll('input[type=date]').forEach((input) => {
  input.min = dateKey(minimumDate);
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    if (
      input.value &&
      (!isBusinessDay(new Date(`${input.value}T00:00:00Z`)) || input.value < input.min)
    )
      input.setCustomValidity('3営業日以降の、土日祝を除く平日をご選択ください。');
  });
});
const dialog = document.querySelector('#confirm-dialog');
let activeForm = null;
const labels = {
  company: '会社名',
  name: 'お名前',
  email: 'メールアドレス',
  phone: '電話番号',
  url: 'HP',
  consultation: 'ご相談方法',
  'industry[]': '業種',
  area: '配信エリア',
  advertising: 'WEB広告の実施',
  message: 'ご質問・ご要望',
  position: '役職',
  source: '知ったきっかけ',
  form_type: 'お問い合わせ種別',
};
for (let i = 1; i <= 5; i++) {
  labels[`date${i}`] = `第${i}希望日`;
  labels[`time${i}`] = `第${i}希望時間`;
}
document.querySelectorAll('[data-contact]').forEach((form) => {
  const industries = [...form.querySelectorAll('input[name="industry[]"]')];
  function validateIndustries() {
    industries[0]?.setCustomValidity(
      industries.some((input) => input.checked) ? '' : '業種を1つ以上選択してください。',
    );
  }
  industries.forEach((input) => input.addEventListener('change', validateIndustries));
  validateIndustries();
  if (config.formEnabled)
    fetch(`${config.endpoint}?token=1`, { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => (form.elements.token.value = data.token))
      .catch(() => {});
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    activeForm = form;
    const values = document.querySelector('#confirm-values');
    values.replaceChildren();
    const entries = new Map();
    for (const [key, value] of new FormData(form)) {
      if (['token', 'website_check', 'consent'].includes(key) || !value) continue;
      entries.set(key, entries.has(key) ? `${entries.get(key)}、${value}` : value);
    }
    for (const [key, value] of entries) {
      const term = document.createElement('dt');
      term.textContent = labels[key] || key;
      const detail = document.createElement('dd');
      detail.textContent = value;
      values.append(term, detail);
    }
    dialog.querySelector('.dialog-error').textContent = '';
    dialog.showModal();
  });
});
dialog
  ?.querySelectorAll('.dialog-close,.edit-form')
  .forEach((button) => button.addEventListener('click', () => dialog.close()));
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog?.querySelector('.send-form').addEventListener('click', async (event) => {
  if (!activeForm) return;
  const error = dialog.querySelector('.dialog-error');
  if (!config.formEnabled) {
    error.textContent =
      '現在は制作プレビューです。送信先の設定が完了するまで、実際の送信は行われません。お急ぎの方は050-1780-2231へお問い合わせください。';
    return;
  }
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = '送信中…';
  error.textContent = '';
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      body: new FormData(activeForm),
      credentials: 'same-origin',
    });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.message || '送信できませんでした。時間をおいて再度お試しください。');
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'lead_complete',
      lead_type: activeForm.elements.form_type.value,
    });
    location.assign(
      activeForm.elements.form_type.value === '資料請求' ? '/request/thanks/' : '/contact/thanks/',
    );
  } catch (reason) {
    error.textContent = reason.message;
    button.disabled = false;
    button.textContent = 'この内容で送信する →';
  }
});
if (/^GTM-[A-Z0-9]+$/.test(config.gtmId || '')) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`;
  document.head.append(script);
} else if (/^G-[A-Z0-9]+$/.test(config.ga4Id || '')) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', config.ga4Id);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4Id)}`;
  document.head.append(script);
}
