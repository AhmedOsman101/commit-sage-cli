const emojiKarmaTemplate = {
  english: `Generate a commit message following the Emoji-Karma format:
:emoji: type(scope): message

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation change
- style: Formatting, missing semi colons, etc
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance

Common emojis (Gitmoji + Conventional Emoji Commits):
✨ :sparkles: - New feature
🐛 :bug: - Bug fix
📝 :memo: - Documentation updates
🎨 :art: - Code style/formatting changes
♻️ :recycle: - Refactoring without functionality changes
🧪 :test_tube: - Adding or changing tests
🛠️ :hammer_and_wrench: - Build/tools/dependencies
🤖 :robot: - CI/CD configuration
⚡️ :zap: - Performance optimization
🔧 :wrench: - Maintenance/chores
🔒 :lock: - Security fixes
🚀 :rocket: - Release/deployment
🔥 :fire: - Remove code or files
⬆️ :arrow_up: - Upgrade dependencies
⬇️ :arrow_down: - Downgrade dependencies
✅ :white_check_mark: - Fix CI build

Example:
✨ feat(auth): add user authentication system
🐛 fix(api): resolve token expiration issue`,

  russian: `Создайте сообщение коммита в формате Emoji-Karma:
:emoji: тип(область): сообщение

Типы:
- feat: Новая функциональность
- fix: Исправление ошибки
- docs: Изменения в документации
- style: Форматирование, пропущенные точки с запятой и т.д.
- refactor: Рефакторинг кода
- test: Добавление тестов
- chore: Обслуживание

Часто используемые эмодзи (Gitmoji + Conventional Emoji Commits):
✨ :sparkles: - Новая функциональность
🐛 :bug: - Исправление ошибок
📝 :memo: - Обновление документации
🎨 :art: - Изменения оформления/стиля кода
♻️ :recycle: - Рефакторинг без изменений функциональности
🧪 :test_tube: - Добавление или изменение тестов
🛠️ :hammer_and_wrench: - Сборка/инструменты/зависимости
🤖 :robot: - Настройка CI/CD процессов
⚡️ :zap: - Оптимизация производительности
🔧 :wrench: - Вспомогательные изменения
🔒 :lock: - Исправление уязвимостей безопасности
🚀 :rocket: - Релиз/деплой
🔥 :fire: - Удаление кода или файлов
⬆️ :arrow_up: - Обновление зависимостей
⬇️ :arrow_down: - Понижение версий зависимостей
✅ :white_check_mark: - Исправление сборки CI

Пример:
✨ feat(auth): добавить систему аутентификации пользователей
🐛 fix(api): исправить проблему истечения срока токена`,

  chinese: `生成符合 Emoji-Karma 格式的提交信息：
:emoji: 类型(范围): 信息

类型：
- feat: 新功能
- fix: Bug 修复
- docs: 文档更改
- style: 格式化、缺少分号等
- refactor: 代码重构
- test: 添加测试
- chore: 维护

常用表情符号 (Gitmoji + Conventional Emoji Commits)：
✨ :sparkles: - 新功能
🐛 :bug: - Bug 修复
📝 :memo: - 文档更新
🎨 :art: - 代码样式/格式变更
♻️ :recycle: - 重构（不改变功能）
🧪 :test_tube: - 添加或修改测试
🛠️ :hammer_and_wrench: - 构建/工具/依赖
🤖 :robot: - CI/CD 配置
⚡️ :zap: - 性能优化
🔧 :wrench: - 维护/杂项
🔒 :lock: - 安全修复
🚀 :rocket: - 发布/部署
🔥 :fire: - 删除代码或文件
⬆️ :arrow_up: - 升级依赖
⬇️ :arrow_down: - 降级依赖
✅ :white_check_mark: - 修复CI构建

示例：
✨ feat(auth): 添加用户认证系统
🐛 fix(api): 解决令牌过期问题`,

  japanese: `絵文字とKarma形式を組み合わせたコミットメッセージを生成してください：
:emoji: タイプ(スコープ): メッセージ

タイプ：
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント変更
- style: フォーマット、セミコロンの欠落など
- refactor: コードリファクタリング
- test: テストの追加
- chore: メンテナンス

よく使用する絵文字 (Gitmoji + Conventional Emoji Commits)：
✨ :sparkles: - 新機能
🐛 :bug: - バグ修正
📝 :memo: - ドキュメント更新
🎨 :art: - コードスタイル/フォーマット変更
♻️ :recycle: - 機能変更なしのリファクタリング
🧪 :test_tube: - テストの追加・変更
🛠️ :hammer_and_wrench: - ビルド/ツール/依存関係
🤖 :robot: - CI/CD設定
⚡️ :zap: - パフォーマンス最適化
🔧 :wrench: - メンテナンス/雑務
🔒 :lock: - セキュリティ修正
🚀 :rocket: - リリース/デプロイ
🔥 :fire: - コードやファイルの削除
⬆️ :arrow_up: - 依存関係アップグレード
⬇️ :arrow_down: - 依存関係ダウングレード
✅ :white_check_mark: - CIビルド修正

例：
✨ feat(auth): ユーザー認証システムを追加
🐛 fix(api): トークン期限切れの問題を解決`,

  german: `Erstellen Sie eine Commit-Nachricht im Emoji-Karma-Format:
:emoji: Typ(Bereich): Nachricht

Typen:
- feat: Neue Funktion
- fix: Fehlerbehebung
- docs: Dokumentationsänderung
- style: Formatierung, fehlende Semikolons usw.
- refactor: Code-Refactoring
- test: Tests hinzufügen
- chore: Wartung

Häufig verwendete Emojis (Gitmoji + Conventional Emoji Commits):
✨ :sparkles: - Neue Funktion
🐛 :bug: - Fehlerbehebung
📝 :memo: - Dokumentationsaktualisierung
🎨 :art: - Codestil-/Formatierungsänderungen
♻️ :recycle: - Refactoring ohne Funktionsänderung
🧪 :test_tube: - Tests hinzufügen oder ändern
🛠️ :hammer_and_wrench: - Build/Werkzeuge/Abhängigkeiten
🤖 :robot: - CI/CD-Konfiguration
⚡️ :zap: - Leistungsoptimierung
🔧 :wrench: - Wartung/Diverses
🔒 :lock: - Sicherheitskorrekturen
🚀 :rocket: - Release/Deployment
🔥 :fire: - Code oder Dateien entfernen
⬆️ :arrow_up: - Abhängigkeiten aktualisieren
⬇️ :arrow_down: - Abhängigkeiten herunterstufen
✅ :white_check_mark: - CI-Build reparieren

Beispiele:
✨ feat(auth): Benutzerauthentifizierungssystem hinzufügen
🐛 fix(api): Token-Ablaufproblem beheben`,

  french: `Générez un message de commit au format Emoji-Karma :
:emoji: type(portée): message

Types :
- feat: Nouvelle fonctionnalité
- fix: Correction de bug
- docs: Modification de documentation
- style: Formatage, points-virgules manquants, etc.
- refactor: Refactorisation de code
- test: Ajout de tests
- chore: Maintenance

Emojis courants (Gitmoji + Conventional Emoji Commits) :
✨ :sparkles: - Nouvelle fonctionnalité
🐛 :bug: - Correction de bug
📝 :memo: - Mise à jour de documentation
🎨 :art: - Changements de style/formatage de code
♻️ :recycle: - Refactorisation sans changement de fonctionnalité
🧪 :test_tube: - Ajout ou modification de tests
🛠️ :hammer_and_wrench: - Build/outils/dépendances
🤖 :robot: - Configuration CI/CD
⚡️ :zap: - Optimisation des performances
🔧 :wrench: - Maintenance/tâches diverses
🔒 :lock: - Corrections de sécurité
🚀 :rocket: - Release/déploiement
🔥 :fire: - Suppression de code ou fichiers
⬆️ :arrow_up: - Mise à jour des dépendances
⬇️ :arrow_down: - Rétrogradation des dépendances
✅ :white_check_mark: - Correction du build CI

Exemples :
✨ feat(auth): ajouter le système d'authentification utilisateur
🐛 fix(api): résoudre le problème d'expiration du jeton`,
};

export { emojiKarmaTemplate };
