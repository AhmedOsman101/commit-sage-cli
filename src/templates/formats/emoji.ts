const emojiTemplate = {
  english: `Generate a commit message following the Emoji format:
:emoji: commit message

Common emojis:
✨ :sparkles: - New feature
🐛 :bug: - Bug fix
📚 :books: - Documentation
💄 :lipstick: - UI/style changes
♻ :recycle: - Refactoring
✅ :white_check_mark: - Tests
🔧 :wrench: - Configuration
⚡ :zap: - Performance
🔒 :lock: - Security

Example:
✨ add real-time collaboration feature
🐛 fix authentication token expiration`,

  russian: `Создайте сообщение коммита в формате Emoji:
:emoji: сообщение коммита

Часто используемые эмодзи:
✨ :sparkles: - Новая функциональность
🐛 :bug: - Исправление ошибки
📚 :books: - Документация
💄 :lipstick: - Изменения UI/стиля
♻ :recycle: - Рефакторинг
✅ :white_check_mark: - Тесты
🔧 :wrench: - Конфигурация
⚡ :zap: - Производительность
🔒 :lock: - Безопасность

Пример:
✨ добавить функцию совместной работы в реальном времени
🐛 исправить срок действия токена аутентификации`,

  chinese: `生成符合 Emoji 格式的提交信息：
:emoji: 提交信息

常用表情符号：
✨ :sparkles: - 新功能
🐛 :bug: - Bug 修复
📚 :books: - 文档
💄 :lipstick: - UI/样式变更
♻ :recycle: - 重构
✅ :white_check_mark: - 测试
🔧 :wrench: - 配置
⚡ :zap: - 性能
🔒 :lock: - 安全

示例：
✨ 添加实时协作功能
🐛 修复认证令牌过期问题`,

  japanese: `絵文字形式のコミットメッセージを生成してください：
:emoji: コミットメッセージ

よく使用する絵文字：
✨ :sparkles: - 新機能
🐛 :bug: - バグ修正
📚 :books: - ドキュメント
💄 :lipstick: - UI/スタイル変更
♻ :recycle: - リファクタリング
✅ :white_check_mark: - テスト
🔧 :wrench: - 設定
⚡ :zap: - パフォーマンス
🔒 :lock: - セキュリティ

例：
✨ リアルタイムコラボレーション機能を追加
🐛 認証トークンの有効期限の問題を修正`,

  german: `Erstellen Sie eine Commit-Nachricht im Emoji-Format:
:emoji: Commit-Nachricht

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
✨ Echtzeit-Zusammenarbeitsfunktion hinzufügen
🐛 Ablauf des Authentifizierungstokens beheben`,

  french: `Générez un message de commit au format Emoji :
:emoji: message de commit

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
✨ ajouter la fonctionnalité de collaboration en temps réel
🐛 corriger l'expiration du jeton d'authentification`,
};

export { emojiTemplate };
