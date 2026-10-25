const conventionalTemplate = {
  english: `Generate a commit message following the Conventional Commits format:

<type>[optional scope][optional !]: <description>

[optional body with bullet points]

[optional footer(s)]

### Rules:

1. **First line**: type(scope): description (aim for 50 characters, hard limit 80)
   - Use **imperative mood** for the description (e.g., "add" not "added").
   - Prefer starting with a **lowercase letter**; proper nouns, acronyms, and code identifiers may be capitalized.
2. **Scope** is optional: a short noun naming the affected module or area (e.g., auth, api, deps). Omit it for cross-cutting changes.
3. **Breaking changes**: add "!" right before the colon (e.g., 'feat(api)!: drop v1 endpoints') and/or add a footer 'BREAKING CHANGE: <what changed and how to migrate>'.
4. **Footers** go on their own line, after a blank line following the body; optionally reference issues or PRs (e.g., 'Closes #123', 'Refs: <commit shas>'), or describe the breaking change ('BREAKING CHANGE: ...').
5. **For small changes**, use only the first line.
6. **For complex changes**, list key points in the body:
   - Each line starts with "- ".
   - Limit to 5 bullet points.
   - Use **present tense** and **active voice**.
   - Focus on **what** and **why**, not **how** (unless necessary).

### Type Selection Rules:

Choose the most appropriate type based on the change:

- **docs**: changes to documentation of the project or codebase — README, guides, manpages, CHANGELOG, code comments — any file type counts
- **feat**: new features or significant functional changes
- **fix**: bug fixes and error corrections
- **style**: changes not affecting the code (e.g., formatting, semicolons)
- **refactor**: code changes that neither fix a bug nor add a feature
- **perf**: performance improvements
- **test**: adding or updating tests
- **build**: changes affecting the build system or external dependencies
- **ci**: CI/CD changes
- **chore**: updates to build configuration, libraries, and other maintenance tasks
- **revert**: reverting a previous commit, written as 'revert: <original commit headline>'

**Important**: The type is crucial for categorizing changes and maps to semantic versioning. fix maps to a patch release, feat to a minor release, and any breaking change ("!" or a BREAKING CHANGE footer) to a major release.

### Examples:

- **Documentation change**:

docs: update installation and usage guides

- add new features description
- update configuration section
- add usage examples

- **Feature change**:

feat(auth): add user authentication

- implement OAuth2 provider integration
- create auth service module
- add session management

- **Fix change**:

fix(api): resolve null pointer exception in user service

- **Refactor change**:

refactor(core): simplify error handling logic

- **Test change**:

test: add unit tests for authentication module

- **Breaking change**:

feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: all /v1/* routes are gone; clients must migrate to /v2/*.

- **Revert change**:

revert: feat(auth): add user authentication

Refs: 676104e, a215868

### Additional Tips:

- Keep commits focused on a **single logical change**, especially for complex changes.
- For more details, refer to the [Conventional Commits specification](https://www.conventionalcommits.org/).`,

  russian: `Создайте сообщение коммита в формате Conventional Commits:
<тип>[опциональная область][опциональный !]: <описание>

[опциональное тело со списком изменений]

[опциональные футеры]

Правила:
1. Первая строка: тип(область): описание (цель — 50 символов, жёсткий лимит 80)
   - Описание в **повелительном наклонении** (например, «добавить», а не «добавленный»).
   - Предпочтительно начинать со **строчной буквы**; имена собственные, акронимы и идентификаторы кода могут быть с прописной.
2. **Область (scope)** необязательна: короткое существительное, называющее затронутый модуль или область (например, auth, api, deps). Для сквозных изменений опускайте её.
3. **Критические изменения**: добавьте «!» сразу перед двоеточием (например, 'feat(api)!: удалить эндпоинты v1') и/или добавьте футер 'BREAKING CHANGE: <что изменилось и как мигрировать>'.
4. **Футеры** размещаются на отдельных строках после пустой строки, следующей за телом; можно сослаться на задачи или PR (например, 'Closes #123', 'Refs: <sha коммитов>') или описать критическое изменение ('BREAKING CHANGE: ...').
5. Для небольших изменений используйте только первую строку.
6. Для сложных изменений перечислите ключевые моменты в теле:
   - Каждая строка начинается с «- » и содержит не более 50 символов.
   - Ограничьте список 5 пунктами.
   - Используйте **настоящее время** и **активный залог**.
   - Фокус на **что** и **почему**, а не на **как** (если это не необходимо).

Правила выбора типа:

Выберите наиболее подходящий тип на основе изменения:

- **docs**: изменения документации проекта или кодовой базы — README, руководства, man-страницы, CHANGELOG, комментарии в коде — важен любой тип файла
- **feat**: новая функциональность или значимые функциональные изменения
- **fix**: исправление ошибок
- **style**: изменения, не затрагивающие код (например, форматирование, точки с запятой)
- **refactor**: изменения кода, которые не исправляют ошибку и не добавляют функциональность
- **perf**: улучшения производительности
- **test**: добавление или обновление тестов
- **build**: система сборки или внешние зависимости
- **ci**: изменения CI/CD
- **chore**: обновления конфигурации сборки, библиотек и другие задачи обслуживания
- **revert**: отмена предыдущего коммита, записывается как 'revert: <заголовок исходного коммита>'

**Важно**: тип критичен для категоризации изменений и отображается на семантическое версионирование. fix соответствует патч-релизу, feat — минорному релизу, а любое критическое изменение («!» или футер «BREAKING CHANGE:») — мажорному релизу.

Примеры:

- Изменение документации:

docs: обновить руководства по установке и использованию

- добавлено описание новых функций
- обновлён раздел конфигурации
- добавлены примеры использования

- Новая функциональность:

feat(auth): добавить аутентификацию пользователей

- внедрена интеграция с провайдером OAuth2
- создан модуль сервиса аутентификации
- добавлено управление сессиями

- Исправление ошибки:

fix(api): устранить исключение нулевого указателя в сервисе пользователей

- Рефакторинг:

refactor(core): упростить логику обработки ошибок

- Изменение тестов:

test: добавить модульные тесты модуля аутентификации

- Критическое изменение:

feat(api)!: удалить устаревшие эндпоинты v1

BREAKING CHANGE: все маршруты /v1/* удалены; клиентам нужно перейти на /v2/*.

- Отмена коммита:

revert: feat(auth): добавить аутентификацию пользователей

Refs: 676104e, a215868

Дополнительные советы:

- Держите коммит сосредоточенным на **одном логическом изменении**, особенно для сложных изменений.
- Подробнее: [спецификация Conventional Commits](https://www.conventionalcommits.org/).`,

  chinese: `生成符合约定式提交（Conventional Commits）格式的提交信息：
<类型>[可选范围][可选 !]: <描述>

[可选正文，包含要点]

[可选页脚]

规则：
1. 第一行：类型(范围): 描述（目标 50 字符，上限 80 字符）
   - 描述使用**祈使语气**（例如用“添加”，而不是“添加了”）。
   - 优先以**小写字母**开头；专有名词、缩写词和代码标识符可以用大写。
2. **范围**是可选的：用一个简短名词命名受影响的模块或区域（例如 auth、api、deps）。跨模块的改动可省略。
3. **破坏性变更**：在冒号前直接加上“!”（例如 'feat(api)!: 移除 v1 端点'），并且/或者添加页脚 'BREAKING CHANGE: <变更内容及迁移方式>'。
4. **页脚**在正文之后空一行，另起一行书写；可引用议题或 PR（例如 'Closes #123'、'Refs: <提交 sha>'），或描述破坏性变更（'BREAKING CHANGE: ...'）。
5. 对于小改动，仅使用第一行。
6. 对于复杂改动，在正文中列出关键点：
   - 每行以“- ”开头。
   - 限制为 5 个要点。
   - 使用**现在时态**和**主动语态**。
   - 聚焦“做什么”和“为什么”，而非“怎么做”（除非必要）。

类型选择规则：

根据改动选择最合适的类型：

- **docs**：项目或代码库文档的变更 — README、指南、手册页、CHANGELOG、代码注释 — 不限文件类型
- **feat**：新功能或重要的功能变更
- **fix**：Bug 修复和错误更正
- **style**：不影响代码的改动（例如格式化、分号）
- **refactor**：既不修复 bug 也不添加功能的代码改动
- **perf**：性能提升
- **test**：添加或更新测试
- **build**：构建系统或外部依赖项
- **ci**：CI/CD 的变动
- **chore**：构建配置、依赖库的更新和其他维护任务
- **revert**：撤销之前的提交，写作 'revert: <原提交标题>'

**重要**：类型对变更分类至关重要，并对应语义化版本。fix 对应补丁版本，feat 对应次版本，任何破坏性变更（“!”或“BREAKING CHANGE:”页脚）对应主版本。

示例：

- 文档变更：

docs: 更新安装和使用指南

- 添加新功能说明
- 更新配置部分
- 增加使用示例

- 功能变更：

feat(auth): 添加用户认证

- 实现 OAuth2 提供者集成
- 创建认证服务模块
- 添加会话管理

- 修复变更：

fix(api): 解决用户服务中的空指针异常

- 重构变更：

refactor(core): 简化错误处理逻辑

- 测试变更：

test: 为认证模块添加单元测试

- 破坏性变更：

feat(api)!: 移除已弃用的 v1 端点

BREAKING CHANGE: 所有 /v1/* 路由已删除；客户端必须迁移到 /v2/*。

- 撤销提交：

revert: feat(auth): 添加用户认证

Refs: 676104e, a215868

补充提示：

- 提交应聚焦于**单一逻辑变更**，尤其是复杂改动。
- 更多细节请参考 [Conventional Commits 规范](https://www.conventionalcommits.org/)。`,

  japanese: `コミットメッセージを Conventional Commits 形式で生成してください：
<タイプ>[オプションのスコープ][オプションの !]: <説明>

[オプションの本文（箇条書き）]

[オプションのフッター]

ルール：
1. 1行目: タイプ(スコープ): 説明 (目標50文字、上限80文字)
   - 説明は**命令形**で書く（例: 「追加」）。
   - 小文字で始めるのが望ましい。固有名詞・頭字語・コード識別子は大文字でもよい。
2. **スコープ**は省略可能: 影響するモジュールや領域を表す短い名詞（例: auth、api、deps）。横断的な変更では省略する。
3. **破壊的変更**: コロンの直前に「!」を付ける（例: 'feat(api)!: v1エンドポイントの削除'）。さらに 'BREAKING CHANGE: <変更内容と移行方法>' フッターを追加してもよい。
4. **フッター**は本文の後の空行に続けて新しい行に書く。課題やPRへの参照（例: 'Closes #123'、'Refs: <コミットsha>'）や破壊的変更の説明（'BREAKING CHANGE: ...'）を書いてよい。
5. 小さな変更は1行目のみ
6. 複雑な変更は本文に要点を列挙：
   - 各行は "- " で始まる
   - 5つの箇条書きに制限
   - **現在形**と**能動態**を使用
   - コミットが**何を・なぜ**行うかに集中（必要な場合を除き「どのように」は書かない）

タイプの選択ルール：

変更に基づいて最も適切なタイプを選択：

- docs: プロジェクトやコードベースのドキュメントの変更 — README、ガイド、manページ、CHANGELOG、コードコメント — ファイルの種類は問わない
- feat: 新機能または重要な機能変更
- fix: バグ修正とエラー訂正
- style: コードに影響しない変更（フォーマット、セミコロンなど）
- refactor: バグ修正でも機能追加でもないコード変更
- perf: パフォーマンスの改善
- test: テストの追加または更新
- build: ビルドシステムまたは外部依存関係の変更
- ci: CI/CDの変更
- chore: ビルド設定、ライブラリの更新、その他のメンテナンスタスク
- revert: 以前のコミットの取り消し。'revert: <元のコミットの見出し>' と書く

**重要**：タイプは変更の分類に重要で、セマンティックバージョニングに対応する。fix はパッチリリース、feat はマイナーリリース、「!」または「BREAKING CHANGE:」の破壊的変更はメジャーリリースに対応する。

例：

- ドキュメントの変更：

docs: インストールと使用方法のガイドを更新

- 新機能の説明を追加
- 設定セクションを更新
- 使用例を追加

- 機能の変更：

feat(auth): ユーザー認証の追加

- OAuth2プロバイダーの統合を実装
- 認証サービスモジュールを作成
- セッション管理を追加

- 修正の変更：

fix(api): ユーザーサービスのヌルポインタ例外を解消

- リファクタリング：

refactor(core): エラー処理ロジックを簡素化

- テストの変更：

test: 認証モジュールのユニットテストを追加

- 破壊的変更：

feat(api)!: 非推奨のv1エンドポイントを削除

BREAKING CHANGE: すべての /v1/* ルートが削除されました。クライアントは /v2/* への移行が必要です。

- 取り消し：

revert: feat(auth): ユーザー認証の追加

Refs: 676104e, a215868

追加のヒント：

- コミットは特に複雑な変更の場合、**単一の論理的変更**に集中させる。
- 詳細は [Conventional Commits 仕様](https://www.conventionalcommits.org/) を参照。`,

  german: `Erstellen Sie eine Commit-Nachricht im Conventional Commits-Format:
<Typ>[optionaler Bereich][optionales !]: <Beschreibung>

[optionaler Textkörper mit Aufzählungspunkten]

[optionale Footer]

Regeln:
1. Erste Zeile: Typ(Bereich): Beschreibung (Ziel 50 Zeichen, hartes Limit 80)
   - Beschreibung im **Imperativ** (z. B. "hinzufügen" statt "hinzugefügt").
   - Beginnen Sie bevorzugt mit einem **Kleinbuchstaben**; Eigennamen, Akronyme und Code-Bezeichner dürfen großgeschrieben werden.
2. Der **Bereich (Scope)** ist optional: ein kurzes Nomen für das betroffene Modul oder Gebiet (z. B. auth, api, deps). Bei übergreifenden Änderungen weglassen.
3. **Breaking Changes**: unmittelbar vor dem Doppelpunkt ein "!" ergänzen (z. B. 'feat(api)!: v1-Endpunkte entfernen') und/oder einen Footer 'BREAKING CHANGE: <was sich ändert und wie migriert wird>' hinzufügen.
4. **Footer** stehen in eigenen Zeilen nach einer Leerzeile nach dem Textkörper; z. B. Verweise auf Issues oder PRs ('Closes #123', 'Refs: <Commit-Shas>') oder die Beschreibung der Breaking Change ('BREAKING CHANGE: ...').
5. Bei kleinen Änderungen nur die erste Zeile verwenden.
6. Bei komplexen Änderungen Kernpunkte im Textkörper auflisten:
   - Jede Zeile beginnt mit "- ".
   - Auf 5 Aufzählungspunkte begrenzen.
   - **Präsens** und **aktive Form** verwenden.
   - Fokus auf **was** und **warum**, nicht **wie** (außer wenn nötig).

Regeln zur Typauswahl:

Wählen Sie den am besten passenden Typ anhand der Änderung:

- docs: Änderungen an der Dokumentation von Projekt oder Codebasis — README, Anleitungen, Manpages, CHANGELOG, Code-Kommentare — der Dateityp ist egal
- feat: Neue Funktionen oder bedeutende funktionale Änderungen
- fix: Fehlerbehebungen und Korrekturen
- style: Änderungen ohne Einfluss auf den Code (z. B. Formatierung, Semikolons)
- refactor: Codeänderungen, die weder Fehler beheben noch Funktionen hinzufügen
- perf: Leistungsverbesserungen
- test: Tests hinzufügen oder aktualisieren
- build: Build-System oder externe Abhängigkeiten
- ci: CI/CD-Änderungen
- chore: Updates der Build-Konfiguration, Bibliotheken und andere Wartungsaufgaben
- revert: Rückgängigmachen eines früheren Commits, geschrieben als 'revert: <Titel des ursprünglichen Commits>'

**Wichtig**: Der Typ ist entscheidend für die Kategorisierung der Änderungen und wird auf semantische Versionierung abgebildet. fix entspricht einem Patch-Release, feat einem Minor-Release und jede Breaking Change ("!" oder Footer "BREAKING CHANGE:") einem Major-Release.

Beispiele:

- Dokumentationsänderung:

docs: Installations- und Nutzungsanleitungen aktualisieren

- Beschreibung neuer Funktionen ergänzt
- Konfigurationsabschnitt aktualisiert
- Nutzungsbeispiele ergänzt

- Funktionsänderung:

feat(auth): Benutzerauthentifizierung hinzufügen

- OAuth2-Provider-Integration implementiert
- Auth-Service-Modul erstellt
- Sitzungsverwaltung hinzugefügt

- Fehlerbehebung:

fix(api): Nullzeiger-Ausnahme im Benutzerservice beheben

- Refactoring:

refactor(core): Fehlerbehandlungslogik vereinfachen

- Teständerung:

test: Komponententests für das Authentifizierungsmodul hinzufügen

- Breaking Change:

feat(api)!: veraltete v1-Endpunkte entfernen

BREAKING CHANGE: Alle /v1/*-Routen sind entfernt; Clients müssen zu /v2/* migrieren.

- Revert:

revert: feat(auth): Benutzerauthentifizierung hinzufügen

Refs: 676104e, a215868

Zusätzliche Hinweise:

- Halten Sie Commits auf **eine logische Änderung** fokussiert, besonders bei komplexen Änderungen.
- Weitere Details: [Conventional Commits Spezifikation](https://www.conventionalcommits.org/).`,

  french: `Générez un message de commit au format Conventional Commits :
<type>[portée optionnelle][! optionnel]: <description>

[corps optionnel avec liste à puces]

[footers optionnels]

Règles :
1. Première ligne : type(portée): description (objectif 50 caractères, limite stricte 80)
   - Description à l'**impératif** (ex. « ajoute », pas « ajouté »).
   - Préférer une initiale en **minuscule** ; les noms propres, acronymes et identifiants de code peuvent être en majuscule.
2. La **portée** est optionnelle : un nom court désignant le module ou la zone concernée (ex. auth, api, deps). À omettre pour les changements transverses.
3. **Changements ruptifs** : ajouter « ! » juste avant les deux-points (ex. 'feat(api)!: supprimer les endpoints v1') et/ou ajouter le footer 'BREAKING CHANGE: <ce qui change et comment migrer>'.
4. **Footers** sur leurs propres lignes, après une ligne vide suivant le corps ; par exemple des références aux issues ou PR ('Closes #123', 'Refs: <shas de commits>') ou la description du changement ruptif ('BREAKING CHANGE: ...').
5. Pour les petits changements, utiliser uniquement la première ligne.
6. Pour les changements complexes, lister les points clés dans le corps :
   - Chaque ligne commence par "- ".
   - Limiter à 5 puces.
   - Utiliser le **présent** et la **voix active**.
   - Se concentrer sur **quoi** et **pourquoi**, pas **comment** (sauf nécessité).

Règles de sélection du type :

Choisir le type le plus approprié selon le changement :

- docs : modifications de la documentation du projet ou de la base de code — README, guides, pages man, CHANGELOG, commentaires de code — peu importe le type de fichier
- feat : nouvelles fonctionnalités ou changements fonctionnels significatifs
- fix : corrections de bugs et d'erreurs
- style : changements n'affectant pas le code (formatage, points-virgules, etc.)
- refactor : changements de code sans correction de bug ni ajout de fonctionnalité
- perf : améliorations des performances
- test : ajout ou mise à jour de tests
- build : système de build ou dépendances externes
- ci : changements CI/CD
- chore : mises à jour de la configuration de build, des bibliothèques et autres tâches de maintenance
- revert : annulation d'un commit précédent, écrite sous la forme « revert: <titre du commit d'origine> »

**Important** : le type est crucial pour catégoriser les changements et se traduit en versionnage sémantique. fix correspond à un patch, feat à une version mineure et tout changement ruptif (« ! » ou footer « BREAKING CHANGE: ») à une version majeure.

Exemples :

- Changement de documentation :

docs: mettre à jour les guides d'installation et d'utilisation

- description des nouvelles fonctionnalités ajoutée
- section configuration mise à jour
- exemples d'utilisation ajoutés

- Changement de fonctionnalité :

feat(auth): ajouter l'authentification utilisateur

- intégration du fournisseur OAuth2 implémentée
- module de service d'authentification créé
- gestion des sessions ajoutée

- Correction :

fix(api): corriger l'exception de pointeur nul dans le service utilisateur

- Refactoring :

refactor(core): simplifier la logique de gestion des erreurs

- Changement de test :

test: ajouter des tests unitaires pour le module d'authentification

- Changement ruptif :

feat(api)!: supprimer les endpoints v1 obsolètes

BREAKING CHANGE: toutes les routes /v1/* sont supprimées ; les clients doivent migrer vers /v2/*.

- Annulation :

revert: feat(auth): ajouter l'authentification utilisateur

Refs: 676104e, a215868

Conseils supplémentaires :

- Gardez chaque commit concentré sur un **seul changement logique**, surtout pour les changements complexes.
- Plus de détails : [spécification Conventional Commits](https://www.conventionalcommits.org/).`,
};

export { conventionalTemplate };
