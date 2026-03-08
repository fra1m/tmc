# TMC Test App (React + Express)

Приложение для работы со списком из `1_000_000` базовых элементов с двумя окнами:
- левое: все доступные (кроме выбранных)
- правое: выбранные элементы с пользовательским порядком

Каждый элемент имеет поле:
- `id`

## Стек

- Backend: Node.js + Express.js (JavaScript)
- Frontend: React + Vite (JavaScript)
- Data fetching: TanStack Query
- DnD: dnd-kit
- Хранение данных: in-memory на сервере

## Установка

### 1) Backend

```bash
cd backend
npm install
```

### 2) Frontend

```bash
cd frontend
npm install
```

## Запуск

Откройте 2 терминала.

### Терминал 1: backend

```bash
cd backend
npm run dev
```

Backend стартует на `http://localhost:4000`.

### Терминал 2: frontend

```bash
cd frontend
npm run dev
```

Frontend стартует на `http://localhost:5173`.

## Команды

### Backend
- `npm run dev` — запуск с watch
- `npm start` — запуск без watch

### Frontend
- `npm run dev` — dev-сервер
- `npm run build` — production build
- `npm run preview` — preview build

## Архитектура

### Представление базовых `1..1_000_000`

Базовые элементы **не материализуются в массив**. Диапазон хранится как константы `BASE_MIN_ID` и `BASE_MAX_ID`, а элементы вычисляются при выборке.
У базовых элементов ID строковый (например, `"42"`).

### Ручное добавление

- `manualIdsSet` — быстрые проверки существования
- `manualIdsSorted` — отсортированный массив для стабильной выдачи в левом списке

### Выбранные элементы

- `selectedSet` — O(1) проверка, выбран ли элемент
- `selectedOrder` — порядок выбранных элементов для правого списка и DnD

### Очереди и батчинг

Реализованы две очереди (`OperationQueue`):

1. `addQueue` (батч раз в 10 сек):
   - для `POST /items/add`
   - дедупликация с политикой `reject` (`add:<id>`)
   - повторная попытка добавить тот же ID до обработки батча вернет `409 ALREADY_QUEUED`

2. `dataQueue` (батч раз в 1 сек):
   - для read/update операций (`left/right/state/select/unselect/reorder`)
   - дедупликация с политикой `merge` (дубликаты получают один и тот же promise)

Таким образом запросы не выполняются мгновенно, а обрабатываются пачками по таймеру.

### Дедупликация

Дедупликация по ключу операции:
- `left:<query>:<offset>:<limit>`
- `right:<query>:<offset>:<limit>`
- `select:<id>`
- `unselect:<id>`
- `reorder:<activeId>:<overId>:<query>`
- `add:<id>`

### Гарантия уникальности ID

`store.addManualId` проверяет `exists(id)` перед добавлением:
- базовый диапазон (`1..1_000_000`) уже существует
- вручную добавленные проверяются через `manualIdsSet`
- дубли в очереди add режутся дедупликацией до выполнения

### Infinite scroll

- Сервер возвращает страницы по `20` элементов (`offset + limit`)
- Клиент использует `useInfiniteQuery` + `IntersectionObserver`
- Подгрузка происходит только при пересечении sentinel

### Reorder для отфильтрованного правого списка

При reorder сервер:
1. строит `filtered = selectedOrder.filter(matchesQuery)`
2. двигает элемент внутри `filtered`
3. пересобирает глобальный `selectedOrder`, заменяя только позиции элементов, попавших в фильтр

Итог: корректно меняется **общий порядок**, а не только текущий видимый кусок.

### Сохранение между refresh

Состояние выбора и порядок хранятся на сервере в памяти процесса. После перезагрузки страницы клиент заново читает `/api/items/right` и `/api/state`.

## API

### `GET /api/items/left`
Параметры: `query`, `offset`.

Ответ:
```json
{
  "items": [
    { "id": "1" },
    { "id": "2" }
  ],
  "nextOffset": 20
}
```

### `GET /api/items/right`
Параметры: `query`, `offset`.

Ответ:
```json
{
  "items": [
    { "id": "42" },
    { "id": "77" }
  ],
  "nextOffset": null
}
```

### `POST /api/items/add`
Тело:
```json
{ "id": "custom-id-001" }
```

### `POST /api/selected/add`
Тело:
```json
{ "id": "42" }
```

### `POST /api/selected/remove`
Тело:
```json
{ "id": "42" }
```

### `POST /api/selected/reorder`
Тело:
```json
{
  "activeId": "42",
  "overId": "77",
  "query": ""
}
```

### `GET /api/state`
Текущая сводка состояния и очередей.

## Edge cases, покрытые в реализации

- добавление уже существующего ID
- добавление ID, уже стоящего в очереди add
- выбор уже выбранного элемента
- снятие выбора невыбранного элемента
- reorder на пустом списке
- reorder в отфильтрованном списке
- несуществующий ID в поиске
- пустая строка в качестве ID
- ID с произвольными символами
- повторные клики и дубликаты запросов
- конкурирующие add/select/unselect/reorder через очередь
- восстановление состояния после refresh

## Ограничения текущей минимальной версии

- Данные живут только в памяти процесса (по условию); при перезапуске backend состояние сбрасывается.
- Фильтрация реализована как `id.includes(query)`, что универсально, но не использует специальные индексы.
