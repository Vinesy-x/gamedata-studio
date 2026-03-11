VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsGitHandler"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'====================================================================================================
' 类模块: clsGitHandler
' 作  用: 封装所有与 Git 版本控制系统相关的命令行操作。
'====================================================================================================
Option Explicit

' --- 私有成员变量 ---
Private m_RepoPath As String             ' 本地 Git 仓库的根目录路径
Private m_WshShell As Object            ' WScript.Shell 对象，用于执行命令

'====================================================================================================
' 初始化和清理
'====================================================================================================

Private Sub Class_Initialize()
    ' 创建 WScript.Shell 对象
    On Error Resume Next ' 如果创建失败，后续方法会处理
    Set m_WshShell = CreateObject("WScript.Shell")
    On Error GoTo 0 ' 恢复错误处理
End Sub

Private Sub Class_Terminate()
    ' 释放对象引用
    Set m_WshShell = Nothing
End Sub

'---
' 初始化 Git 操作处理器
'---
Public Sub Initialize(repoPath As String)
    ' 验证并存储仓库路径
    If Len(repoPath) > 0 And Dir(repoPath, vbDirectory) <> "" Then ' 基本检查路径是否存在
        m_RepoPath = repoPath
        ' 可以在这里添加更严格的检查，例如查找 .git 文件夹
    Else
        modErrorHandler.LogError 4001, "无效的 Git 仓库路径: '" & repoPath & "'", "clsGitHandler.Initialize"
        m_RepoPath = "" ' 设置为空路径，阻止后续操作
    End If

End Sub

'====================================================================================================
' 公共方法
'====================================================================================================

'---
' 拉取指定仓库的最新文件 (git reset --hard && git clean -dfq && git pull)
' 返回值: Boolean - 表示命令执行过程中是否发生 VBA 错误
'---
Public Function PullLatest() As Boolean
    Dim command As String
    Dim success As Boolean

    If Not CanExecuteGit() Then
        PullLatest = False
        Exit Function
    End If

    ' 构建命令字符串
    command = BuildCommand("git reset --hard", "git clean -dfq", "git pull")

    ' 执行命令
    success = RunCommand(command, "拉取最新文件 (Pull Latest)")

    PullLatest = success
End Function

'---
' 将指定文件添加到暂存区、提交并推送到远程仓库
' filesToAdd: 包含要添加的文件【完整路径】的字符串数组
' commitMessage: 本次提交的信息
' 返回值: Boolean - 表示命令执行过程中是否发生 VBA 错误
'---
Public Function AddCommitPush(filesToAdd() As String, commitMessage As String) As Boolean
    Dim command As String
    Dim success As Boolean
    Dim addCommands As String
    Dim i As Integer

    If Not CanExecuteGit() Then
        AddCommitPush = False
        Exit Function
    End If

    If UBound(filesToAdd) < LBound(filesToAdd) Then
        modErrorHandler.LogError 4101, "没有提供需要添加到 Git 的文件列表", "clsGitHandler.AddCommitPush"
        AddCommitPush = False
        Exit Function
    End If

    ' --- 构建 git add 命令部分 ---
    addCommands = ""
    For i = LBound(filesToAdd) To UBound(filesToAdd)
        If Len(filesToAdd(i)) > 0 Then
            ' 需要正确处理路径中的反斜杠，并可能需要引号包围路径以处理空格
            ' WScript.Shell 通常不需要像 VBA Shell 那样额外转义，但路径加引号更安全
            addCommands = addCommands & "&& git add """ & filesToAdd(i) & """ "
        End If
    Next i

    ' 移除开头的 "&& "
    If Len(addCommands) > 3 Then addCommands = Mid$(addCommands, 4)

    If Len(addCommands) = 0 Then
         modErrorHandler.LogError 4102, "处理后的 Git 添加文件列表为空", "clsGitHandler.AddCommitPush"
         AddCommitPush = False
         Exit Function
    End If

    ' --- 构建完整命令 ---
    ' 需要将提交信息中的双引号转义 (替换为 "") 以便在命令行中使用
    Dim escapedCommitMessage As String
    escapedCommitMessage = Replace(commitMessage, """", """""") ' Escape double quotes for CMD

    command = BuildCommand(addCommands, "git commit -m """ & escapedCommitMessage & """", "git push")

    ' --- 执行命令 ---
    success = RunCommand(command, "添加、提交并推送 (Add, Commit, Push)")

    AddCommitPush = success
End Function


'====================================================================================================
' 私有辅助方法
'====================================================================================================

'---
' 检查是否可以执行 Git 操作 (路径有效且 WshShell 对象存在)
'---
Private Function CanExecuteGit() As Boolean
    CanExecuteGit = False ' 默认不可执行
    If m_WshShell Is Nothing Then
        modErrorHandler.LogError 4901, "WScript.Shell 对象未能创建，无法执行 Git 命令", "clsGitHandler.CanExecuteGit"
        Exit Function
    End If
    If Len(m_RepoPath) = 0 Then
        modErrorHandler.LogError 4902, "Git 仓库路径未设置或无效，无法执行 Git 命令", "clsGitHandler.CanExecuteGit"
        Exit Function
    End If
    CanExecuteGit = True
End Function


'---
' 切换驱动器、进入仓库目录并执行一系列 Git 命令
' commands: 要依次执行的 Git 命令 (不包含切换目录)
' 返回值: 完整的 cmd.exe 命令字符串
'---
Private Function BuildCommand(ParamArray commands() As Variant) As String
    Dim driveLetter As String
    Dim fullCommand As String
    Dim cmd As Variant
    Dim joinedCommands As String

    ' 提取驱动器盘符
    driveLetter = Left$(m_RepoPath, InStr(m_RepoPath, ":")) ' 例如 "C:" 或 "D:"

    ' 拼接 Git 命令，用 && 连接
    joinedCommands = ""
    For Each cmd In commands
        If Len(CStr(cmd)) > 0 Then
            joinedCommands = joinedCommands & " && " & CStr(cmd)
        End If
    Next cmd
    If Len(joinedCommands) > 4 Then joinedCommands = Mid$(joinedCommands, 5) ' 移除开头的 " && "

    ' 构建完整的 cmd 命令 (切换驱动器 -> 切换目录 -> 执行 Git 命令)
    ' 注意：cd 命令后的路径不需要额外的反斜杠转义，但如果路径含空格，需要引号
    fullCommand = "cmd.exe /C """ & driveLetter & " && cd """ & m_RepoPath & """ && " & joinedCommands & """"

    BuildCommand = fullCommand
End Function

'---
' 执行命令行命令
' command: 要执行的完整命令字符串 (例如由 BuildCommand 生成)
' title: 用于日志记录的命令标题
' 返回值: Boolean - True 表示 VBA 执行未出错，False 表示出错
' 注意: 这不保证 Git 命令本身逻辑上成功 (例如 push 被拒绝)
'---
Private Function RunCommand(command As String, Optional title As String = "Git Command") As Boolean
    Dim waitOnReturn As Boolean: waitOnReturn = True ' 等待命令完成
    Dim windowStyle As Integer: windowStyle = 0      ' 0=隐藏窗口, 1=普通窗口
    Dim exitCode As Integer ' WshShell.Run 的返回值

    On Error GoTo CatchError
    RunCommand = False ' Assume failure

'    If modErrorHandler Is Nothing Then
'         MsgBox "错误处理器未初始化，无法记录日志！", vbCritical
'         Exit Function
'    End If

    ' 记录将要执行的命令 (有助于调试)
    'modErrorHandler.LogError 0, "准备执行: " & command, "clsGitHandler.RunCommand", , , title

    exitCode = m_WshShell.Run(command, windowStyle, waitOnReturn)

    ' 检查退出代码 (0 通常表示成功，但 Git 命令可能有其他成功代码)
    If exitCode = 0 Then
        RunCommand = True ' VBA 执行成功，且命令返回 0
        'modErrorHandler.LogError 0, "命令成功执行 (Exit Code: 0)", "clsGitHandler.RunCommand", , , title
    Else
        ' 命令返回非 0 代码，可能表示 Git 操作失败
        modErrorHandler.LogError exitCode, "命令执行返回非零退出代码", "clsGitHandler.RunCommand", , , title & " (Exit Code: " & exitCode & ")"
        RunCommand = False ' 标记为失败 (即使 VBA 未出错)
    End If

Finally:
    Exit Function

CatchError:
    ' 捕获 WshShell.Run 执行期间的 VBA 错误 (例如命令本身格式错误、找不到 cmd.exe 等)
    modErrorHandler.LogError Err.Number, Err.Description, "clsGitHandler.RunCommand", , , title & " (执行命令时发生VBA错误)"
    RunCommand = False
    Resume Finally
End Function



