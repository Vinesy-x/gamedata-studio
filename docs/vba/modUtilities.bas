Attribute VB_Name = "modUtilities"
'====================================================================================================
' 标准模块: modUtilities
' 作  用: 提供通用的、无状态的辅助函数，供其他模块调用。
'====================================================================================================
Option Explicit

' --- 常量定义 (用于 UI 重置，应与 clsExportJob/modErrorHandler 保持一致) ---
Public Const UI_SHEET As String = "表格输出" ' UI状态显示的表名
Public Const UI_RESULT_MARKER As String = "#输出表格结果#"
Public Const UI_FILELIST_MARKER As String = "#输出表格列表#"
Public Const UI_ERRORLIST_MARKER As String = "#输出错误列表#"
Public Const UI_STATUS_MARKER As String = "#工作状态#"
Public Const UI_OPERATION_MARKER As String = "#操作标识#"

'====================================================================================================
' 公共函数 - 查找与操作
'====================================================================================================

'---
' 在指定工作表的已使用范围内查找包含特定文本内容的第一个单元格
' ws: 要搜索的工作表对象
' findText: 要查找的文本内容
' lookAtWhole: 是否完全匹配 (True) 或部分匹配 (False)，默认为 True
' 返回值: 找到的 Range 对象，如果未找到或发生错误则返回 Nothing
'---
Public Function FindNamedRange(ws As Worksheet, findText As String, Optional lookAtWhole As Boolean = True) As Range
    Dim foundCell As Range
    Dim searchRange As Range

    On Error Resume Next ' 忽略查找过程中可能发生的错误

    Set FindNamedRange = Nothing ' 默认返回 Nothing

    If ws Is Nothing Then Exit Function ' 工作表对象无效

    ' 定义搜索范围为已使用区域
    Set searchRange = ws.UsedRange
    If searchRange Is Nothing Then Exit Function ' 工作表未使用

    ' 执行查找
    Set foundCell = searchRange.Find(What:=findText, _
                                     LookIn:=xlValues, _
                                     LookAt:=IIf(lookAtWhole, xlWhole, xlPart), _
                                     SearchOrder:=xlByRows, _
                                     SearchDirection:=xlNext, _
                                     MatchCase:=False) ' 通常不区分大小写

    If Not foundCell Is Nothing Then
        Set FindNamedRange = foundCell ' 返回找到的单元格
    End If

    On Error GoTo 0 ' 恢复正常错误处理
    Set foundCell = Nothing
    Set searchRange = Nothing
End Function

'====================================================================================================
' 公共函数 - 应用程序设置
'====================================================================================================

'---
' 切换 Excel 应用程序设置以优化性能或恢复正常状态
' Toggle: True - 开启加速 (关闭更新、事件、计算等)
'         False - 关闭加速 (恢复默认设置)
'---
Public Sub SpeedUp(ByVal Toggle As Boolean)
    On Error Resume Next ' 忽略设置属性时可能发生的错误 (例如在保护模式下)

    With Application
        .ScreenUpdating = Not Toggle        ' 屏幕更新
        .EnableEvents = Not Toggle          ' 事件响应
        .DisplayAlerts = Not Toggle         ' 系统提示
        .EnableAnimations = Not Toggle      ' 动画效果 (较新版本 Excel)
        ' .PrintCommunication = Not Toggle ' 打印通信 (可能影响打印设置)

        ' 计算模式: 加速时设为手动，恢复时设为自动
        If Toggle Then
            .Calculation = xlCalculationManual
        Else
            .Calculation = xlCalculationAutomatic
        End If
    End With

    On Error GoTo 0 ' 恢复正常错误处理
End Sub

'====================================================================================================
' 公共函数 - 工作簿与工作表
'====================================================================================================

'---
' 检查指定名称的工作表是否存在于给定的工作簿中
' wb: 要检查的工作簿对象
' sheetName: 要查找的工作表名称
' 返回值: Boolean - True 表示存在，False 表示不存在或出错
'---
Public Function SheetExists(wb As Workbook, sheetName As String) As Boolean
    Dim ws As Object ' 使用 Object 类型以避免错误

    On Error Resume Next ' 暂时忽略错误
    Set ws = wb.Sheets(sheetName)
    On Error GoTo 0  ' 恢复错误处理

    SheetExists = Not ws Is Nothing ' 如果对象不是 Nothing，则表示工作表存在
    Set ws = Nothing
End Function

'---
' 安全地获取指定名称的工作表对象，如果不存在则返回 Nothing
' wb: 要从中获取工作表的工作簿对象
' sheetName: 要获取的工作表名称
' 返回值: Worksheet 对象 或 Nothing
'---
Public Function GetWorksheetSafe(wb As Workbook, sheetName As String) As Worksheet
    On Error Resume Next ' 查找不存在的工作表会引发错误，忽略它
    Set GetWorksheetSafe = wb.Sheets(sheetName)
    On Error GoTo 0 ' 恢复正常错误处理
End Function

'====================================================================================================
' 公共函数 - 文件系统
'====================================================================================================

'---
' 验证指定目录是否存在且当前用户具有写入权限
' dirPath: 要验证的目录完整路径
' 返回值: Boolean - True 表示存在且可写，False 表示不存在或不可写
'---
Public Function ValidateDirectory(dirPath As String) As Boolean
    Dim fso As Object
    Dim tempFileName As String
    Dim fileNum As Integer
    Dim success As Boolean

    success = False ' 默认失败
    On Error GoTo CatchError

    ' 检查路径是否为空
    If Len(Trim(dirPath)) = 0 Then GoTo Finally

    ' 创建 FileSystemObject 对象
    Set fso = CreateObject("Scripting.FileSystemObject")
    If fso Is Nothing Then GoTo Finally ' 对象创建失败

    ' 1. 检查目录是否存在
    If Not fso.FolderExists(dirPath) Then
        GoTo Finally ' 目录不存在
    End If

    ' 2. 尝试在目录中创建临时文件以测试写入权限
    tempFileName = fso.BuildPath(dirPath, "write_test_" & Format(Now, "yyyymmddhhnnss") & ".tmp")
    fileNum = FreeFile() ' 获取一个空闲的文件号

    ' 打开文件进行写入 (如果失败，通常是权限问题)
    Open tempFileName For Output As #fileNum
    If Err.Number <> 0 Then
        Close #fileNum ' 确保关闭文件句柄
        On Error Resume Next ' 尝试删除可能未完全创建的文件
        fso.DeleteFile tempFileName, True
        On Error GoTo CatchError ' 恢复错误捕获
        GoTo Finally ' 打开失败，不可写
    End If

    ' 写入测试内容并关闭
    Print #fileNum, "Test write access"
    Close #fileNum

    ' 尝试删除测试文件
    On Error Resume Next ' 删除失败可能是意外情况，但不一定代表不可写
    fso.DeleteFile tempFileName, True
    On Error GoTo CatchError ' 恢复错误捕获
    ' 即使删除失败，只要能成功创建和写入，就认为目录可写

    success = True ' 所有检查通过

Finally:
    ValidateDirectory = success
    ' 清理对象
    Set fso = Nothing
    Exit Function

CatchError:
    ' 记录错误 (可选，因为此函数主要用于返回 True/False)
    ' Debug.Print "ValidateDirectory Error: #" & Err.Number & " - " & Err.Description
    success = False
    ' 确保文件句柄关闭，尝试清理临时文件
    On Error Resume Next
    Close #fileNum
    If Not fso Is Nothing And Len(tempFileName) > 0 Then
        If fso.FileExists(tempFileName) Then
            fso.DeleteFile tempFileName, True
        End If
    End If
    On Error GoTo 0
    Resume Finally ' 跳转到清理并返回 False
End Function

'====================================================================================================
' 公共函数 - UI 相关
'====================================================================================================

'---
' 重置 "表格输出" 工作表上的状态显示区域到初始状态
' (清除操作标识、状态、结果计数、文件列表、错误列表等)
'---

Public Sub ResetUIState()
    Dim uiSheet As Worksheet
    Dim opCell As Range, statusCell As Range, resultCell As Range
    Dim fileListStartCell As Range, errorListStartCell As Range
    Dim clearRange As Range
    Dim lastRow As Long

    On Error GoTo CatchError

    SpeedUp True
    
    ' 获取 UI 工作表
    Set uiSheet = GetWorksheetSafe(ThisWorkbook, UI_SHEET)
    If uiSheet Is Nothing Then
        Debug.Print "ResetUIState 错误: 找不到 UI 工作表 '" & UI_SHEET & "'"
        Exit Sub ' 找不到 UI 表则无法重置
    End If

    ' 一次性查找所有标记单元格
    Set opCell = FindNamedRange(uiSheet, UI_OPERATION_MARKER)
    Set statusCell = FindNamedRange(uiSheet, UI_STATUS_MARKER)
    Set resultCell = FindNamedRange(uiSheet, UI_RESULT_MARKER)
    Set fileListStartCell = FindNamedRange(uiSheet, UI_FILELIST_MARKER)
    Set errorListStartCell = FindNamedRange(uiSheet, UI_ERRORLIST_MARKER)

    ' -- 重置操作标识 --
    If Not opCell Is Nothing Then opCell.Offset(1, 0).Value = "空"

    ' -- 重置工作状态 --
    If Not statusCell Is Nothing Then statusCell.Offset(0, 1).Value = "空"

    ' -- 重置输出结果计数 --
    If Not resultCell Is Nothing Then resultCell.Offset(1, 1).Value = 0

    ' -- 清除文件列表 --
    If Not fileListStartCell Is Nothing Then
        ' 确定文件列表的实际范围
        lastRow = uiSheet.Cells(uiSheet.Rows.Count, fileListStartCell.Column).End(xlUp).Row
        If lastRow > fileListStartCell.Row Then
            Set clearRange = uiSheet.Range(fileListStartCell.Offset(1, 0), uiSheet.Cells(lastRow, fileListStartCell.Column))
            clearRange.ClearContents
            clearRange.Font.ColorIndex = xlAutomatic ' 恢复默认字体颜色
        End If
    End If

    ' -- 清除错误列表 --
    If Not errorListStartCell Is Nothing Then
        ' 假设错误列表从标记下两行开始
        lastRow = uiSheet.Cells(uiSheet.Rows.Count, errorListStartCell.Column).End(xlUp).Row
        If lastRow > errorListStartCell.Row + 1 Then
            Set clearRange = uiSheet.Range(errorListStartCell.Offset(2, 0), uiSheet.Cells(lastRow, errorListStartCell.Column + 5)) ' 假设6列
            clearRange.ClearContents
            clearRange.Interior.ColorIndex = xlNone ' 清除背景色
        End If
    End If

    SpeedUp (False)
    
Finally:
    ' 释放对象
    Set uiSheet = Nothing
    Set opCell = Nothing
    Set statusCell = Nothing
    Set resultCell = Nothing
    Set fileListStartCell = Nothing
    Set errorListStartCell = Nothing
    Set clearRange = Nothing
    Exit Sub

CatchError:
    Debug.Print "ResetUIState 发生错误: #" & Err.Number & " - " & Err.Description
    Resume Finally ' 继续执行清理步骤
End Sub



