VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsExportJob"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'====================================================================================================
' 类模块: clsExportJob
' 作  用: 协调整个 Excel 表格导出流程和 Git 上传流程。
'====================================================================================================
Option Explicit

' --- 私有成员变量 ---
Private m_Config As clsConfig               ' 配置对象
Private m_VersionFilter As clsVersionFilter ' 版本筛选器
Private m_GitHandler As clsGitHandler       ' Git 操作对象

Private m_AllTablesWorkbook As Workbook     ' "全部表.xlsx" 工作簿对象
Private m_ModifiedFilesList As Collection   ' 本次运行实际修改的文件路径列表 (Collection of Strings)

Private m_StartTime As Single               ' 流程开始时间
Private m_EndTime As Single                 ' 流程结束时间
Private m_InMemoryData As Object ' Dictionary: Key=中文表名, Value=clsInMemoryTableData 对象



' --- 常量定义 (用于UI更新) ---
Private Const UI_SHEET As String = "表格输出" ' UI状态显示的表名
Private Const UI_RESULT_MARKER As String = "#输出表格结果#"
Private Const UI_FILELIST_MARKER As String = "#输出表格列表#"
Private Const UI_ERRORLIST_MARKER As String = "#输出错误列表#"
Private Const UI_STATUS_MARKER As String = "#工作状态#"
Private Const UI_OPERATION_MARKER As String = "#操作标识#"



'====================================================================================================
' 初始化和清理
'====================================================================================================

Private Sub Class_Initialize()
    ' 创建 Collection 对象
    Set m_ModifiedFilesList = New Collection
    Set m_InMemoryData = CreateObject("Scripting.Dictionary")
    ' 创建依赖对象的实例 (标准模块不需要 New)
    ' 其他对象将在 Initialize 方法中创建/传入
    
End Sub

Private Sub Class_Terminate()
    ' 确保资源被释放
    On Error Resume Next ' 忽略关闭时可能发生的错误
    If Not m_AllTablesWorkbook Is Nothing Then
        ' 决定是否在此处强制关闭？通常应在流程结束时已关闭
        ' m_AllTablesWorkbook.Close SaveChanges:=False
    End If
    Set m_AllTablesWorkbook = Nothing
    Set m_Config = Nothing
    Set m_VersionFilter = Nothing
    Set m_GitHandler = Nothing
    Set m_ModifiedFilesList = Nothing
    Set m_InMemoryData = Nothing
    On Error GoTo 0
End Sub

'====================================================================================================
' 公共方法 - 主要流程入口
'====================================================================================================

'---
' 执行完整的表格导出流程
' 返回值: Boolean - True 表示流程成功完成 (可能包含非关键错误), False 表示发生关键错误导致中断
'---
Public Function RunExport() As Boolean
    Dim success As Boolean
    
    success = False ' 默认失败

    On Error GoTo CatchError

    m_StartTime = Timer ' 记录开始时间
    UpdateStatus "开始导出..."

    ' 1. 初始化所有依赖和配置
    If Not InitializeJob() Then GoTo CleanUp ' 初始化失败则退出
    
    ' 2. **加载所有源数据到内存**
    If Not LoadAllSourceDataToMemory() Then
         MsgBox "加载源数据到内存失败，导出操作已取消。", vbCritical, "加载失败"
         GoTo CleanUp
    End If
    
    ' 2. (可选) 拉取最新的 Git 文件 (确保基于最新版本导出)
    If Not PullLatestChanges() Then
         ' 拉取失败可能不是关键错误，可以选择继续或停止
         UpdateStatus "警告: 拉取 Git 最新文件失败，将基于当前文件导出。"
         ' GoTo Finally ' 如果要求必须拉取成功，则取消注释
    End If

    ' 3. 设置并验证输出目录
    If Not SetupOutputDirectory() Then GoTo CleanUp

    ' 4. 打开弹框或创建 "全部表.xlsx"
    If m_Config.IsShowResource Then Shell "explorer.exe " & m_Config.OutputDirectory, 1
    If Not OpenOrCreateAllTablesWorkbook() Then GoTo CleanUp

    ' 5. 处理所有需要导出的表格，将内存传入 (核心)
    If Not ProcessAllTables(m_InMemoryData) Then
        ' 即使 ProcessAllTables 内部有错误，也可能部分成功，这里先不退出
        UpdateStatus "警告: 处理部分表格时发生错误，请检查日志。"
        ' 可以设置一个标志位表示有错误发生
    End If

    ' 6. 保存并关闭 "全部表.xlsx"
    If Not SaveAndCloseAllTablesWorkbook() Then GoTo CleanUp

    ' 7. 更新 Excel UI 上的结果
    UpdateExportStatusUI

    success = True ' 主要流程完成
    UpdateStatus "导出成功完成"


CleanUp: ' 统一的清理出口点

    ' 执行其他清理 (恢复 Excel 设置, 计算时间等)
    FinalizeExport
    RunExport = success ' 返回最终状态
    Exit Function


CatchError:
    modErrorHandler.LogError Err.Number, "导出流程发生意外错误: " & Err.Description, "clsExportJob.RunExport"
    UpdateStatus "错误: 导出流程意外终止!"
    success = False
    Resume CleanUp ' 跳转到清理步骤
End Function


' --- 在 clsExportJob 中新增 ---
'---
' 在导出开始前，将所有需要处理的表格的相关数据加载到内存中
' 返回值: Boolean - True 表示加载成功, False 表示失败
'---
Private Function LoadAllSourceDataToMemory() As Boolean
    Dim success As Boolean
    Dim tableKey As Variant, tableInfo As Variant
    Dim chineseName As String, versionRange As String
    Dim ws As Worksheet
    Dim mainData As Variant, versionRowData As Variant, versionColData As Variant
    Dim dataRange As Range, rowVersionRange As Range, colVersionRange As Range
    Dim rowVersionStartCell As Range, colVersionStartCell As Range
    Dim tableStore As clsInMemoryTableData
    Dim hasRowFlag As Boolean, hasColFlag As Boolean

    success = True ' 默认成功
    m_InMemoryData.RemoveAll ' 清空旧数据
    On Error GoTo LoadError

    UpdateStatus "开始加载源数据到内存..."

    If m_Config Is Nothing Or m_Config.TablesToProcess Is Nothing Or m_VersionFilter Is Nothing Then
        modErrorHandler.LogError 7001, "配置或版本筛选器未初始化，无法加载数据", "LoadAllSourceDataToMemory"
        success = False
        GoTo CleanUp
    End If

    ' 遍历所有在配置中定义的表格
    For Each tableKey In m_Config.TablesToProcess.Keys
        tableInfo = m_Config.TablesToProcess(tableKey)
        chineseName = CStr(tableKey)
        versionRange = CStr(tableInfo(2))

        ' 检查此表是否与当前导出版本相关
        If m_VersionFilter.IsVersionInRange(versionRange) Then
            'Call LogToFile("准备加载表: " & chineseName) ' 使用文件日志  暂时不需要
            Set ws = modUtilities.GetWorksheetSafe(ThisWorkbook, chineseName)
            If ws Is Nothing Then
                modErrorHandler.LogError 7002, "未找到工作表 '" & chineseName & "'，跳过加载", "LoadAllSourceDataToMemory"
                ' success = False ' 可以选择将此视为失败，或仅跳过
                'Continue For ' 继续下一个表
                GoTo LoadNext
            End If

            ' --- 重置当前表的数据变量 ---
            mainData = Empty
            versionRowData = Empty
            versionColData = Empty
            Set dataRange = Nothing
            Set rowVersionRange = Nothing
            Set colVersionRange = Nothing
            Set rowVersionStartCell = Nothing
            Set colVersionStartCell = Nothing
            hasRowFlag = False
            hasColFlag = False

            ' --- 查找版本标记位置 (只查找一次) ---
            ' 使用 UsedRange 查找标记效率通常足够
            On Error Resume Next ' Find 可能找不到
            Set rowVersionStartCell = ws.UsedRange.Find(m_Config.VersionRowFilterField, LookAt:=xlWhole)
            Set colVersionStartCell = ws.UsedRange.Find(m_Config.VersionColFilterField, LookAt:=xlWhole)
            hasRowFlag = Not rowVersionStartCell Is Nothing
            hasColFlag = Not colVersionStartCell Is Nothing
            On Error GoTo LoadError ' 恢复错误处理

            ' --- 加载主数据 ---
            Set dataRange = GetDataRange(ws) ' 使用辅助函数获取数据区域
            If Not dataRange Is Nothing Then
                If dataRange.Cells.Count > 0 Then
                     If dataRange.Cells.Count = 1 Then ' 单单元格处理
                          ReDim mainData(1 To 1, 1 To 1): mainData(1, 1) = dataRange.Value2
                     Else
                          mainData = dataRange.Value2 ' 使用 Value2 获取原始值，速度更快
                     End If
                End If
                'Call LogToFile("主数据加载完成: " & chineseName & IIf(IsEmpty(mainData), " (空)", " (有数据)"))
            Else
                modErrorHandler.LogError 7003, "无法确定 '" & chineseName & "' 的主数据区域", "LoadAllSourceDataToMemory"
                success = False ' 无法加载主数据视为失败
                'Continue For
                GoTo LoadNext
            End If

            ' --- 加载行版本数据 (如果存在标记) ---
            If hasRowFlag Then
                On Error Resume Next ' 获取范围和值可能失败
                Set rowVersionRange = rowVersionStartCell.Resize(UBound(mainData, 1), rowVersionStartCell.CurrentRegion.Columns.Count)
                If Not rowVersionRange Is Nothing Then
                     If rowVersionRange.Cells.Count = 1 Then
                          ReDim versionRowData(1 To 1, 1 To 1): versionRowData(1, 1) = rowVersionRange.Value2
                     ElseIf rowVersionRange.Cells.Count > 1 Then
                          versionRowData = rowVersionRange.Value2
                     End If
                End If
                On Error GoTo LoadError
                'Call LogToFile("行版本数据加载完成: " & chineseName & IIf(IsEmpty(versionRowData), " (空)", " (有数据)"))
            End If

             ' --- 加载列版本数据 (如果存在标记) ---
            If hasColFlag Then
                 On Error Resume Next
                 Set colVersionRange = colVersionStartCell.Resize(colVersionStartCell.CurrentRegion.Rows.Count, UBound(mainData, 2) + 2)
                 If Not colVersionRange Is Nothing Then
                      If colVersionRange.Cells.Count = 1 Then
                          ReDim versionColData(1 To 1, 1 To 1): versionColData(1, 1) = colVersionRange.Value2
                      ElseIf colVersionRange.Cells.Count > 1 Then
                          versionColData = colVersionRange.Value2
                      End If
                 End If
                 On Error GoTo LoadError
                 'Call LogToFile("列版本数据加载完成: " & chineseName & IIf(IsEmpty(versionColData), " (空)", " (有数据)"))
            End If

            ' --- 存储到内存结构 ---
            Set tableStore = New clsInMemoryTableData
            tableStore.mainData = mainData
            tableStore.versionRowData = versionRowData
            tableStore.versionColData = versionColData
            tableStore.HasVersionRowFlag = hasRowFlag
            tableStore.HasVersionColFlag = hasColFlag
            tableStore.SourceSheetName = chineseName

            m_InMemoryData.Add chineseName, tableStore ' 添加到主字典
LoadNext:
        End If ' End If IsVersionInRange
    Next tableKey
    
    UpdateStatus "源数据加载到内存完成。"
    
CleanUp:
    LoadAllSourceDataToMemory = success
    Set ws = Nothing
    Set dataRange = Nothing
    Set rowVersionRange = Nothing
    Set colVersionRange = Nothing
    Set rowVersionStartCell = Nothing
    Set colVersionStartCell = Nothing
    Set tableStore = Nothing
    Exit Function
LoadError:
    modErrorHandler.LogError Err.Number, "加载表 '" & chineseName & "' 数据到内存时出错: " & Err.Description, "LoadAllSourceDataToMemory"
    success = False
    Resume CleanUp ' 跳转清理并返回失败
End Function


' --- 辅助函数：获取主数据区域 ---
Private Function GetDataRange(ws As Worksheet) As Range
    Dim configArea As Range
    Dim dataArea As Range
    Set GetDataRange = Nothing ' 默认返回 Nothing
    On Error Resume Next ' Find 或区域操作可能失败

    Set configArea = modUtilities.FindNamedRange(ws, m_Config.ConfigDataField) ' 使用工具函数查找

    If Not configArea Is Nothing Then
        Set dataArea = configArea.Offset(0, 1).Resize(configArea.CurrentRegion.Rows.Count, configArea.CurrentRegion.Columns.Count - 1)
    Else
        ' 未找到标记，使用 A1 的 CurrentRegion 或 UsedRange
        If ws.Range("A1").Value <> "" Then
             Set dataArea = ws.Range("A1").CurrentRegion
        ElseIf Not ws.UsedRange Is Nothing Then
             ' A1 为空但表非空，尝试使用 UsedRange (风险：范围可能不准确)
             Set dataArea = ws.UsedRange
        End If
    End If

    If Not dataArea Is Nothing Then Set GetDataRange = dataArea

    On Error GoTo 0
    Set configArea = Nothing
    Set dataArea = Nothing
End Function

'---
' 执行 Git 文件上传流程
' 返回值: Boolean - True 表示流程成功完成, False 表示失败
'---
Public Function RunGitUpload() As Boolean
    Dim success As Boolean
    Dim filesToCommit() As String
    Dim commitMsg As String
    Dim repoRoot As String

    success = False ' Default to failure
    On Error GoTo CatchError

    UpdateStatus "开始上传到 Git..."

    ' 1. 初始化 Config 和 Git Handler (如果尚未初始化)
    '    或者，假设 RunExport 必须先于 RunGitUpload 执行
    If m_Config Is Nothing Then Set m_Config = New clsConfig
    ' Load minimal config needed? Or assume full config loaded by RunExport?
    If Not m_Config.LoadConfig(ThisWorkbook) Then
         modErrorHandler.LogError 5101, "无法加载配置以进行 Git 上传", "clsExportJob.RunGitUpload"
         GoTo Finally
    End If

    ' **确定 Git 仓库根目录** (重要逻辑)
    repoRoot = GetRepoRootFromPath(m_Config.OutputDirectory) ' 使用辅助函数
    If Len(repoRoot) = 0 Then
        modErrorHandler.LogError 5102, "无法确定 Git 仓库根目录", "clsExportJob.RunGitUpload"
        GoTo Finally
    End If

    If m_GitHandler Is Nothing Then Set m_GitHandler = New clsGitHandler
    m_GitHandler.Initialize repoRoot


    ' 2. 获取需要提交的文件列表
    '    方案 A: 从 UI 读取被标记的文件
    filesToCommit = ReadFilesToCommitFromUI()
    '    方案 B: 使用上次 RunExport 生成的 m_ModifiedFilesList (如果 Job 实例保持)
    '    filesToCommit = ConvertCollectionToArray(m_ModifiedFilesList)

    If UBound(filesToCommit) < LBound(filesToCommit) Then
         modErrorHandler.LogError 5103, "没有找到需要提交到 Git 的文件", "clsExportJob.RunGitUpload"
         UpdateStatus "信息: 没有需要提交的文件。"
         success = True ' 没有文件提交也算成功完成操作
         GoTo Finally
    End If

    ' 3. 生成提交信息
    commitMsg = GenerateCommitMessage()
    If Len(commitMsg) = 0 Then
        modErrorHandler.LogError 5104, "无法生成有效的 Git 提交信息", "clsExportJob.RunGitUpload"
        GoTo Finally
    End If

    ' 4. 执行 Git Add, Commit, Push
    UpdateStatus "正在执行 git add/commit/push..."
    If Not m_GitHandler.AddCommitPush(filesToCommit, commitMsg) Then
         modErrorHandler.LogError 5105, "Git add/commit/push 操作失败", "clsExportJob.RunGitUpload"
         UpdateStatus "错误: Git 操作失败，请检查日志。"
         GoTo Finally ' Git 操作失败，则整个上传失败
    End If

    ' 5. 重置 UI 状态 (清除列表和标记)
    modUtilities.ResetUIState ' 调用工具模块的方法

    ' 6. (可选) 再次拉取最新代码
    'UpdateStatus "正在拉取最新代码以同步..."
'    If Not PullLatestChanges() Then
'         UpdateStatus "警告: 推送后拉取最新代码失败。"
'         ' 这通常不影响上传本身的成功状态
'    End If

    success = True
    UpdateStatus "Git 上传成功完成"

Finally:
    ' 清理特定于上传的资源？通常不需要
    RunGitUpload = success
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "Git 上传流程发生意外错误: " & Err.Description, "clsExportJob.RunGitUpload"
    UpdateStatus "错误: Git 上传流程意外终止!"
    success = False
    Resume Finally
End Function

'====================================================================================================
' 私有辅助方法 - 按流程步骤
'====================================================================================================

'---
' 1. 初始化 Job: 创建对象、加载配置、设置优化
'---
Private Function InitializeJob() As Boolean
    Dim success As Boolean
    success = False ' Default to failure

    On Error GoTo CatchError

    ' -- 应用性能优化 --
    modUtilities.SpeedUp True

    ' -- 创建和加载配置 --
    Set m_Config = New clsConfig
    If Not m_Config.LoadConfig(ThisWorkbook) Then
        modErrorHandler.LogError 3001, "加载配置失败，导出无法继续", "clsExportJob.InitializeJob"
        GoTo Finally ' 配置加载失败是关键错误
    Else
        ' --- 加载成功后 进行版本号的递增 ---
        m_Config.IncrementAndSaveVersionSequence
        
    End If

    ' -- 创建版本筛选器 --
    Set m_VersionFilter = New clsVersionFilter
    m_VersionFilter.Initialize m_Config.OutputVersionNumber, m_Config.OutputLineFields

    ' -- 创建 Git 处理器 --
    Set m_GitHandler = New clsGitHandler
    Dim repoRoot As String
    repoRoot = GetRepoRootFromPath(m_Config.OutputDirectory) ' 需要实现此辅助函数
    If Len(repoRoot) > 0 Then
        m_GitHandler.Initialize repoRoot
    Else
        modErrorHandler.LogError 3002, "无法确定 Git 仓库根目录，Git 相关操作将不可用", "clsExportJob.InitializeJob"
        ' 可以选择继续导出，但 Git 操作会失败
    End If

    ' -- 清空上次运行的修改列表 --
    Set m_ModifiedFilesList = New Collection

    success = True

Finally:
    InitializeJob = success
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "初始化导出任务时出错: " & Err.Description, "clsExportJob.InitializeJob"
    success = False
    Resume Finally
End Function

'---
' 2. 拉取 Git 最新文件
'---
Private Function PullLatestChanges() As Boolean
    If m_GitHandler Is Nothing Then
        modErrorHandler.LogError 3201, "Git Handler 未初始化，无法拉取", "clsExportJob.PullLatestChanges"
        PullLatestChanges = False
        Exit Function
    End If

    UpdateStatus "正在拉取 Git 最新文件..."
    PullLatestChanges = m_GitHandler.PullLatest()
    If Not PullLatestChanges Then
         UpdateStatus "警告: 拉取 Git 最新文件失败。"
    End If
End Function

'---
' 3. 设置并验证输出目录
'---
Private Function SetupOutputDirectory() As Boolean
    Dim dirPath As String
    dirPath = m_Config.OutputDirectory

    If Len(dirPath) = 0 Then
        modErrorHandler.LogError 3301, "输出目录路径为空，无法继续导出", "clsExportJob.SetupOutputDirectory"
        SetupOutputDirectory = False
        Exit Function
    End If

    ' 检查目录是否存在，不存在则尝试创建
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(dirPath) Then
        UpdateStatus "输出目录不存在，正在尝试创建: " & dirPath
        On Error Resume Next
        fso.CreateFolder dirPath
        If Err.Number <> 0 Then
            On Error GoTo 0
            modErrorHandler.LogError Err.Number, "无法创建输出目录: " & dirPath, "clsExportJob.SetupOutputDirectory"
            SetupOutputDirectory = False
            Exit Function
        End If
        On Error GoTo 0
        UpdateStatus "输出目录创建成功。"
    End If
    Set fso = Nothing

    ' 验证目录是否可写
    If Not modUtilities.ValidateDirectory(dirPath) Then
         modErrorHandler.LogError 3302, "输出目录不可写: " & dirPath, "clsExportJob.SetupOutputDirectory"
         SetupOutputDirectory = False
         Exit Function
    End If

    SetupOutputDirectory = True
End Function

'---
' 4. 打开或创建 "全部表.xlsx"
'---
Private Function OpenOrCreateAllTablesWorkbook() As Boolean
    Dim wbPath As String
    Dim wbName As String
    Dim fso As Object
    Dim xlApp As Object ' Excel Application
    Dim wb As Workbook

    wbName = "全部表.xlsx"
    wbPath = m_Config.OutputDirectory & "\" & wbName

    On Error GoTo CatchError
    OpenOrCreateAllTablesWorkbook = False ' Default to failure

    Set fso = CreateObject("Scripting.FileSystemObject")

    ' --- 尝试获取或创建 Excel 实例 ---
    On Error Resume Next ' 尝试获取正在运行的实例
    Set xlApp = GetObject(, "Excel.Application")
    If xlApp Is Nothing Then
        Set xlApp = CreateObject("Excel.Application") ' 创建新实例
        If xlApp Is Nothing Then
             modErrorHandler.LogError 3401, "无法创建 Excel Application 对象", "clsExportJob.OpenOrCreateAllTablesWorkbook"
             GoTo Finally
        End If
    End If
    On Error GoTo CatchError ' 恢复正常错误处理

    ' --- 检查文件是否存在 ---
    If Not fso.FileExists(wbPath) Then
        UpdateStatus "'" & wbName & "' 不存在，正在创建..."
        ' 创建新工作簿
        Set wb = xlApp.Workbooks.Add
        wb.Sheets(1).Name = "请勿删除此表" ' 添加一个占位符表？
        ' 保存新工作簿
        Dim originalAlerts As Boolean
        originalAlerts = xlApp.DisplayAlerts
        xlApp.DisplayAlerts = False
        wb.SaveAs wbPath
        xlApp.DisplayAlerts = originalAlerts
        If Err.Number <> 0 Then
             modErrorHandler.LogError Err.Number, "创建并保存 '" & wbName & "' 失败: " & Err.Description, "clsExportJob.OpenOrCreateAllTablesWorkbook"
             wb.Close False ' 关闭未保存的工作簿
             GoTo Finally
        End If
        UpdateStatus "'" & wbName & "' 创建成功。"
        ' 创建后需要立即关闭再重新打开吗？还是直接使用 wb 实例？
        ' 直接使用实例更高效
        Set m_AllTablesWorkbook = wb
    Else
        UpdateStatus "正在打开 '" & wbName & "' ..."
        ' 检查是否已打开
        Dim isOpen As Boolean: isOpen = False
        For Each wb In xlApp.Workbooks
            If wb.FullName = wbPath Then
                Set m_AllTablesWorkbook = wb
                isOpen = True
                Exit For
            End If
        Next wb

        ' 如果未打开，则打开它
        If Not isOpen Then
             Set m_AllTablesWorkbook = xlApp.Workbooks.Open(wbPath)
             If m_AllTablesWorkbook Is Nothing Then ' 打开失败
                  modErrorHandler.LogError 3402, "无法打开文件: " & wbPath, "clsExportJob.OpenOrCreateAllTablesWorkbook"
                  GoTo Finally
             End If
        End If
         UpdateStatus "'" & wbName & "' 打开成功。"
    End If

    ' 可选：设置 Excel 可见性
    xlApp.Visible = True ' 或者 False，根据需要

    OpenOrCreateAllTablesWorkbook = True ' 成功获取工作簿对象

Finally:
    Set fso = Nothing
    ' 不要在此处释放 xlApp，除非确定不再需要
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "打开或创建 '" & wbName & "' 时出错: " & Err.Description, "clsExportJob.OpenOrCreateAllTablesWorkbook"
    If Not wb Is Nothing And Not wb.Saved Then wb.Close False ' 关闭未保存的新建工作簿
    Set m_AllTablesWorkbook = Nothing ' 确保引用为空
    OpenOrCreateAllTablesWorkbook = False
    Resume Finally
End Function

'---
' 5. 处理所有符合条件的表格
'---
Private Function ProcessAllTables(inMemoryData As Object) As Boolean
    Dim tableKey As Variant ' 中文名
    'Dim tableInfo As Variant ' 数组: Array(英文名, 是否默认输出, 版本区间字符串)
    Dim tableStore As clsInMemoryTableData          ' 存储在字典中的对象
    Dim dataTable As clsDataTable
    Dim processSuccess As Boolean
    Dim overallSuccess As Boolean: overallSuccess = True ' 跟踪是否有任何表处理失败
    
    If inMemoryData Is Nothing Or inMemoryData.Count = 0 Then
        UpdateStatus "信息: 没有需要处理的表格数据。"
        ProcessAllTables = True ' 没有数据也算成功
        Exit Function
    End If
    
    If m_AllTablesWorkbook Is Nothing Then
        modErrorHandler.LogError 3102, "AllTablesWorkbook 未打开", "clsExportJob.ProcessAllTables"
        ProcessAllTables = False
        Exit Function
    End If
    If m_VersionFilter Is Nothing Then
         modErrorHandler.LogError 3104, "VersionFilter 未初始化", "clsExportJob.ProcessAllTables"
         ProcessAllTables = False
         Exit Function
    End If
    
    '---*******记录外部输出日志 先清理
    Call ClearLogFile
    
    UpdateStatus "开始处理表格数据..."
    Dim processedCount As Integer: processedCount = 0
    Dim totalCount As Integer: totalCount = m_Config.TablesToProcess.Count

    ' 遍历配置中需要处理的表格
    For Each tableKey In inMemoryData.Keys
        processedCount = processedCount + 1
        Set tableStore = inMemoryData(tableKey)   ' 获取内存数据对象
        
        Set dataTable = New clsDataTable
        Dim tableInfo As Variant: tableInfo = m_Config.TablesToProcess(tableKey) ' 获取配置信息
        Dim englishName As String: englishName = tableInfo(0)
        Dim shouldOutputByDefault As Boolean: shouldOutputByDefault = tableInfo(1)
        Dim versionRange As String: versionRange = tableInfo(2)

        dataTable.InitializeFromMemory tableStore.SourceSheetName, englishName, _
                                tableStore.mainData, tableStore.versionRowData, tableStore.versionColData, _
                                tableStore.HasVersionRowFlag, tableStore.HasVersionColFlag, _
                                m_Config, m_VersionFilter

        ' 处理表格
        processSuccess = dataTable.Process(m_AllTablesWorkbook)

        If processSuccess Then
             ' 如果处理成功且有修改，记录到修改列表
             If dataTable.IsModified Then
                 m_ModifiedFilesList.Add dataTable.OutputFilePath ' 假设 m_ModifiedFilesList 是 Collection
                  'If m_Config.IsDebugMode Then Debug.Print "  表格 '" & englishName & "' 已变更并输出。"
                  '---*******记录外部输出日志
                  Call LogToFile("表格已变更并添加到列表: " & englishName) ' <<< 新增日志
             End If
        Else
             ' 记录处理失败，但不一定中断整个 Job
             modErrorHandler.LogError 3103, "处理表格 '" & tableStore.SourceSheetName & "' 时发生错误", "clsExportJob.ProcessAllTables"
             overallSuccess = False ' 标记至少有一个表处理失败
        End If

        Set dataTable = Nothing ' 释放对象

    Next tableKey

    UpdateStatus "内存数据处理完成。"
    ProcessAllTables = overallSuccess ' 返回整体处理结果

End Function

'---
' 6. 保存并关闭 "全部表.xlsx"
'---
Private Function SaveAndCloseAllTablesWorkbook() As Boolean
    Dim success As Boolean
    success = False ' Default failure

    If m_AllTablesWorkbook Is Nothing Then
        modErrorHandler.LogError 3601, "AllTablesWorkbook 对象为空，无法保存关闭", "clsExportJob.SaveAndCloseAllTablesWorkbook"
        GoTo Finally
    End If

    UpdateStatus "正在保存并关闭 " & m_AllTablesWorkbook.Name & "..."
    On Error GoTo CatchError

    ' 添加其路径到修改列表 (即使没有内容变化，文件本身可能需要提交)
    If m_ModifiedFilesList.Count > 0 Then ' 仅当有其他表修改时才添加 AllTables？ 或总是添加？
         ' 检查是否已存在 (避免重复添加)
         Dim item As Variant, found As Boolean: found = False
         For Each item In m_ModifiedFilesList
              If item = m_AllTablesWorkbook.FullName Then
                   found = True
                   Exit For
              End If
         Next item
         If Not found Then m_ModifiedFilesList.Add m_AllTablesWorkbook.FullName
    End If


    m_AllTablesWorkbook.Close SaveChanges:=True ' 保存更改并关闭

    Set m_AllTablesWorkbook = Nothing ' 清除引用
    success = True
    UpdateStatus "AllTablesWorkbook 已保存关闭。"

Finally:
    SaveAndCloseAllTablesWorkbook = success
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "保存或关闭 AllTablesWorkbook 时出错: " & Err.Description, "clsExportJob.SaveAndCloseAllTablesWorkbook"
    ' 尝试强制关闭，不保存？
    On Error Resume Next
    If Not m_AllTablesWorkbook Is Nothing Then m_AllTablesWorkbook.Close SaveChanges:=False
    Set m_AllTablesWorkbook = Nothing
    On Error GoTo 0
    success = False
    Resume Finally
End Function

'---
' 7. 更新 Excel UI 上的状态和结果
'---
Private Sub UpdateExportStatusUI()
    Dim uiSheet As Worksheet
    Dim resultCell As Range
    Dim fileListStartCell As Range
    Dim i As Long

    On Error GoTo CatchError

    Set uiSheet = modUtilities.GetWorksheetSafe(ThisWorkbook, UI_SHEET) ' UI 在主工作簿
    If uiSheet Is Nothing Then
        modErrorHandler.LogError 3701, "无法找到用于更新 UI 的工作表: " & UI_SHEET, "clsExportJob.UpdateExportStatusUI"
        Exit Sub
    End If

    ' -- 更新结果计数 --
    Set resultCell = modUtilities.FindNamedRange(uiSheet, UI_RESULT_MARKER)
    If Not resultCell Is Nothing Then
        resultCell.Offset(1, 1).Value = m_ModifiedFilesList.Count
    End If

    ' -- 更新文件列表 --
    Set fileListStartCell = modUtilities.FindNamedRange(uiSheet, UI_FILELIST_MARKER)
    If Not fileListStartCell Is Nothing Then
        ' 清除旧列表 (从标记下一行开始)
        Dim clearRange As Range
        On Error Resume Next ' 忽略没有旧数据可清除的错误
        Set clearRange = fileListStartCell.Offset(1, 0).Resize(uiSheet.Rows.Count - fileListStartCell.Row, 1) ' 清除到底部
        If Not clearRange Is Nothing Then clearRange.ClearContents
        On Error GoTo CatchError ' 恢复错误处理

        ' 写入新列表
        If m_ModifiedFilesList.Count > 0 Then
            Dim fileArray() As String
            ReDim fileArray(1 To m_ModifiedFilesList.Count, 1 To 1)
            For i = 1 To m_ModifiedFilesList.Count
                fileArray(i, 1) = m_ModifiedFilesList(i)
            Next i
            fileListStartCell.Offset(1, 0).Resize(m_ModifiedFilesList.Count, 1).Value = fileArray
            ' 设置字体颜色 (例如红色表示新输出)
            fileListStartCell.Offset(1, 0).Resize(m_ModifiedFilesList.Count, 1).Font.ColorIndex = 3 ' 3 = Red
        End If
    End If

    ' -- 可以选择性地清除错误列表？通常错误需要保留 --
    ' Dim errorListStartCell As Range
    ' Set errorListStartCell = modUtilities.FindNamedRange(uiSheet, UI_ERRORLIST_MARKER)
    ' ... 清除旧错误 ...

Finally:
    Set uiSheet = Nothing
    Set resultCell = Nothing
    Set fileListStartCell = Nothing
    Set clearRange = Nothing
    Exit Sub

CatchError:
     modErrorHandler.LogError Err.Number, "更新 UI 状态时出错: " & Err.Description, "clsExportJob.UpdateExportStatusUI"
     Resume Finally
End Sub

'---
' 8. 清理资源，恢复设置，计算时间
'---
Private Sub FinalizeExport()
    On Error Resume Next ' 清理步骤中的错误不应中断

    ' -- 恢复 Excel 设置 --
    modUtilities.SpeedUp False

    ' -- 计算并记录总耗时 --
    m_EndTime = Timer
    Dim duration As Single
    duration = m_EndTime - m_StartTime
    UpdateStatus "总耗时: " & Format(duration, "0.00") & " 秒"
    If m_Config.IsDebugMode Then Debug.Print "Export Job Duration: " & duration & " seconds."

    ' -- 释放主要对象引用 (虽然 Terminate 会做，但显式释放更好) --
    Set m_AllTablesWorkbook = Nothing
    Set m_Config = Nothing
    Set m_VersionFilter = Nothing
    Set m_GitHandler = Nothing
    Set m_ModifiedFilesList = Nothing
    ' modUtilities 和 ErrorHandler 通常不需要在此处释放，除非它们是类模块且不再需要

    On Error GoTo 0
End Sub

'====================================================================================================
' 私有辅助方法 - 其他
'====================================================================================================

'---
' 更新状态栏或日志 (简化版，直接写入单元格)
'---
Private Sub UpdateStatus(message As String)
    Dim statusCell As Range
    On Error Resume Next ' 忽略更新状态时的错误
    Set statusCell = modUtilities.FindNamedRange(ThisWorkbook.Sheets(UI_SHEET), UI_STATUS_MARKER)
    If Not statusCell Is Nothing Then
        'statusCell.Offset(0, 1).Value = message & " (" & Format(Now, "hh:mm:ss") & ")"
        statusCell.Offset(0, 1).Value = message
    End If
    ' 同时输出到调试窗口
    If m_Config Is Nothing Then
         Debug.Print message ' Config 可能尚未初始化
    ElseIf m_Config.IsDebugMode Then
         Debug.Print message
    End If

    DoEvents ' 允许界面刷新
End Sub


'---
' 从 UI 读取标记为要提交的文件列表
'---
Private Function ReadFilesToCommitFromUI() As String()
    Dim uiSheet As Worksheet
    Dim fileListStartCell As Range
    Dim lastRow As Long
    Dim i As Long
    Dim tempCollection As New Collection
    Dim fileArray() As String

    On Error GoTo CatchError

    Set uiSheet = modUtilities.GetWorksheetSafe(ThisWorkbook, UI_SHEET)
    If uiSheet Is Nothing Then GoTo Finally ' 无法读取

    Set fileListStartCell = modUtilities.FindNamedRange(uiSheet, UI_FILELIST_MARKER)
    If fileListStartCell Is Nothing Then GoTo Finally ' 无法读取

    ' 查找列表的最后一行
    lastRow = uiSheet.Cells(uiSheet.Rows.Count, fileListStartCell.Column).End(xlUp).Row

    ' 遍历列表，检查标记 (例如，字体颜色为红色)
    If lastRow > fileListStartCell.Row Then
        For i = fileListStartCell.Row + 1 To lastRow
            With fileListStartCell.Offset(i - fileListStartCell.Row, 0)
                 ' **根据你的标记逻辑修改这里的条件**
                 ' 例如，检查复选框、单元格值、颜色等
                 If .Font.ColorIndex = 3 And Len(Trim(.Value)) > 0 Then ' 假设红色字体表示要提交
                      tempCollection.Add Trim(.Value)
                 End If
            End With
        Next i
    End If

    ' 将 Collection 转换为数组
    If tempCollection.Count > 0 Then
        ReDim fileArray(1 To tempCollection.Count)
        For i = 1 To tempCollection.Count
            fileArray(i) = tempCollection(i)
        Next i
    Else
        ReDim fileArray(0 To -1) ' 返回空数组的标准方式
    End If

Finally:
    ReadFilesToCommitFromUI = fileArray
    Set uiSheet = Nothing
    Set fileListStartCell = Nothing
    Set tempCollection = Nothing
    Exit Function

CatchError:
     modErrorHandler.LogError Err.Number, "从 UI 读取待提交文件列表时出错: " & Err.Description, "clsExportJob.ReadFilesToCommitFromUI"
     ReDim fileArray(0 To -1) ' 出错时返回空数组
     Resume Finally
End Function

'---
' 将 Collection 转换为 String 数组 (LBound=1)
'---
Private Function ConvertCollectionToArray(col As Collection) As String()
    Dim arr() As String
    Dim i As Long
    If col Is Nothing Or col.Count = 0 Then
         ReDim arr(0 To -1) ' Empty array
    Else
         ReDim arr(1 To col.Count)
         For i = 1 To col.Count
              arr(i) = CStr(col(i))
         Next i
    End If
    ConvertCollectionToArray = arr
End Function

'---
' 生成 Git 提交信息
'---
Private Function GenerateCommitMessage() As String
    If m_Config Is Nothing Then
        GenerateCommitMessage = "自动提交 (无配置信息)"
    Else
        ' 使用配置中的模板
        Dim template As String: template = m_Config.GitCommitMessageTemplate
        If Len(template) = 0 Then template = "自动导出: {VerName} {VerNum}.{SeqNum}" ' 默认模板

        ' 替换占位符
        template = Replace(template, "{VerName}", m_Config.OutputVersionName)
        template = Replace(template, "{VerNum}", CStr(m_Config.OutputVersionNumber))
        template = Replace(template, "{SeqNum}", CStr(m_Config.OutputVersionSequence))
        ' 可以添加其他占位符如 {User}, {Date} 等
        template = Replace(template, "{User}", Environ("USERNAME"))
        template = Replace(template, "{Date}", Format(Date, "yyyy-mm-dd"))
        
        template = template & m_Config.OutputVersionName & " " & m_Config.OutputVersionNumber & "." & m_Config.OutputVersionSequence
        
        GenerateCommitMessage = template
    End If
End Function

'---
' 辅助函数：从路径中获取 Git 仓库根目录 (需要用户实现)
'---
Private Function GetRepoRootFromPath(somePath As String) As String
    ' 实现逻辑：向上查找目录，直到找到 .git 文件夹，或达到根目录/预设层数
    Dim fso As Object, parentFolder As String
    On Error Resume Next ' 忽略文件系统错误
    Set fso = CreateObject("Scripting.FileSystemObject")
    If fso Is Nothing Then GetRepoRootFromPath = "": Exit Function

    parentFolder = somePath
    Do While Len(parentFolder) > 3 And fso.FolderExists(parentFolder) ' 避免在根目录无限循环
        If fso.FolderExists(parentFolder & "\.git") Then
            GetRepoRootFromPath = parentFolder
            Exit Function
        End If
        parentFolder = fso.GetParentFolderName(parentFolder)
        If Len(parentFolder) = 0 Then Exit Do ' Reached top?
    Loop
    GetRepoRootFromPath = "" ' Not found
    Set fso = Nothing
End Function






