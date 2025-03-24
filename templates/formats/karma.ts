export const karmaTemplate = {
  english: `Generate a commit message following the Karma format:
<type>(<scope>): <message>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation change
- style: Formatting, missing semi colons, etc
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance

Example:
chore(ci): update deployment script to Node 16`,

  russian: `Создайте сообщение коммита в формате Karma:
<тип>(<область>): <сообщение>

Типы:
- feat: Новая функциональность
- fix: Исправление ошибки
- docs: Изменения в документации
- style: Форматирование, пропущенные точки с запятой и т.д.
- refactor: Рефакторинг кода
- test: Добавление тестов
- chore: Обслуживание

Пример:
chore(ci): обновить скрипт деплоя до Node 16`,

  chinese: `生成符合 Karma 格式的提交信息：
<类型>(<范围>): <信息>

类型：
- feat: 新功能
- fix: Bug 修复
- docs: 文档更改
- style: 格式化、缺少分号等
- refactor: 代码重构
- test: 添加测试
- chore: 维护

示例：
chore(ci): 更新部署脚本至 Node 16`,

  japanese: `Karma形式のコミットメッセージを生成してください：
<タイプ>(<スコープ>): <メッセージ>

タイプ：
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント変更
- style: フォーマット、セミコロンの欠落など
- refactor: コードリファクタリング
- test: テストの追加
- chore: メンテナンス

例：
chore(ci): デプロイスクリプトをNode 16に更新`,
};
