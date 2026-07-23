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

// ---- СПИСОК ПОДАРУНКІВ (плейсхолдери — заміни на реальні) ----------------
const ITEMS = [
  { id: "item-01", name: "Книга «Пушин» — том 1", note: "Перша книга серії", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-02", name: "Книга «Пушин» — том 2", note: "Продовження історій", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-03", name: "М'яка іграшка-кіт", note: "Великий розмір", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-04", name: "Набір для малювання", note: "Кольорові олівці + скетчбук", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-05", name: "Пазл 500 елементів", note: "Тема — котики", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-06", name: "Настільна гра", note: "Для всієї родини", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-07", name: "Рюкзак", note: "Для школи", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-08", name: "Набір для творчості", note: "Бісероплетіння", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-09", name: "Плед", note: "М'який, з візерунком", photo: "assets/placeholder.svg", storeUrl: "#" },
  { id: "item-10", name: "Сертифікат у книгарню", note: "Щоб обрати самій", photo: "assets/placeholder.svg", storeUrl: "#" },
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

    li.innerHTML = `
      <div class="gift-photo">
        <img src="${item.photo}" alt="${item.name}" loading="lazy">
      </div>
      <div class="gift-body">
        <a class="gift-name" href="${item.storeUrl}" target="_blank" rel="noopener">${item.name}</a>
        ${item.note ? `<p class="gift-note">${item.note}</p>` : ""}
        <div class="gift-actions">
          <a class="btn btn-store" href="${item.storeUrl}" target="_blank" rel="noopener">🛍️ У магазин</a>
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
