export const conventionalTemplate = {
  english: `Generate a commit message following the Conventional Commits format:
<type>[optional scope]: <description>

[optional body with bullet points]

Rules:
1. First line: type(scope): description (max 50 chars)
2. For small changes use only first line
3. For complex changes list key points in body:
   - Each line starts with "- "
   - Each line max 50 chars
   - Limit to 5 bullet points
   - Summarize changes concisely

Type selection rules:
- docs: ANY changes to documentation files (*.md, docs/*, etc.)
- feat: New features or significant functional changes
- fix: Bug fixes and error corrections
- style: Changes not affecting the code, e.g. formatting, semicolons, etc.
- refactor: Code changes, neither fix a bug nor add a feature.
- perf: Performance improvements
- test: Adding or updating tests
- build: Changes affecting the build system or external dependencies.
- ci: CI/CD changes
- chore: Updates to build configuration, libraries, and other maintenance tasks.
- revert: Reverting a previous commit.

Examples:
Documentation change:
docs: update installation and usage guides

- Added new features description
- Updated configuration section
- Added usage examples

Feature change:
feat(auth): add user authentication

- Implemented OAuth2 provider integration
- Created auth service module
- Added session management`,

  russian: `Создайте сообщение коммита в формате Conventional Commits:
<тип>[опциональная область]: <описание>

[опциональное тело со списком изменений]

Правила:
1. Первая строка: тип(область): описание (макс 50 символов)
2. Для небольших изменений только первая строка
3. Для сложных изменений список ключевых моментов:
   - Каждая строка начинается с "- "
   - Каждая строка макс 50 символов
   - Ограничить 5 пунктами
   - Кратко резюмировать изменения

Правила выбора типа:
- docs: ЛЮБЫЕ изменения в документации (*.md, docs/*)
- feat: Новая функциональность или значимые изменения
- fix: Исправление ошибок
- style: Форматирование, точки с запятой и т.д.
- refactor: Изменения кода без новой функциональности
- perf: Улучшения производительности
- test: Добавление или обновление тестов
- build: Система сборки или зависимости
- ci: Изменения в CI/CD
- chore: Другие задачи обслуживания

Примеры:
Изменение документации:
docs: обновить руководство по установке и использованию

- Добавлено описание новых функций
- Обновлен раздел конфигурации
- Добавлены примеры использования

Новая функциональность:
feat(auth): добавить аутентификацию пользователей

- Внедрена интеграция с OAuth2
- Создан модуль сервиса авторизации
- Добавлено управление сессиями`,

  chinese: `生成符合约定式提交（Conventional Commits）格式的提交信息：
<类型>[可选范围]: <描述>

[可选正文，包含要点]

规则：
1. 第一行：类型(范围): 描述（最多50个字符）
2. 对于小改动，仅使用第一行
3. 对于复杂改动，在正文中列出关键点：
   - 每行以"- "开头
   - 每行最多50个字符
   - 限制为5个要点
   - 简明扼要地总结更改

类型选择规则：
- docs: 对文档文件的任何修改（*.md, docs/*）
- feat: 新功能或重要的功能变更
- fix: Bug修复和错误更正
- style: 格式修改，如分号等（无代码变动）
- refactor: 不修复bug或添加功能的代码修改
- perf: 性能提升
- test: 添加或更新测试
- build: 构建系统或依赖项
- ci: CI/CD的变动
- chore: 其他维护任务

示例：
文档修改：
docs: 更新安装和使用指南

- 添加新功能描述
- 更新配置部分
- 增加使用示例

功能更改：
feat(auth): 添加用户认证

- 实现OAuth2提供者集成
- 创建身份验证服务模块
- 添加会话管理`,

  japanese: `コミットメッセージを Conventional Commits 形式で生成してください：
<タイプ>[オプションのスコープ]: <説明>

[オプションの本文（箇条書き）]

ルール：
1. 1行目: タイプ(スコープ): 説明 (最大50文字)
2. 小さな変更は1行目のみ
3. 複雑な変更は本文に要点を列挙：
   - 各行は "- " で始まる
   - 各行最大50文字
   - 5つの箇条書きに制限
   - 変更を簡潔に要約

タイプの選択ルール：
- docs: ドキュメントの変更 (*.md, docs/*)
- feat: 新機能または重要な機能変更
- fix: バグ修正とエラー訂正
- style: フォーマット、セミコロンなど（コード変更なし）
- refactor: バグ修正や機能追加を伴わないコード変更
- perf: パフォーマンスの改善
- test: テストの追加または更新
- build: ビルドシステムまたは依存関係の変更
- ci: CI/CDの変更
- chore: その他のメンテナンスタスク

例：
ドキュメントの変更：
docs: インストールと使用方法のガイドを更新

- 新機能の説明を追加
- 設定セクションを更新
- 使用例を追加

機能の変更：
feat(auth): ユーザー認証を追加

- OAuth2プロバイダーの統合を実装
- 認証サービスモジュールを作成
- セッション管理を追加`,
};
