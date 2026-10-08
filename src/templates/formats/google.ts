const googleTemplate = {
  english: `Generate a commit message following the Google format:
<Type>: <Description>

<Body>

<Footer>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semicolons, etc.)
- refactor: Code refactoring
- test: Adding or modifying tests
- chore: Maintenance tasks
- perf: Performance improvements
- ci: CI/CD changes
- build: Build system changes
- revert: Revert previous commit

Example:
feat: Add user authentication system

Implemented OAuth2 integration with Google and GitHub providers.
Added JWT token management and refresh mechanism.
Included comprehensive test coverage for auth flows.

Closes #123
Reviewed-by: @teammate`,

  russian: `Создайте сообщение коммита в формате Google:
<Тип>: <Описание>

<Тело>

<Подвал>

Типы:
- feat: Новая функциональность
- fix: Исправление ошибок
- docs: Изменения в документации
- style: Изменения стиля кода (форматирование, пропущенные точки с запятой и т.д.)
- refactor: Рефакторинг кода
- test: Добавление или изменение тестов
- chore: Вспомогательные задачи
- perf: Улучшения производительности
- ci: Изменения CI/CD
- build: Изменения системы сборки
- revert: Откат предыдущего коммита

Пример:
feat: Добавить систему аутентификации пользователей

Реализована интеграция OAuth2 с провайдерами Google и GitHub.
Добавлено управление JWT токенами и механизм обновления.
Включено полное покрытие тестами для потоков аутентификации.

Закрывает #123
Проверено: @teammate`,

  chinese: `生成符合 Google 格式的提交信息：
<类型>: <描述>

<正文>

<页脚>

类型：
- feat: 新功能
- fix: Bug 修复
- docs: 文档更改
- style: 代码样式更改（格式化、缺少分号等）
- refactor: 代码重构
- test: 添加或修改测试
- chore: 维护任务
- perf: 性能改进
- ci: CI/CD 更改
- build: 构建系统更改
- revert: 撤销之前的提交

示例：
feat: 添加用户认证系统

实现了与 Google 和 GitHub 提供商的 OAuth2 集成。
添加了 JWT 令牌管理和刷新机制。
包含了认证流程的全面测试覆盖。

关闭 #123
审查者：@teammate`,

  japanese: `Google形式のコミットメッセージを生成してください：
<タイプ>: <説明>

<本文>

<フッター>

タイプ：
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント変更
- style: コードスタイル変更（フォーマット、セミコロンの欠落など）
- refactor: コードリファクタリング
- test: テストの追加・修正
- chore: メンテナンスタスク
- perf: パフォーマンス改善
- ci: CI/CD変更
- build: ビルドシステム変更
- revert: 前のコミットを元に戻す

例：
feat: ユーザー認証システムを追加

GoogleとGitHubプロバイダーとのOAuth2統合を実装。
JWTトークン管理とリフレッシュメカニズムを追加。
認証フローの包括的なテストカバレッジを含む。

#123を閉じる
レビュー者：@teammate`,

  german: `Erstellen Sie eine Commit-Nachricht im Google-Format:
<Typ>: <Beschreibung>

<Textkörper>

<Fußzeile>

Typen:
- feat: Neue Funktion
- fix: Fehlerbehebung
- docs: Dokumentationsänderungen
- style: Codestil-Änderungen (Formatierung, fehlende Semikolons usw.)
- refactor: Code-Refactoring
- test: Tests hinzufügen oder ändern
- chore: Wartungsaufgaben
- perf: Leistungsverbesserungen
- ci: CI/CD-Änderungen
- build: Build-System-Änderungen
- revert: Vorherigen Commit rückgängig machen

Beispiel:
feat: Benutzerauthentifizierungssystem hinzufügen

OAuth2-Integration mit Google- und GitHub-Providern implementiert.
JWT-Token-Verwaltung und Aktualisierungsmechanismus hinzugefügt.
Umfassende Testabdeckung für Auth-Flows eingebunden.

Closes #123
Reviewed-by: @teammate`,

  french: `Générez un message de commit au format Google :
<Type>: <Description>

<Corps>

<Pied de page>

Types :
- feat: Nouvelle fonctionnalité
- fix: Correction de bug
- docs: Modifications de documentation
- style: Changements de style de code (formatage, points-virgules manquants, etc.)
- refactor: Refactorisation de code
- test: Ajout ou modification de tests
- chore: Tâches de maintenance
- perf: Améliorations des performances
- ci: Changements CI/CD
- build: Changements du système de build
- revert: Annuler un commit précédent

Exemple :
feat: Ajouter le système d'authentification utilisateur

Intégration OAuth2 avec les fournisseurs Google et GitHub implémentée.
Gestion des jetons JWT et mécanisme de rafraîchissement ajoutés.
Couverture de tests complète pour les flux d'authentification incluse.

Closes #123
Reviewed-by: @teammate`,
};

export { googleTemplate };
