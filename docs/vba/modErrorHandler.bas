Attribute VB_Name = "modErrorHandler"
'====================================================================================================
' 标准模块: modErrorHandler
' 作  用: 提供集中的错误日志记录和用户错误提示功能。
'====================================================================================================
Option Explicit

' --- 常量定义 ---
' 从 clsExportJob 引用或在此处重新定义 UI 相关常量
Private Const UI_SHEET As String = "表格输出" ' UI状态/日志显示的表名
Private Const UI_ERRORLIST_MARKER As String = "#输出错误列表#"

' 备用日志表的常量 (如果主日志区写入失败)
Private Const FALLBACK_LOG_SHEET As String = "ErrorLog_Fallback" ' 备用日志表名
Private Const MAX_ERROR_MSG_LENGTH As Integer = 255 ' 消息最大长度 (虽然单元格可以更长)

'====================================================================================================
' 公共方法
'====================================================================================================

'---
' 记录错误信息到指定的工作表区域
'---
Public Sub LogError( _
    ByVal errNumber As Long, _
    ByVal errDescription As String, _
    ByVal procedureName As String, _
    Optional ByVal workbookName As String = "", _
    Optional ByVal sheetName As String = "", _
    Optional ByVal additionalInfo As String = "")

    Dim outputSheet As Worksheet
    Dim logStartRange As Range
    Dim nextLogRow As Range

    On Error GoTo HandlerError ' 在错误处理函数自身中发生错误的处理

    ' 确保即使错误号为0 (非VBA错误，例如逻辑错误) 且有描述时也记录
    If errNumber = 0 And Len(errDescription) = 0 Then Exit Sub ' 完全无错误信息则退出

    ' --- 获取日志输出工作表 ---
    Set outputSheet = modUtilities.GetWorksheetSafe(ThisWorkbook, UI_SHEET)

    If outputSheet Is Nothing Then
        ' 如果主日志表不存在，尝试使用备用日志表
        Call InitializeFallbackErrorLog ' 创建或获取备用日志表
        Set outputSheet = modUtilities.GetWorksheetSafe(ThisWorkbook, FALLBACK_LOG_SHEET)
        If outputSheet Is Nothing Then
             ' 连备用日志表都无法创建/获取，则放弃写入工作表
             Debug.Print "严重错误: 无法写入错误日志到任何工作表。" & _
                         " Err #" & errNumber & " in " & procedureName & ": " & errDescription & _
                         " | AddInfo: " & additionalInfo
             Exit Sub
        End If
        ' 如果使用备用日志表，日志起始点是 A 列的末尾
        Set logStartRange = outputSheet.Cells(outputSheet.Rows.Count, "A").End(xlUp)
        Set nextLogRow = logStartRange.Offset(1, 0) ' 直接在下一行写入
    Else
        ' --- 在主日志表中查找日志区域起始点 ---
        Set logStartRange = modUtilities.FindNamedRange(outputSheet, UI_ERRORLIST_MARKER)

        If logStartRange Is Nothing Then
            ' 如果找不到标记，则追加到工作表的末尾 (A列)
            Set logStartRange = outputSheet.Cells(outputSheet.Rows.Count, "A").End(xlUp)
            Set nextLogRow = logStartRange.Offset(1, 0)
             ' 可以选择记录一个警告，说明未找到日志标记
             ' LogError 0, "未找到日志标记 '" & UI_ERRORLIST_MARKER & "'，错误将追加到表末尾。", "modErrorHandler.LogError"
        Else
            ' --- 查找标记下方的第一个空行 ---
            Set nextLogRow = logStartRange.Offset(1, 0) ' 从标记下一行开始
            ' 向下查找空行，但增加保护防止无限循环或超出合理范围
            Dim counter As Integer
            Do While Len(nextLogRow.Value) > 0 And counter < 5000 ' 检查 A 列是否有内容
                Set nextLogRow = nextLogRow.Offset(1, 0)
                counter = counter + 1
                If nextLogRow.Row > outputSheet.Rows.Count - 1 Then ' 防止超出工作表范围
                    Set nextLogRow = outputSheet.Cells(outputSheet.Rows.Count, "A").End(xlUp).Offset(1, 0)
                    Exit Do
                End If
            Loop
        End If
    End If

    ' --- 写入错误信息 ---
    With nextLogRow
        .Offset(0, 0).Value = Format(Now, "yyyy-mm-dd hh:mm:ss") ' 时间
        .Offset(0, 1).Value = errNumber                           ' 错误号
        .Offset(0, 2).Value = procedureName                       ' 过程名
        ' .Offset(0, 3).Value = IIf(workbookName = "", ThisWorkbook.Name, workbookName) ' 工作簿 (原逻辑，可保留或简化)
        .Offset(0, 3).Value = sheetName                           ' 工作表名
        .Offset(0, 4).Value = additionalInfo                      ' 附加信息
        .Offset(0, 5).Value = errDescription                      ' 错误描述 (完整)

        ' 设置简单格式，突出显示错误行
        .Resize(1, 6).Interior.Color = RGB(255, 230, 230) ' 浅红色背景
        .Resize(1, 6).Borders(xlEdgeBottom).LineStyle = xlContinuous ' 添加下边框以便区分
        .Resize(1, 6).Borders(xlEdgeBottom).Weight = xlThin
    End With

    ' 可选：根据内容长度调整单元格格式
    If Len(errDescription) > 100 Then ' 如果错误描述很长
        ' nextLogRow.Offset(0, 5).WrapText = True ' 自动换行可能导致行高变化很大
        ' 或者截断显示部分？
    End If
    If Len(additionalInfo) > 50 Then
        ' nextLogRow.Offset(0, 4).WrapText = True
    End If

Finally:
    Set outputSheet = Nothing
    Set logStartRange = Nothing
    Set nextLogRow = Nothing
    Exit Sub

HandlerError:
    ' 如果记录日志本身出错，则输出到立即窗口，避免无限循环
    Debug.Print "!!!!!!!!!!!! LogError 函数自身发生错误 !!!!!!!!!!!!"
    Debug.Print "原始错误: #" & errNumber & " in " & procedureName & ": " & errDescription
    Debug.Print "LogError 错误: #" & Err.Number & ": " & Err.Description
    Debug.Print "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    Resume Finally ' 退出 LogError 函数
End Sub


'---
' 显示格式化的错误消息给用户 (通过 MsgBox)
' 注意：默认 MsgBox 是注释掉的，以防止中断流程
'---
Public Sub ShowFriendlyError( _
    ByVal errNumber As Long, _
    ByVal errDescription As String, _
    Optional ByVal customMessage As String = "")

    Dim msg As String

    ' 构建消息主体
    If customMessage <> "" Then
        msg = customMessage & vbCrLf & vbCrLf
    End If

    msg = msg & "发生错误:" & vbCrLf & _
          "错误号: " & errNumber & vbCrLf & _
          "描述: " & errDescription & vbCrLf & vbCrLf & _
          "详细信息已记录在 [" & UI_SHEET & "] 工作表的错误日志区域" & _
          " (或 [" & FALLBACK_LOG_SHEET & "] 工作表)。"

    ' --- 显示消息框 ---
    ' 取消下面的注释以启用弹出错误提示
    ' MsgBox msg, vbExclamation, "操作出错"

    ' --- 或者仅在调试模式下显示 MsgBox ---
    ' Dim cfg as clsConfig ' 需要获取配置对象
    ' Set cfg = GetConfigInstance() ' 需要一个获取配置实例的方法
    ' If Not cfg Is Nothing And cfg.IsDebugMode Then
    '      MsgBox msg, vbExclamation, "操作出错 (调试模式)"
    ' End If

    ' 同时输出到立即窗口，确保信息可见
    Debug.Print "-------------------- FRIENDLY ERROR --------------------"
    Debug.Print msg
    Debug.Print "--------------------------------------------------------"

End Sub


'====================================================================================================
' 私有辅助方法
'====================================================================================================

'---
' 初始化备用错误日志表 (如果主日志区域写入失败时调用)
'---
Private Sub InitializeFallbackErrorLog()
    Dim ws As Worksheet
    Dim modUtilities As modUtilities ' 假设可以直接使用标准模块的方法

    On Error Resume Next ' 忽略创建或设置表头时可能发生的错误

    Set modUtilities = New modUtilities ' 如果 modUtilities 是类模块则 New

    ' 尝试获取备用日志表
    Set ws = modUtilities.GetWorksheetSafe(ThisWorkbook, FALLBACK_LOG_SHEET)

    If ws Is Nothing Then
        ' 如果不存在，则创建新表
        ' 添加到工作簿末尾
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = FALLBACK_LOG_SHEET

        ' 设置表头
        With ws.Range("A1:F1") ' 列数与 LogError 中写入的列数一致
            .Value = Array("时间", "错误号", "过程名", "工作表", "附加信息", "错误描述")
            .Font.Bold = True
            .Interior.Color = RGB(200, 200, 200) ' 灰色背景
            .Columns.AutoFit ' 自动调整列宽
        End With
         ws.Visible = xlSheetVisible ' 确保工作表可见
    Else
         ' 如果表已存在，检查表头是否正确 (可选)
         If ws.Range("A1").Value <> "时间" Then ' 简单检查第一个单元格
              With ws.Range("A1:F1")
                  .Value = Array("时间", "错误号", "过程名", "工作表", "附加信息", "错误描述")
                  .Font.Bold = True
                  .Interior.Color = RGB(200, 200, 200)
                  .Columns.AutoFit
              End With
         End If
         ws.Visible = xlSheetVisible ' 确保工作表可见
    End If

    On Error GoTo 0 ' 恢复正常错误处理

    Set ws = Nothing
    Set modUtilities = Nothing ' 如果是类模块实例
End Sub





