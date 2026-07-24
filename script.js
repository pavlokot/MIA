/* ===========================================================
   МІА · 8 років — Котобажання
   Каркас із плейсхолдерами. Що треба замінити перед запуском —
   дивись README.md (розділ "Налаштування").
   =========================================================== */

// ---- НАЛАШТУВАННЯ БРОНЮВАННЯ (Google Форма + Таблиця) --------------------
// Заповнюється після того, як створиш Форму й опублікуєш Таблицю.
// Покрокова інструкція — у README.md.
const CONFIG = {
  // Посилання на відправку Google Форми, напр.:
  // "https://docs.google.com/forms/d/e/XXXXXXXXXXXXXXXX/formResponse"
  FORM_ACTION_URL: "",

  // ID поля Форми, куди пишемо ідентифікатор подарунка (item.id), напр. "entry.123456789"
  FORM_ITEM_ENTRY: "",

  // Посилання на опубліковану Таблицю у форматі CSV (gviz-ендпоінт), напр.:
  // "https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXX/gviz/tq?tqx=out:csv&sheet=Form Responses 1"
  SHEET_CSV_URL: "",
};

// ---- СПИСОК ПОДАРУНКІВ -----------------------------------------------------
const ITEMS = [
  { id: "item-01", name: "Блокнот з трафаретами «Рожева мрія»", note: "Make It Real, MR3203", photo: "assets/photos/sketchbook.jpg", storeUrl: "https://antoshka.ua/uk/bloknot-z-trafaretami-make-it-real-rozheva-mrija-mr3203.html" },
  { id: "item-02", name: "Набір для створення браслетів Juicy Couture", note: "Make It Real, MR4439", photo: "assets/photos/bracelets.jpg", storeUrl: "https://antoshka.ua/uk/nabir-dlja-stvorennja-brasletiv-make-it-real-juicy-couture-mr4439.html" },
  { id: "item-03", name: "Глобус з підсвічуванням Day&Night", note: "Tecnodidattica, 25 см", photo: "assets/photos/globe.jpg", storeUrl: "https://antoshka.ua/uk/globus-tecnodidattica-day-night-z-pidsvichuvannjam-25-sm-ukr-0325gnnduclbb046.html" },
  { id: "item-04", name: "Набір-сюрприз Cutie Pops", note: "3 шт", photo: "assets/photos/cutiepops.jpg", storeUrl: "https://bi.ua/ukr/product/nabr-syurpriz-eolo-cutie-pops-3-sht-8411936726759.html" },
  { id: "item-05", name: "Сквіш-сюрприз Tiki Wiki «Тікі Дамплінг»", note: "Гігантський — продається в острівці біля BB Club", photo: "assets/photos/tikiwiki.jpg", storeUrl: "" },
  { id: "item-06", name: "Канцелярія на ваш вибір", note: "Будь-які канцелярські дрібнички — олівці, ручки, стікери тощо", photo: "assets/photos/stationery.jpg", storeUrl: "" },
];

// ---------------------------------------------------------------------------

const LOCAL_KEY = "mia_wishlist_reserved_by_me";

function getLocallyReserved() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function rememberLocalReservation(id) {
  const list = getLocallyReserved();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }
}

function renderItems(reservedIds) {
  const grid = document.getElementById("giftGrid");
  grid.innerHTML = "";

  ITEMS.forEach((item) => {
    const isReserved = reservedIds.has(item.id);
    const li = document.createElement("li");
    li.className = "gift-card" + (isReserved ? " is-reserved" : "");
    li.dataset.itemId = item.id;

    const hasStore = Boolean(item.storeUrl);
    const nameHtml = hasStore
      ? `<a class="gift-name" href="${item.storeUrl}" target="_blank" rel="noopener">${item.name}</a>`
      : `<span class="gift-name">${item.name}</span>`;
    const storeBtnHtml = hasStore
      ? `<a class="btn btn-store" href="${item.storeUrl}" target="_blank" rel="noopener">🛍️ У магазин</a>`
      : "";

    li.innerHTML = `
      <div class="gift-photo">
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
      </div>
      <div class="gift-body">
        ${nameHtml}
        ${item.note ? `<p class="gift-note">${item.note}</p>` : ""}
        <div class="gift-actions">
          ${storeBtnHtml}
          <button type="button" class="btn btn-reserve" data-action="reserve">🎁 Забронювати</button>
          <span class="gift-tag-reserved">🎁 Вже заброньовано</span>
        </div>
      </div>
    `;

    grid.appendChild(li);
  });

  grid.addEventListener("click", onGridClick);
}

function onGridClick(e) {
  const btn = e.target.closest('[data-action="reserve"]');
  if (!btn) return;
  const card = btn.closest(".gift-card");
  const itemId = card.dataset.itemId;
  reserveItem(itemId, card);
}

function reserveItem(itemId, cardEl) {
  // Оптимістично оновлюємо інтерфейс одразу, не чекаючи мережі.
  cardEl.classList.add("is-reserved");
  rememberLocalReservation(itemId);
  submitReservation(itemId);
}

function submitReservation(itemId) {
  if (!CONFIG.FORM_ACTION_URL || !CONFIG.FORM_ITEM_ENTRY) {
    console.warn("[wishlist] Форма ще не налаштована — дивись README.md");
    return;
  }

  // "Тиха" відправка Google Форми через прихований iframe, без переходу зі сторінки.
  const form = document.createElement("form");
  form.action = CONFIG.FORM_ACTION_URL;
  form.method = "POST";
  form.target = "hidden_form_target";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = CONFIG.FORM_ITEM_ENTRY;
  input.value = itemId;
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function parseCsvIds(csvText) {
  // Очікуємо, що перша колонка відповіді Форми (після timestamp) — це ID подарунка.
  const ids = new Set();
  const lines = csvText.split(/\r?\n/).slice(1); // пропускаємо заголовок
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    // Timestamp у першій колонці, ID подарунка — у другій.
    const id = cols[1];
    if (id) ids.add(id);
  }
  return ids;
}

async function loadReservedFromSheet() {
  if (!CONFIG.SHEET_CSV_URL) {
    console.warn("[wishlist] Таблиця ще не налаштована — дивись README.md");
    return new Set();
  }
  try {
    const res = await fetch(CONFIG.SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    return parseCsvIds(text);
  } catch (err) {
    console.error("[wishlist] Не вдалося завантажити стан бронювання:", err);
    return new Set();
  }
}

(async function init() {
  const reservedFromSheet = await loadReservedFromSheet();
  const reservedLocally = new Set(getLocallyReserved());
  const reserved = new Set([...reservedFromSheet, ...reservedLocally]);
  renderItems(reserved);
})();
