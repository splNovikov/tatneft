# PlantUML Diagrams

## Подход с отдельными .puml файлами

PlantUML диаграммы хранятся в отдельных `.puml` файлах в папке `public/diagrams/` и ссылаются из markdown.

## Использование

### В markdown файле:

Замените блоки кода PlantUML на ссылки:

**Было:**

````markdown
```plantuml
@startuml
... код диаграммы ...
@enduml
```
````

````

**Стало:**
```markdown
```plantuml
@plantuml:slide1-current-process.puml
````

````

### Извлечение диаграмм из markdown

Используйте скрипт для автоматического извлечения:

```bash
node scripts/extract-plantuml.js ../docs/Phase-1-Presentation.md public/diagrams
````

Скрипт:

1. Найдет все блоки PlantUML в markdown
2. Извлечет их в отдельные `.puml` файлы
3. Покажет ссылки для замены в markdown

### Ручное создание

1. Создайте файл в `public/diagrams/`, например `slide1-diagram.puml`
2. Поместите туда код PlantUML (без markdown блоков)
3. В markdown используйте:
   ````markdown
   ```plantuml
   @plantuml:slide1-diagram.puml
   ```
   ````
   ```

   ```

## Преимущества

- ✅ Диаграммы редактируются отдельно
- ✅ Можно использовать PlantUML редакторы
- ✅ Нет проблем с кодированием в URL
- ✅ Легче поддерживать и версионировать
- ✅ Можно использовать локальный PlantUML сервер

## Структура файлов

```
presentation/
├── public/
│   └── diagrams/
│       ├── slide1-current-process.puml
│       ├── slide2-phased-approach.puml
│       └── ...
└── src/
    └── widgets/
        └── slide/
            └── slide-content/
                └── plantuml-renderer/
```
