/**
 * Бот Chaos: обработка команд @chaos: <команда>, генерация ответов (без внешних API).
 */

const CHAOS_PREFIX = /^@chaos:\s*(.+)$/i;

/** Рандомные прогнозы погоды */
const WEATHER_FORECASTS = [
  'Солнечно, +22°C. Идеальный день для прогулки!',
  'Переменная облачность, +18°C. Возможен кратковременный дождь вечером.',
  'Пасмурно, +14°C. Не забудьте зонт.',
  'Ясно, +25°C. Жарко — пейте воду.',
  'Небольшая облачность, +20°C. Лёгкий ветер с запада.',
  'Дождь, +12°C. Останьтесь дома с чаем и книгой.',
  'Снег, -5°C. Зима напоминает о себе.',
  'Туман, +10°C. Видимость понижена.',
  'Гроза возможна после обеда, +19°C. Будьте осторожны на улице.',
  'Морозно и ясно, -8°C. Отличный день для зимних забав.',
];

/** Варианты ответов для других команд */
const HELP_RESPONSES = [
  'Доступные команды: @chaos: погода, помощь, гороскоп, анекдот, время, привет, напоминания. Также можно искать, закреплять и добавлять в избранное.',
  'Команды: погода — прогноз, гороскоп — знак, анекдот — шутка, время — серверное время, привет — поздороваться, напоминания — список напоминаний. Напишите @chaos: помощь в любой момент.',
];

const HOROSCOPE_RESPONSES = [
  'Овен: сегодня ждёт неожиданная встреча. Будьте готовы к новым возможностям!',
  'Телец: день удачен для финансовых дел. Не упустите шанс.',
  'Близнецы: звонок от старого друга принесёт хорошие новости.',
  'Рак: сосредоточьтесь на семье — звёзды благоволят домашнему уюту.',
  'Лев: творческий подъём. Смело предлагайте идеи.',
  'Дева: мелкие задачи лучше завершить до вечера.',
  'Весы: компромисс в споре окажется выгодным.',
  'Скорпион: интуиция не подведёт — доверьтесь себе.',
  'Стрелец: короткая поездка принесёт удовольствие.',
  'Козерог: карьерный шаг возможен — проявите инициативу.',
];

const JOKE_RESPONSES = [
  'Программист на пляже: "Море — как база данных: волны — транзакции, песок — кэш, ракушки — потерянные данные."',
  '— Почему программисты путают Хэллоуин и Рождество? — Потому что Oct 31 == Dec 25.',
  'Собеседование: "Опишите себя одной фразой." — "Я тот, кто перед дедлайном гуглит всё подряд."',
  'Два байта встретились. Один спрашивает: "Ты не тот, кто сломал мне четность?"',
  '— Как отличить интроверта-программиста? — Он смотрит на твои ботинки, а не на твои приложения.',
];

const GREETING_RESPONSES = [
  'Привет! Я бот Chaos Organizer. Чем могу помочь?',
  'Здравствуй! Напиши @chaos: помощь для списка команд.',
  'Привет! Погода, гороскоп, анекдот, время — просто напиши команду.',
];

/**
 * Извлекает команду из текста сообщения.
 * @param {string} content - текст сообщения
 * @returns {string|null} - команда (например, "погода") или null
 */
export function parseChaosCommand(content) {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  const match = trimmed.match(CHAOS_PREFIX);
  return match ? match[1].trim().toLowerCase() : null;
}

/**
 * Возвращает случайный элемент массива.
 * @param {Array} arr
 * @returns {*}
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Форматирует список напоминаний в текст.
 * @param {Array<{ id: string, text: string, triggerAt: Date|string }>} reminders
 * @returns {string}
 */
function formatRemindersList(reminders) {
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return 'Пока нет напоминаний. Добавить можно через меню (бургер → Напоминание) или команду @schedule: HH:MM DD.MM.YYYY «текст».';
  }
  const lines = reminders.map((r, i) => {
    const at = r.triggerAt ? new Date(r.triggerAt).toLocaleString('ru-RU') : '—';
    return `${i + 1}. ${(r.text || 'Без текста')} — ${at}`;
  });
  return 'Ваши напоминания:\n' + lines.join('\n');
}

/**
 * Генерирует ответ бота по команде.
 * @param {string} command - команда без префикса @chaos:
 * @param {{ reminders?: Array }} [context] - контекст (напоминания для команды «напоминания»)
 * @returns {string} - текст ответа
 */
export function getBotResponse(command, context = {}) {
  if (!command) return 'Напишите @chaos: помощь для списка команд.';

  if (command === 'погода') {
    return pickRandom(WEATHER_FORECASTS);
  }
  if (command === 'помощь' || command === 'help') {
    return pickRandom(HELP_RESPONSES);
  }
  if (command === 'гороскоп') {
    return pickRandom(HOROSCOPE_RESPONSES);
  }
  if (command === 'анекдот') {
    return pickRandom(JOKE_RESPONSES);
  }
  if (command === 'время') {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `Текущее время сервера (${tz}): ${now.toLocaleString('ru-RU')}`;
  }
  if (command === 'привет' || command === 'здравствуй' || command === 'хай') {
    return pickRandom(GREETING_RESPONSES);
  }
  if (command === 'напоминания' || command === 'напоминание') {
    return formatRemindersList(context.reminders || []);
  }

  return `Команда «${command}» не распознана. Напишите @chaos: помощь для списка команд.`;
}
