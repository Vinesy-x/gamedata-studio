Attribute VB_Name = "modFileLogger"
' --- 建议放在 modUtilities 或新的 modFileLogger 标准模块中 ---
Option Explicit

Private Const LOG_FILE_NAME As String = "_ExcelExportDebug.log" ' 日志文件名
Private Const MAX_LOG_SIZE_KB As Long = 5120 ' 日志文件最大大小(KB)，例如5MB，防止无限增大
Private logFilePath As String ' 模块级变量存储完整路径，避免重复构建

'---
' 将调试或状态信息实时写入外部文本文件
' logMessage: 要记录的消息内容
'---
Public Sub LogToFile(logMessage As String)

    Exit Sub
    
    Dim fileNum As Integer
    Dim fullMsg As String
    
    logFilePath = CreateObject("WScript.Shell").SpecialFolders("Desktop") & Application.PathSeparator & LOG_FILE_NAME
    
    ' --- 获取并检查日志文件路径 ---
    If Len(logFilePath) = 0 Then
        On Error Resume Next ' 路径可能无效或无权限
        If ThisWorkbook.Path <> "" Then
            'logFilePath = ThisWorkbook.Path & "/" & LOG_FILE_NAME
            logFilePath = CreateObject("WScript.Shell").SpecialFolders("Desktop") & Application.PathSeparator & LOG_FILE_NAME
        Else
            ' 如果工作簿未保存，尝试保存到用户临时目录
            logFilePath = Environ("TEMP") & Application.PathSeparator & LOG_FILE_NAME
            If Dir(Environ("TEMP"), vbDirectory) = "" Then logFilePath = "" ' 临时目录也无效则放弃
        End If
        On Error GoTo 0
    End If

    If Len(logFilePath) = 0 Then
        Debug.Print "LogToFile Error: Cannot determine log file path." ' 无法确定路径则输出到立即窗口
        Debug.Print Now & " - " & logMessage
        Exit Sub
    End If

    ' --- 简单的日志滚动/大小限制 ---
    On Error Resume Next ' 文件操作可能失败
    If Dir(logFilePath) <> "" Then ' 文件存在
        If FileLen(logFilePath) > (MAX_LOG_SIZE_KB * 1024) Then
            ' 如果文件太大，可以删除或重命名旧文件
            Kill logFilePath ' 简单处理：直接删除旧日志
             ' 或者：Name logFilePath As logFilePath & ".old"
        End If
    End If
    On Error GoTo 0 ' 恢复正常错误处理

    ' --- 写入日志 ---
    On Error Resume Next ' 关键：确保日志写入失败不中断主流程
    fileNum = FreeFile ' 获取一个空闲文件编号
    ' **以 Append 模式打开，并立即写入和关闭**
    Open logFilePath For Append Access Write Lock Write As #fileNum
    If Err.Number = 0 Then ' 文件成功打开
        fullMsg = Format$(Now, "yyyy-mm-dd hh:mm:ss.000") & " - " & logMessage ' 添加毫秒级时间戳
        Print #fileNum, fullMsg
        Close #fileNum ' !!! 极其重要：立即关闭以确保写入磁盘 !!!
    Else
        ' 如果连日志文件都打不开/写不了，输出到立即窗口作为最后手段
        Debug.Print "LogToFile File Error " & Err.Number & ": " & Err.Description
        Debug.Print Now & " - " & logMessage
    End If
    On Error GoTo 0 ' 恢复正常错误处理
End Sub

'---
' (可选) 清除旧的日志文件，可以在导出开始时调用
'---
Public Sub ClearLogFile()

    Exit Sub
    
     If Len(logFilePath) = 0 Then
        If ThisWorkbook.Path <> "" Then
            logFilePath = ThisWorkbook.Path & Application.PathSeparator & LOG_FILE_NAME
        Else
            logFilePath = Environ("TEMP") & Application.PathSeparator & LOG_FILE_NAME
        End If
    End If

    On Error Resume Next
    If Dir(logFilePath) <> "" Then Kill logFilePath
    On Error GoTo 0
    LogToFile "===== Log Cleared =====" ' 标记日志已清除
End Sub
