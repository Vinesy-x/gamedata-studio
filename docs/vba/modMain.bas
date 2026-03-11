Attribute VB_Name = "modMain"
'====================================================================================================
' 标准模块: modMain
' 作  用: 作为 VBA 应用程序的入口点，处理用户界面交互（按钮点击），
'         启动核心业务逻辑 (clsExportJob)，并提供顶层错误处理。
'====================================================================================================
Option Explicit

' --- 常量定义 (可选，如果需要在此处引用UI表名) ---
' Private Const UI_SHEET As String = "表格输出" ' 通常在 clsExportJob/modUtilities/modErrorHandler 中定义和使用

'====================================================================================================
' 公共子程序 - 由 Excel 界面按钮触发
'====================================================================================================

'---
' 【绑定到“导出表格”按钮】
' 启动表格导出流程。
'---
Public Sub StartTableExportProcess()
    Dim job As clsExportJob
    Dim success As Boolean
    Dim startTime As Single

    startTime = Timer ' 记录宏开始时间

    On Error GoTo errorHandler

    ' --- 准备阶段 ---
    Application.StatusBar = "正在初始化导出任务..." ' 更新状态栏提示
    ' 可选：执行一些预检查或清理
    ' Call modUtilities.ResetUIState ' 在开始前重置UI状态

    ' --- 创建并运行导出任务 ---
    Set job = New clsExportJob ' 创建核心任务对象
    If job Is Nothing Then
         MsgBox "创建导出任务对象失败！内存不足或模块未正确加载。", vbCritical, "初始化失败"
         GoTo CleanUp ' 跳转到清理
    End If

    Application.StatusBar = "正在执行导出流程..."
    success = job.RunExport ' 执行导出

    ' --- 结束反馈 ---
    If success Then
        Debug.Print "表格导出流程成功完成！" & vbCrLf & vbCrLf & _
               "总耗时: " & Format(Timer - startTime, "0.00") & " 秒", vbInformation, "导出完成"
    Else
        Debug.Print "表格导出流程失败或包含错误。" & vbCrLf & _
               "请检查工作表 '" & modUtilities.UI_SHEET & "' 中的错误日志获取详细信息。", vbExclamation, "导出失败"
    End If

CleanUp:
    ' --- 清理资源 ---
    On Error Resume Next ' 忽略清理阶段的错误
    Set job = Nothing
    Application.StatusBar = False ' 清除状态栏
    On Error GoTo 0 ' 恢复正常错误处理
    Exit Sub

errorHandler:
    ' --- 顶层错误处理 ---
    Dim errorMsg As String
    errorMsg = "在执行导出流程时发生意外错误！" & vbCrLf & vbCrLf & _
               "错误号: " & Err.Number & vbCrLf & _
               "错误描述: " & Err.Description & vbCrLf & _
               "过程: modMain.StartTableExportProcess" & vbCrLf & vbCrLf & _
               "建议检查 '" & modUtilities.UI_SHEET & "' 工作表中的错误日志。"

    MsgBox errorMsg, vbCritical, "导出流程中断"

    ' 尝试记录这个顶层错误 (如果 errorHandler 实例可用)
    ' Dim errHandler As modErrorHandler
    ' On Error Resume Next ' 防止记录错误本身再出错
    ' Set errHandler = New modErrorHandler ' 如果是类模块
    ' If Not errHandler Is Nothing Then
    '     errHandler.LogError Err.Number, Err.Description, "modMain.StartTableExportProcess", ThisWorkbook.Name, , "顶层错误捕获"
    ' End If
    ' Set errHandler = Nothing
    ' On Error GoTo 0

    Resume CleanUp ' 跳转到清理步骤
End Sub


'---
' 【绑定到“上传Git”按钮】
' 启动将选定文件上传到 Git 的流程。
'---
Public Sub StartGitUploadProcess()
    Dim job As clsExportJob
    Dim success As Boolean
    Dim startTime As Single

    startTime = Timer

    On Error GoTo errorHandler

    ' --- 准备阶段 ---
    Application.StatusBar = "正在初始化 Git 上传任务..."
    ' 可选：预检查 (例如，检查 Git 是否安装?)

    ' --- 创建并运行上传任务 ---
    Set job = New clsExportJob
     If job Is Nothing Then
         Debug.Print "创建 Git 上传任务对象失败！内存不足或模块未正确加载。", vbCritical, "初始化失败"
         GoTo CleanUp
    End If

    Application.StatusBar = "正在执行 Git 上传流程..."
    success = job.RunGitUpload ' 执行上传

    ' --- 结束反馈 ---
    If success Then
        Debug.Print "Git 上传流程成功完成！" & vbCrLf & vbCrLf & _
               "总耗时: " & Format(Timer - startTime, "0.00") & " 秒", vbInformation, "上传完成"
    Else
        Debug.Print "Git 上传流程失败。" & vbCrLf & _
               "请检查工作表 '" & modUtilities.UI_SHEET & "' 中的错误日志获取详细信息。", vbExclamation, "上传失败"
    End If

CleanUp:
    ' --- 清理资源 ---
    On Error Resume Next
    Set job = Nothing
    Application.StatusBar = False
    On Error GoTo 0
    Exit Sub

errorHandler:
    ' --- 顶层错误处理 ---
     Dim errorMsg As String
    errorMsg = "在执行 Git 上传流程时发生意外错误！" & vbCrLf & vbCrLf & _
               "错误号: " & Err.Number & vbCrLf & _
               "错误描述: " & Err.Description & vbCrLf & _
               "过程: modMain.StartGitUploadProcess" & vbCrLf & vbCrLf & _
               "建议检查 '" & modUtilities.UI_SHEET & "' 工作表中的错误日志。"

    Debug.Print errorMsg, vbCritical, "上传流程中断"

    ' 尝试记录错误...
    Resume CleanUp
End Sub


'---
' 【绑定到“重置状态”按钮】
' 清理 UI 工作表上的状态显示区域。
'---
Public Sub ResetInterface()
    On Error GoTo errorHandler
    
    Application.StatusBar = "正在重置界面状态..."

    ' 调用工具模块中的 UI 重置功能
    Call modUtilities.ResetUIState
    
    Application.StatusBar = False
    Debug.Print "界面状态已重置。", vbInformation, "操作完成"

CleanUp:
    On Error Resume Next
    Application.StatusBar = False
    On Error GoTo 0
    Exit Sub

errorHandler:
    Debug.Print "重置界面状态时发生错误！" & vbCrLf & vbCrLf & _
           "错误号: " & Err.Number & vbCrLf & _
           "错误描述: " & Err.Description, vbCritical, "重置失败"
    Resume CleanUp
End Sub







