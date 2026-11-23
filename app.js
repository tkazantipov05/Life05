const STORE_KEY = 'life-os-v2';
const todayKey = new Date().toISOString().slice(0, 10);

const defaultData = {
  plans: [
    { id: crypto.randomUUID(), title: 'Выделить время для себя', date: todayKey, category: 'Личное', horizon: 'today', done: false },
    { id: crypto.randomUUID(), title: 'Прогулка без телефона', date: todayKey, category: 'Здоровье', horizon: 'today', done: true },
  ],
  habits: [
    { id: crypto.randomUUID(), title: 'Стакан воды утром', icon: '☀', checkedOn: [] },
    { id: crypto.randomUUID(), title: '20 минут чтения', icon: '✦', checkedOn: [todayKey] },
  ],
  diary: [
    { id: crypto.randomUUID(), title: 'Начало моей книги', date: todayKey, body: 'Сегодня я начинаю собирать свою жизнь по страницам — спокойно, бережно и в своём ритме.' },
  ],
  growth: {
    books: [
      { id: crypto.randomUUID(), title: 'Атомные привычки', detail: 'Джеймс Клир', status: 'reading' },
    ],
    notes: [
      { id: crypto.randomUUID(), title: 'Главная мысль недели', date: todayKey, body: 'Не стремиться изменить всё сразу — создать среду, в которой правильный шаг становится естественным.' },
    ],
    skills: [
      { id: crypto.randomUUID(), title: 'Осознанное планирование', detail: 'Связывать ежедневные дела с долгосрочными целями', status: 'practice' },
    ],
  },
};

let data = loadData();
let activePlanFilter = 'all';
let activePlanHorizon = 'today';
let diaryFilterMode = 'all';
let selectedDiaryDate = null;
let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let activeGrowthView = 'books';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && saved.plans && saved.habits && saved.diary) {
      saved.plans = saved.plans.map(plan => ({ ...plan, horizon: plan.horizon || 'today' }));
      saved.growth = saved.growth || structuredClone(defaultData.growth);
      return saved;
    }
    return structuredClone(defaultData);
  } catch { return structuredClone(defaultData); }
}

function saveData(message = 'Сохранено') {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  renderAll();
  showToast(message);
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function formatDate(value, long = false) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('ru-RU', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' }).format(date);
}

function setDates() {
  const now = new Date();
  $('#dateSeal').innerHTML = `<strong>${now.getDate()}</strong><small>${new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(now).replace('.', '')}</small>`;
  $('#fullDate').textContent = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const hour = now.getHours();
  $('#greeting').textContent = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
}

function renderPlans() {
  const horizonNames = { today: 'Сегодня', week: 'Неделя', month: 'Месяц', year: 'Год', life: 'Жизнь' };
  const filtered = data.plans.filter(plan => plan.horizon === activePlanHorizon && (activePlanFilter === 'all' || (activePlanFilter === 'done' ? plan.done : !plan.done)));
  $('#plansList').innerHTML = filtered.length ? filtered.map(plan => `
    <article class="record-row ${plan.done ? 'completed' : ''}">
      <button class="record-check ${plan.done ? 'checked' : ''}" data-action="toggle-plan" data-id="${plan.id}" aria-label="${plan.done ? 'Вернуть план' : 'Выполнить план'}">${plan.done ? '✓' : ''}</button>
      <div class="record-main"><h3>${escapeHtml(plan.title)}</h3><p>${escapeHtml(plan.category)} · ${horizonNames[plan.horizon]} · ${formatDate(plan.date)}</p></div>
      <div class="row-actions">
        <button class="tiny-button" data-action="edit-plan" data-id="${plan.id}" aria-label="Редактировать">✎</button>
        <button class="tiny-button" data-action="delete-plan" data-id="${plan.id}" aria-label="Удалить">×</button>
      </div>
    </article>`).join('') : emptyState(`Планы на «${horizonNames[activePlanHorizon]}»`, 'Здесь пока свободно. Добавьте один важный шаг для этого горизонта.');

  const todayPlans = data.plans.filter(plan => plan.date === todayKey).slice(0, 4);
  $('#todayPlans').innerHTML = todayPlans.length ? todayPlans.map(plan => `
    <div class="compact-item ${plan.done ? 'done' : ''}">
      <button class="compact-check ${plan.done ? 'done' : ''}" data-action="toggle-plan" data-id="${plan.id}">${plan.done ? '✓' : ''}</button>
      <span>${escapeHtml(plan.title)}</span><small class="compact-date">сегодня</small>
    </div>`).join('') : '<p class="empty-inline">Сегодняшняя страница пока свободна.</p>';
}

function renderHabits() {
  const completed = data.habits.filter(habit => habit.checkedOn.includes(todayKey)).length;
  const total = data.habits.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  $('#habitsList').innerHTML = total ? data.habits.map(habit => {
    const checked = habit.checkedOn.includes(todayKey);
    return `<article class="record-row habit-row">
      <div class="habit-symbol">${escapeHtml(habit.icon)}</div>
      <div class="record-main"><h3>${escapeHtml(habit.title)}</h3><p>${checked ? 'Сегодня выполнено' : 'Ждёт отметки'}</p></div>
      <button class="habit-toggle ${checked ? 'checked' : ''}" data-action="toggle-habit" data-id="${habit.id}" aria-label="${checked ? 'Снять отметку' : 'Отметить привычку'}"></button>
      <div class="row-actions">
        <button class="tiny-button" data-action="edit-habit" data-id="${habit.id}" aria-label="Редактировать">✎</button>
        <button class="tiny-button" data-action="delete-habit" data-id="${habit.id}" aria-label="Удалить">×</button>
      </div>
    </article>`;
  }).join('') : emptyState('Создайте свой ритм', 'Добавьте привычку, которую хочется поддерживать каждый день.');
  $('#habitCount').textContent = `${completed} из ${total}`;
  $('#habitBar').style.width = `${percent}%`;
  $('#habitRing').style.setProperty('--progress', percent);
  $('#habitPercent').textContent = `${percent}%`;
  $('#habitSummary').textContent = total ? `${completed} из ${total} выполнено` : 'Добавьте первую привычку';
}

function renderDiary() {
  const sorted = [...data.diary].sort((a, b) => b.date.localeCompare(a.date));
  const monthPrefix = `${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth() + 1).padStart(2, '0')}`;
  const visible = sorted.filter(entry => diaryFilterMode === 'all' || (diaryFilterMode === 'day' ? entry.date === selectedDiaryDate : entry.date.startsWith(monthPrefix)));
  $('#diaryList').innerHTML = visible.length ? visible.map(entry => `
    <article class="diary-entry">
      <div class="diary-entry-top">
        <div><div class="diary-date">${formatDate(entry.date, true)}</div><h3>${escapeHtml(entry.title)}</h3></div>
        <div class="row-actions">
          <button class="tiny-button" data-action="edit-diary" data-id="${entry.id}" aria-label="Редактировать">✎</button>
          <button class="tiny-button" data-action="delete-diary" data-id="${entry.id}" aria-label="Удалить">×</button>
        </div>
      </div>
      <p class="diary-text">${escapeHtml(entry.body)}</p>
    </article>`).join('') : emptyState(
      diaryFilterMode === 'all' ? 'Здесь появятся ваши мысли' : 'На этой странице пока тихо',
      diaryFilterMode === 'day' ? 'В выбранный день записей ещё не было.' : diaryFilterMode === 'month' ? 'В этом месяце записей ещё не было.' : 'Откройте новую страницу и напишите всё, что хочется сохранить.'
    );

  const latest = sorted[0];
  $('#latestDiary').innerHTML = latest ? `<p class="diary-preview-text">${escapeHtml(latest.body.slice(0, 150))}${latest.body.length > 150 ? '…' : ''}</p><span class="diary-preview-meta">${formatDate(latest.date, true)}</span>` : '<p class="empty-inline">Дневник ждёт первую запись.</p>';
  renderCalendar();
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(calendarCursor);
  $('#calendarMonthLabel').textContent = monthName.replace(' г.', '');
  const previousMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  $('#previousMonthLabel').textContent = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(previousMonth);
  $('#nextMonthLabel').textContent = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(nextMonth);
  $('[data-calendar-step="-1"]').setAttribute('aria-label', `Открыть ${new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(previousMonth)}`);
  $('[data-calendar-step="1"]').setAttribute('aria-label', `Открыть ${new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(nextMonth)}`);
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const entryDates = new Set(data.diary.map(entry => entry.date));
  const cells = Array.from({ length: firstWeekday }, () => '<span class="calendar-spacer"></span>');
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const classes = ['calendar-day'];
    if (date === todayKey) classes.push('today');
    if (entryDates.has(date)) classes.push('has-entry');
    if (date === selectedDiaryDate && diaryFilterMode === 'day') classes.push('selected');
    cells.push(`<button class="${classes.join(' ')}" data-diary-date="${date}" aria-label="${formatDate(date, true)}${entryDates.has(date) ? ', есть запись' : ''}">${day}</button>`);
  }
  $('#calendarGrid').innerHTML = cells.join('');
  const context = $('#diaryContext');
  context.classList.toggle('hidden', diaryFilterMode === 'all');
  $('#diaryContextText').textContent = diaryFilterMode === 'day'
    ? `Записи за ${formatDate(selectedDiaryDate, true)}`
    : `Записи за ${monthName.replace(' г.', '')}`;
}

function shiftDiaryMonth(step) {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + step, 1);
  diaryFilterMode = 'month';
  selectedDiaryDate = null;
  renderDiary();
}

function renderGrowth() {
  const labels = {
    books: { singular: 'book', add: 'Добавить книгу', title: 'Книжная полка', copy: 'прочитано и запланировано' },
    notes: { singular: 'note', add: 'Новый конспект', title: 'Мои конспекты', copy: 'мыслей сохранено' },
    skills: { singular: 'skill', add: 'Новый навык', title: 'Карта навыков', copy: 'навыков в развитии' },
  };
  const items = data.growth[activeGrowthView] || [];
  const addButton = $('#addGrowthItem');
  addButton.textContent = labels[activeGrowthView].add;
  addButton.dataset.openForm = labels[activeGrowthView].singular;
  $('#growthSummary').innerHTML = `<span><strong>${labels[activeGrowthView].title}</strong></span><span>${items.length} ${labels[activeGrowthView].copy}</span>`;

  const statusLabels = { planned: 'Хочу прочитать', reading: 'Читаю', finished: 'Прочитано', learning: 'Изучаю', practice: 'Практикую', mastered: 'Освоено' };
  $('#growthList').innerHTML = items.length ? items.map(item => {
    const type = labels[activeGrowthView].singular;
    const kindClass = type === 'note' ? 'note' : type === 'skill' ? 'skill' : 'book';
    const symbol = type === 'book' ? '▤' : type === 'note' ? '✎' : '✦';
    const secondary = type === 'note' ? formatDate(item.date, true) : escapeHtml(item.detail || '');
    return `<article class="growth-card ${kindClass}">
      <div class="growth-mark">${symbol}</div>
      <div class="growth-content">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${secondary}</p>
        ${type === 'note' ? `<p class="growth-note-copy">${escapeHtml(item.body.slice(0, 180))}${item.body.length > 180 ? '…' : ''}</p>` : `<span class="growth-status">${statusLabels[item.status] || ''}</span>`}
      </div>
      <div class="row-actions">
        <button class="tiny-button" data-action="edit-${type}" data-id="${item.id}" aria-label="Редактировать">✎</button>
        <button class="tiny-button" data-action="delete-${type}" data-id="${item.id}" aria-label="Удалить">×</button>
      </div>
    </article>`;
  }).join('') : emptyState(
    activeGrowthView === 'books' ? 'Книжная полка ждёт' : activeGrowthView === 'notes' ? 'Сохраните первую мысль' : 'Выберите навык для роста',
    activeGrowthView === 'books' ? 'Добавьте книгу, которую читаете или хотите прочитать.' : activeGrowthView === 'notes' ? 'Создайте короткий конспект книги, статьи или урока.' : 'Добавьте то, что хотите изучить и применять на практике.'
  );
}

function emptyState(title, copy) {
  return `<div class="empty-state"><div class="empty-symbol">❦</div><h3>${title}</h3><p>${copy}</p></div>`;
}

function renderAll() { renderPlans(); renderHabits(); renderDiary(); renderGrowth(); }

function showPage(name) {
  $$('.page').forEach(page => page.classList.toggle('active', page.dataset.page === name));
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.target === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function configureDialog(type, record = null) {
  const isDiary = type === 'diary';
  const isHabit = type === 'habit';
  const isBook = type === 'book';
  const isNote = type === 'note';
  const isSkill = type === 'skill';
  $('#recordType').value = type;
  $('#recordId').value = record?.id || '';
  $('#recordTitle').value = record?.title || '';
  $('#recordDate').value = record?.date || todayKey;
  $('#recordHorizon').value = record?.horizon || activePlanHorizon;
  $('#recordCategory').value = record?.category || 'Личное';
  $('#recordIcon').value = record?.icon || '☀';
  $('#recordBody').value = record?.body || '';
  $('#recordDetail').value = record?.detail || '';
  if (isBook) {
    $('#recordGrowthStatus').innerHTML = '<option value="planned">Хочу прочитать</option><option value="reading">Читаю</option><option value="finished">Прочитано</option>';
  } else if (isSkill) {
    $('#recordGrowthStatus').innerHTML = '<option value="learning">Изучаю</option><option value="practice">Практикую</option><option value="mastered">Освоено</option>';
  }
  $('#recordGrowthStatus').value = record?.status || (isBook ? 'planned' : 'learning');
  $('#dialogChapter').textContent = record ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ ЗАПИСЬ';
  const typeNames = { plan: 'план', habit: 'привычку', diary: 'страницу', book: 'книгу', note: 'конспект', skill: 'навык' };
  $('#dialogTitle').textContent = `${record ? 'Изменить' : 'Добавить'} ${typeNames[type]}`;
  $('#dateField').classList.toggle('hidden', isHabit || isBook || isSkill);
  $('#horizonField').classList.toggle('hidden', type !== 'plan');
  $('#categoryField').classList.toggle('hidden', type !== 'plan');
  $('#iconField').classList.toggle('hidden', !isHabit);
  $('#bodyField').classList.toggle('hidden', !(isDiary || isNote));
  $('#detailField').classList.toggle('hidden', !(isBook || isSkill));
  $('#growthStatusField').classList.toggle('hidden', !(isBook || isSkill));
  $('#detailLabel').textContent = isBook ? 'Автор' : 'Что хочу освоить';
  $('#titleLabel').textContent = isDiary ? 'Заголовок страницы' : isHabit ? 'Название привычки' : isBook ? 'Название книги' : isNote ? 'Заголовок конспекта' : isSkill ? 'Название навыка' : 'Название плана';
  $('#validation').textContent = '';
  $('#editorDialog').showModal();
  setTimeout(() => $('#recordTitle').focus(), 50);
}

function handleSubmit(event) {
  event.preventDefault();
  const type = $('#recordType').value;
  const id = $('#recordId').value;
  const title = $('#recordTitle').value.trim();
  const body = $('#recordBody').value.trim();
  if (!title || ((type === 'diary' || type === 'note') && !body)) {
    $('#validation').textContent = type === 'diary' || type === 'note' ? 'Добавьте заголовок и текст.' : 'Напишите название.';
    return;
  }
  const growthKey = { book: 'books', note: 'notes', skill: 'skills' }[type];
  const collection = growthKey ? data.growth[growthKey] : type === 'plan' ? data.plans : type === 'habit' ? data.habits : data.diary;
  const current = collection.find(item => item.id === id);
  const record = type === 'plan'
    ? { id: id || crypto.randomUUID(), title, date: $('#recordDate').value, category: $('#recordCategory').value, horizon: $('#recordHorizon').value, done: current?.done || false }
    : type === 'habit'
      ? { id: id || crypto.randomUUID(), title, icon: $('#recordIcon').value, checkedOn: current?.checkedOn || [] }
      : type === 'book'
        ? { id: id || crypto.randomUUID(), title, detail: $('#recordDetail').value.trim(), status: $('#recordGrowthStatus').value }
        : type === 'note'
          ? { id: id || crypto.randomUUID(), title, date: $('#recordDate').value, body }
          : type === 'skill'
            ? { id: id || crypto.randomUUID(), title, detail: $('#recordDetail').value.trim(), status: $('#recordGrowthStatus').value }
            : { id: id || crypto.randomUUID(), title, date: $('#recordDate').value, body };
  if (current) Object.assign(current, record); else collection.unshift(record);
  if (type === 'diary') {
    const [year, month] = record.date.split('-').map(Number);
    calendarCursor = new Date(year, month - 1, 1);
    selectedDiaryDate = record.date;
    diaryFilterMode = 'day';
  }
  if (growthKey) activeGrowthView = growthKey;
  $('#editorDialog').close();
  saveData(current ? 'Изменения сохранены' : 'Новая запись добавлена');
}

function handleAction(action, id) {
  const [verb, type] = action.split('-');
  if (verb === 'toggle' && type === 'plan') {
    const plan = data.plans.find(item => item.id === id); plan.done = !plan.done; saveData(plan.done ? 'План выполнен' : 'План снова в работе');
  }
  if (verb === 'toggle' && type === 'habit') {
    const habit = data.habits.find(item => item.id === id);
    habit.checkedOn = habit.checkedOn.includes(todayKey) ? habit.checkedOn.filter(day => day !== todayKey) : [...habit.checkedOn, todayKey];
    saveData(habit.checkedOn.includes(todayKey) ? 'Привычка отмечена' : 'Отметка снята');
  }
  if (verb === 'edit') {
    const growthKey = { book: 'books', note: 'notes', skill: 'skills' }[type];
    const collection = growthKey ? data.growth[growthKey] : type === 'plan' ? data.plans : type === 'habit' ? data.habits : data.diary;
    configureDialog(type, collection.find(item => item.id === id));
  }
  if (verb === 'delete') {
    const labels = { plan: 'этот план', habit: 'эту привычку', diary: 'эту страницу дневника', book: 'эту книгу', note: 'этот конспект', skill: 'этот навык' };
    if (!confirm(`Удалить ${labels[type]}?`)) return;
    const growthKey = { book: 'books', note: 'notes', skill: 'skills' }[type];
    if (growthKey) data.growth[growthKey] = data.growth[growthKey].filter(item => item.id !== id);
    else {
      const key = type === 'plan' ? 'plans' : type === 'habit' ? 'habits' : 'diary';
      data[key] = data[key].filter(item => item.id !== id);
    }
    saveData('Запись удалена');
  }
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.target) showPage(target.dataset.target);
  if (target.dataset.go) showPage(target.dataset.go);
  if (target.dataset.openForm) configureDialog(target.dataset.openForm);
  if (target.dataset.action) handleAction(target.dataset.action, target.dataset.id);
  if (target.dataset.horizon) {
    activePlanHorizon = target.dataset.horizon;
    $$('#planHorizons .horizon-tab').forEach(button => button.classList.toggle('active', button === target));
    renderPlans();
  }
  if (target.dataset.growthView) {
    activeGrowthView = target.dataset.growthView;
    $$('#growthTabs .growth-tab').forEach(button => button.classList.toggle('active', button === target));
    renderGrowth();
  }
  if (target.dataset.calendarStep) shiftDiaryMonth(Number(target.dataset.calendarStep));
  if (target.dataset.diaryDate) {
    selectedDiaryDate = target.dataset.diaryDate;
    diaryFilterMode = 'day';
    renderDiary();
  }
  if (target.dataset.filter) {
    activePlanFilter = target.dataset.filter;
    $$('#planFilters .filter').forEach(button => button.classList.toggle('active', button === target));
    renderPlans();
  }
});

$('#calendarToggle').addEventListener('click', () => {
  const calendar = $('#diaryCalendar');
  const opening = calendar.classList.contains('hidden');
  calendar.classList.toggle('hidden', !opening);
  $('#calendarToggle').setAttribute('aria-expanded', String(opening));
});
$('#showAllDiary').addEventListener('click', () => {
  diaryFilterMode = 'all';
  selectedDiaryDate = null;
  renderDiary();
});

$('#closeDialog').addEventListener('click', () => $('#editorDialog').close());
$('#editorForm').addEventListener('submit', handleSubmit);
$('#editorDialog').addEventListener('click', event => {
  if (event.target === $('#editorDialog')) $('#editorDialog').close();
});
$('#dateSeal').addEventListener('click', () => showPage('today'));
setDates();
renderAll();
