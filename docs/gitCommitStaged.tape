Output gitCommitStaged.gif

Set Shell zsh
Set Theme { "name":"GitHubDark","black":"#14141E","red":"#F7768E","green":"#35BF88","yellow":"#DBAC66","blue":"#4CA6E8","magenta":"#BB9AF7","cyan":"#7DCFFF","white":"#E6E6E8","brightBlack":"#50545B","brightRed":"#F7768E","brightGreen":"#73DACA","brightYellow":"#EFCA84","brightBlue":"#7AA2F7","brightMagenta":"#BB9AF7","brightCyan":"#7DCFFF","brightWhite":"#B5BCC9","background":"#0D1117","foreground":"#ABB2BF","selection":"#3B4261","cursor":"#ABB2BF" }
Set Width 1200
Set FontFamily "JetBrainsMonoNF Nerd Font"
Set TypingSpeed 100ms

Type "git add index.js"
Enter
Sleep 1s

Type "git status --short"
Enter
Sleep 1s

Type "git-commit --ai"
Enter
Wait+Screen /←→\s+toggle/
Sleep 2s
Enter
Sleep 2s
