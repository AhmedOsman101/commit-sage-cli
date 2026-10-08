const angularTemplate = {
  english: `Generate a commit message following the Angular format:
<type>(<scope>): <short summary>

[optional body with bullet points]

Rules:
1. First line: type(scope): summary (max 50 chars)
2. For small changes use only first line
3. For complex changes list key points in body:
   - Each line starts with "- "
   - Each line max 50 chars

Types:
build: Build/dependencies
ci: CI configuration
docs: Documentation
feat: New feature
fix: Bug fix
perf: Performance
refactor: Code change
test: Testing

Examples:
Small change:
feat(api): add data validation method

Complex change:
refactor(core): optimize database queries

- Implement query caching
- Add connection pooling
- Update error handling`,

  russian: `Создайте сообщение коммита в формате Angular:
<тип>(<область>): <краткое описание>

[опциональное тело со списком изменений]

Правила:
1. Первая строка: тип(область): описание (макс 50 символов)
2. Для небольших изменений только первая строка
3. Для сложных изменений список ключевых моментов:
   - Каждая строка начинается с "- "
   - Каждая строка макс 50 символов

Типы:
build: Сборка/зависимости
ci: Конфигурация CI
docs: Документация
feat: Новая функция
fix: Исправление
perf: Производительность
refactor: Изменение кода
test: Тестирование

Примеры:
Небольшое изменение:
feat(api): добавить метод валидации данных

Сложное изменение:
refactor(core): оптимизировать запросы к БД

- Внедрить кеширование запросов
- Добавить пул соединений
- Обновить обработку ошибок`,

  chinese: `生成符合 Angular 格式的提交信息：
<类型>(<范围>): <简短概述>

[可选正文，包含要点]

规则：

第一行：类型(范围): 概述（最多50个字符）
对于小改动，仅使用第一行
对于复杂改动，在正文中列出关键点：
每行以"- "开头
每行最多50个字符
类型：
build: 构建/依赖项
ci: CI 配置
docs: 文档
feat: 新功能
fix: Bug 修复
perf: 性能
refactor: 代码重构
test: 测试

示例：
小改动：
feat(api): 添加数据验证方法

复杂改动：
refactor(core): 优化数据库查询

实现查询缓存
添加连接池
更新错误处理`,

  japanese: `Angular形式のコミットメッセージを生成してください：
<タイプ>(<スコープ>): <短い要約>

[オプションの本文（箇条書き）]

ルール：
1. 1行目: タイプ(スコープ): 要約 (最大50文字)
2. 小さな変更は1行目のみ
3. 複雑な変更は本文に要点を列挙：
   - 各行は "- " で始める
   - 各行最大50文字

タイプ：
build: ビルド/依存関係
ci: CI設定
docs: ドキュメント
feat: 新機能
fix: バグ修正
perf: パフォーマンス
refactor: コード変更
test: テスト

例：
小さな変更：
feat(api): データ検証メソッドを追加

複雑な変更：
refactor(core): データベースクエリを最適化

- クエリキャッシュを実装
- コネクションプーリングを追加
- エラー処理を更新`,

  german: `Erstellen Sie eine Commit-Nachricht im Angular-Format:
<Typ>(<Bereich>): <Kurzbeschreibung>

[optionaler Textkörper mit Aufzählungspunkten]

Regeln:
1. Erste Zeile: Typ(Bereich): Zusammenfassung (max. 50 Zeichen)
2. Bei kleinen Änderungen nur die erste Zeile verwenden
3. Bei komplexen Änderungen Kernpunkte im Textkörper auflisten:
   - Jede Zeile beginnt mit "- "
   - Jede Zeile max. 50 Zeichen

Typen:
build: Build/Abhängigkeiten
ci: CI-Konfiguration
docs: Dokumentation
feat: Neue Funktion
fix: Fehlerbehebung
perf: Leistung
refactor: Codeänderung
test: Tests

Beispiele:
Kleine Änderung:
feat(api): Datenvalidierungsmethode hinzufügen

Komplexe Änderung:
refactor(core): Datenbankabfragen optimieren

- Query-Caching implementieren
- Connection Pooling hinzufügen
- Fehlerbehandlung aktualisieren`,

  french: `Générez un message de commit au format Angular :
<type>(<portée>): <résumé court>

[corps optionnel avec liste à puces]

Règles :
1. Première ligne : type(portée): résumé (max 50 caractères)
2. Pour les petits changements, utiliser uniquement la première ligne
3. Pour les changements complexes, lister les points clés dans le corps :
   - Chaque ligne commence par "- "
   - Chaque ligne max 50 caractères

Types :
build: Build/dépendances
ci: Configuration CI
docs: Documentation
feat: Nouvelle fonctionnalité
fix: Correction de bug
perf: Performance
refactor: Modification de code
test: Tests

Exemples :
Petit changement :
feat(api): ajouter méthode de validation des données

Changement complexe :
refactor(core): optimiser les requêtes base de données

- Implémenter le cache de requêtes
- Ajouter le pool de connexions
- Mettre à jour la gestion des erreurs`,
};

export { angularTemplate };
