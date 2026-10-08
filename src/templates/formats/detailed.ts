const detailedTemplate = {
  english: `Generate a detailed commit message with three sections — Summary, Details, Effects:

Summary: <one-line imperative summary, ≤ 72 chars>

Details:
- <changed file/module 1>: <what changed>
- <changed file/module 2>: <what changed>
- (max 6 bullets, ≤ 80 chars each)

Effects:
- <impact on behaviour, performance, or compatibility>
- <impact 2>
- (max 4 bullets, ≤ 80 chars each)

Rules:
- Use the section labels "Summary:", "Details:", "Effects:" verbatim.
- Skip the Details section entirely if there is only one trivial change.
- Skip the Effects section if the change has no observable runtime impact (e.g. comment-only edits).
- No closing remarks, no "Hope this helps", no explanation outside the three sections.

Example:
Summary: Refactor user authentication to token-based flow

Details:
- src/auth.js: replace session storage with JWT issuance and verification
- src/userModel.js: remove deprecated password-hash helpers
- tests/auth.test.js: cover token expiry + invalid-signature paths

Effects:
- Tokens expire after 1h, reducing replay-attack window
- Session storage no longer required server-side
- All existing sessions invalidated on deploy — users re-login`,

  russian: `Сгенерируй подробное сообщение коммита из трёх секций — Summary, Details, Effects:

Summary: <одна строка в повелительном наклонении, ≤ 72 символов>

Details:
- <файл/модуль 1>: <что изменилось>
- <файл/модуль 2>: <что изменилось>
- (макс 6 пунктов, ≤ 80 символов)

Effects:
- <влияние на поведение, производительность, совместимость>
- <влияние 2>
- (макс 4 пункта, ≤ 80 символов)

Правила:
- Используй заголовки "Summary:", "Details:", "Effects:" дословно (на английском).
- Пропусти секцию Details, если изменение тривиальное и затрагивает один файл.
- Пропусти секцию Effects, если изменение не влияет на runtime (правки комментариев и т.п.).
- Никаких финальных фраз, объяснений вне трёх секций.

Пример:
Summary: Переход auth на токенный flow вместо сессий

Details:
- src/auth.js: замена session storage на JWT issuance/verification
- src/userModel.js: удалены устаревшие password-hash хелперы
- tests/auth.test.js: покрытие истёкших токенов и невалидных подписей

Effects:
- Токены истекают через 1ч — уменьшено окно replay-атак
- Серверное хранилище сессий больше не требуется
- Все текущие сессии инвалидируются при деплое — нужен re-login`,

  chinese: `生成包含三个部分的详细提交信息 — Summary、Details、Effects：

Summary: <祈使语单行摘要，≤ 72 字符>

Details:
- <文件/模块 1>: <更改内容>
- <文件/模块 2>: <更改内容>
- (最多 6 项，每项 ≤ 80 字符)

Effects:
- <对行为、性能或兼容性的影响>
- <影响 2>
- (最多 4 项，每项 ≤ 80 字符)

规则：
- 章节标题 "Summary:"、"Details:"、"Effects:" 必须保留为英文。
- 如果只有一个简单更改，省略 Details 部分。
- 如果更改没有可观察的运行时影响，省略 Effects 部分。
- 不要写结束语或在三个部分之外的解释。`,

  japanese: `Summary・Details・Effects の3セクション構成で詳細なコミットメッセージを生成してください：

Summary: <命令形での1行要約、72文字以内>

Details:
- <変更ファイル/モジュール 1>: <変更内容>
- <変更ファイル/モジュール 2>: <変更内容>
- (最大6項目、各80文字以内)

Effects:
- <動作・パフォーマンス・互換性への影響>
- <影響 2>
- (最大4項目、各80文字以内)

ルール：
- セクションラベル "Summary:"、"Details:"、"Effects:" は英語のまま使用。
- 単純な単一変更の場合は Details セクションを省略。
- 実行時に影響がない場合は Effects セクションを省略。
- 締めの言葉や3セクション外の説明は不要。`,

  german: `Erstelle eine ausführliche Commit-Nachricht mit drei Abschnitten — Summary, Details, Effects:

Summary: <einzeilige Imperativ-Zusammenfassung, ≤ 72 Zeichen>

Details:
- <geänderte Datei/Modul 1>: <was wurde geändert>
- <geänderte Datei/Modul 2>: <was wurde geändert>
- (max. 6 Punkte, je ≤ 80 Zeichen)

Effects:
- <Auswirkung auf Verhalten/Performance/Kompatibilität>
- <Auswirkung 2>
- (max. 4 Punkte, je ≤ 80 Zeichen)

Regeln:
- Abschnittsbezeichnungen "Summary:", "Details:", "Effects:" wörtlich auf Englisch.
- Bei einer einzigen trivialen Änderung den Details-Abschnitt weglassen.
- Bei Änderungen ohne Laufzeitwirkung den Effects-Abschnitt weglassen.
- Keine Schlussbemerkungen, keine Erklärung außerhalb der drei Abschnitte.`,

  french: `Génère un message de commit détaillé en trois sections — Summary, Details, Effects :

Summary: <résumé impératif d'une ligne, ≤ 72 caractères>

Details:
- <fichier/module modifié 1> : <ce qui a changé>
- <fichier/module modifié 2> : <ce qui a changé>
- (max 6 puces, chacune ≤ 80 caractères)

Effects:
- <impact sur le comportement/la performance/la compatibilité>
- <impact 2>
- (max 4 puces, chacune ≤ 80 caractères)

Règles :
- Les libellés "Summary:", "Details:", "Effects:" doivent rester en anglais.
- Omettre la section Details si la modification est triviale et touche un seul fichier.
- Omettre la section Effects si la modification n'a pas d'impact runtime.
- Pas de phrase de conclusion ni d'explication hors des trois sections.`,
};

export { detailedTemplate };
