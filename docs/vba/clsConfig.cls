VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsConfig"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'====================================================================================================
' 类模块: clsConfig
' 作  用: 封装所有从 Excel 表格读取的配置信息，管理导出任务的基础设定。
'====================================================================================================
Option Explicit

' --- 常量定义 ---
Private Const CFG_VERSION_LIST As String = "#版本列表#"
Private Const CFG_LINE_LIST As String = "#线路列表#"
Private Const CFG_STAFF_CODE As String = "#人员代码#"
Private Const CFG_DATA_VERSION As String = "#数据表版本#"
Private Const CFG_OUTPUT_VERSION As String = "#输出版本#"
Private Const CFG_OUTPUT_VERSION_NUM As String = "#输出版本号#"
Private Const CFG_OUTPUT_CONTROL As String = "#输出控制#"
Private Const CFG_GIT_COMMIT_LOG As String = "#Git通用提交日志#"
Private Const DEFAULT_VERSION_ROW_FIELD As String = "version_r"
Private Const DEFAULT_VERSION_COL_FIELD As String = "version_c"
Private Const DEFAULT_CONFIG_DATA_FIELD As String = "#配置区域#"
Private Const SHOW_RESOURCE_POPUP As String = "自动弹出路径"


' --- 私有成员变量 ---

' --- 核心工作簿和工作表名称 ---
Private m_DataSourceWorkbook As Workbook    ' 数据源工作簿对象 (通常是 ThisWorkbook)
Private m_ControlSheetName As String        ' 控制表名 (例如 "表格输出")
Private m_SettingSheetName As String        ' 设置表名 (例如 "配置设置表")
Private m_OutputSheetName As String         ' 输出信息表名 (例如 "表格输出")
Private m_MappingSheetName As String        ' 表名对照表名 (例如 "表名对照")

' --- 特殊字段名称 ---
Private m_VersionRowFilterField As String   ' 版本行筛选字段名
Private m_VersionColFilterField As String   ' 版本列筛选字段名
Private m_ConfigDataField As String         ' 表格配置区域标识

' --- 模板配置 (使用字典存储) ---
Private m_TemplateVersions As Object        ' Dictionary: Key=版本名称, Value=Array(目录模板, 线路列表Collection)
Private m_TemplateLines As Object           ' Dictionary: Key=线路字段名 (roads_x), Value=线路备注
Private m_TemplateStaffCodes As Object      ' Collection: 存储人员代码字符串

' --- 输出配置 ---
Private m_OutputVersionName As String       ' 输出版本名称 (例如 "繁体版本")
Private m_OutputVersionNumber As Double     ' 输出版本号 (例如 1.23)
Private m_OutputVersionSequence As Long     ' 输出版本序列号 (用于递增)
Private m_OutputLineFields As Object        ' Collection: 当前输出版本包含的线路字段列表 (roads_x)
Private m_OutputDirectory As String         ' 计算得出的最终输出目录

' --- 待处理表格列表 (使用字典存储) ---
Private m_TablesToProcess As Object         ' Dictionary: Key=中文名, Value=Array(英文名, 是否默认输出, 版本区间字符串)

' --- 其他配置 ---
Private m_GitCommitMessageTemplate As String ' Git提交信息模板
Private m_IsDebugMode As Boolean             ' 是否打点/调试模式 (可从配置表读取或硬编码)
Private m_IsShowResource As Boolean          ' 是否弹出资源管理器弹框


'====================================================================================================
' 初始化和清理
'====================================================================================================

Private Sub Class_Initialize()
    ' 类实例化时执行：设置默认值，创建对象
    Set m_TemplateVersions = CreateObject("Scripting.Dictionary")
    Set m_TemplateLines = CreateObject("Scripting.Dictionary")
    Set m_TemplateStaffCodes = CreateObject("Scripting.Dictionary") ' 改为字典 Key=代码, Value=True/False 或其他属性
    Set m_OutputLineFields = New Collection
    Set m_TablesToProcess = CreateObject("Scripting.Dictionary")

    ' 设置默认的工作表名称 (可以根据实际情况修改)
    m_ControlSheetName = "表格输出"
    m_SettingSheetName = "配置设置表"
    m_OutputSheetName = "表格输出"  ' 与控制表相同
    m_MappingSheetName = "表名对照"

    ' 设置默认的字段名称
    m_VersionRowFilterField = DEFAULT_VERSION_ROW_FIELD
    m_VersionColFilterField = DEFAULT_VERSION_COL_FIELD
    m_ConfigDataField = DEFAULT_CONFIG_DATA_FIELD

    ' 默认调试模式关闭
    m_IsDebugMode = False ' 或从配置表中读取，例如：m_IsDebugMode = GetSetting("DebugMode", False)
End Sub

Private Sub Class_Terminate()
    ' 类销毁时执行：释放对象引用
    Set m_TemplateVersions = Nothing
    Set m_TemplateLines = Nothing
    Set m_TemplateStaffCodes = Nothing
    Set m_OutputLineFields = Nothing
    Set m_TablesToProcess = Nothing
    Set m_DataSourceWorkbook = Nothing
End Sub

'====================================================================================================
' 公共属性 (Property Get - 提供只读访问)
'====================================================================================================

Public Property Get DataSourceWorkbook() As Workbook
    Set DataSourceWorkbook = m_DataSourceWorkbook
End Property

Public Property Get ControlSheetName() As String
    ControlSheetName = m_ControlSheetName
End Property

Public Property Get SettingSheetName() As String
    SettingSheetName = m_SettingSheetName
End Property

Public Property Get OutputSheetName() As String
    OutputSheetName = m_OutputSheetName
End Property

Public Property Get MappingSheetName() As String
    MappingSheetName = m_MappingSheetName
End Property

Public Property Get VersionRowFilterField() As String
    VersionRowFilterField = m_VersionRowFilterField
End Property

Public Property Get VersionColFilterField() As String
    VersionColFilterField = m_VersionColFilterField
End Property

Public Property Get ConfigDataField() As String
    ConfigDataField = m_ConfigDataField
End Property

Public Property Get TemplateVersions() As Object ' 返回字典对象
    Set TemplateVersions = m_TemplateVersions
End Property

Public Property Get TemplateLines() As Object ' 返回字典对象
    Set TemplateLines = m_TemplateLines
End Property

Public Property Get TemplateStaffCodes() As Object ' 返回字典对象
    Set TemplateStaffCodes = m_TemplateStaffCodes
End Property

Public Property Get OutputVersionName() As String
    OutputVersionName = m_OutputVersionName
End Property

Public Property Get OutputVersionNumber() As Double
    OutputVersionNumber = m_OutputVersionNumber
End Property

Public Property Get OutputVersionSequence() As Long
    OutputVersionSequence = m_OutputVersionSequence
End Property

Public Property Get OutputLineFields() As Object ' 返回集合对象
    Set OutputLineFields = m_OutputLineFields
End Property

Public Property Get OutputDirectory() As String
    OutputDirectory = m_OutputDirectory
End Property

Public Property Get TablesToProcess() As Object ' 返回字典对象
    Set TablesToProcess = m_TablesToProcess
End Property

Public Property Get GitCommitMessageTemplate() As String
    GitCommitMessageTemplate = m_GitCommitMessageTemplate
End Property

Public Property Get IsDebugMode() As Boolean
    IsDebugMode = m_IsDebugMode
End Property

Public Property Get IsShowResource() As Boolean
    IsShowResource = m_IsShowResource
End Property


'====================================================================================================
' 公共方法
'====================================================================================================

'---
' 加载所有配置信息
'---
Public Function LoadConfig(dataSourceWb As Workbook) As Boolean
    Dim success As Boolean
    Dim settingsSheet As Worksheet
    Dim controlSheet As Worksheet
    Dim mappingSheet As Worksheet

    success = True ' 默认为成功

    ' --- 保存依赖引用 ---
    Set m_DataSourceWorkbook = dataSourceWb
    On Error GoTo CatchError

    ' --- 获取所需工作表 ---
    Set settingsSheet = modUtilities.GetWorksheetSafe(m_DataSourceWorkbook, m_SettingSheetName)
    If settingsSheet Is Nothing Then
        modErrorHandler.LogError 1001, "无法找到配置设置表: '" & m_SettingSheetName & "'", "clsConfig.LoadConfig", m_DataSourceWorkbook.Name
        success = False
    End If

    Set controlSheet = modUtilities.GetWorksheetSafe(m_DataSourceWorkbook, m_ControlSheetName)
    If controlSheet Is Nothing Then
        modErrorHandler.LogError 1002, "无法找到控制表: '" & m_ControlSheetName & "'", "clsConfig.LoadConfig", m_DataSourceWorkbook.Name
        success = False
    End If

    Set mappingSheet = modUtilities.GetWorksheetSafe(m_DataSourceWorkbook, m_MappingSheetName)
    If mappingSheet Is Nothing Then
        modErrorHandler.LogError 1003, "无法找到表名对照表: '" & m_MappingSheetName & "'", "clsConfig.LoadConfig", m_DataSourceWorkbook.Name
        success = False
    End If

    ' 如果任何工作表查找失败，则提前退出
    If Not success Then GoTo Finally

    ' --- 按顺序加载各个部分的配置 ---
    If Not LoadBasicSettings() Then success = False           ' 加载基础字段名等 (如果需要从表读取)
    If Not LoadVersionTemplates(settingsSheet) Then success = False ' 加载版本模板
    If Not LoadLineTemplates(settingsSheet) Then success = False    ' 加载线路模板
    If Not LoadStaffCodes(settingsSheet) Then success = False       ' 加载人员代码
    If Not LoadOutputSettings(controlSheet) Then success = False    ' 加载输出版本信息
    If Not LoadTableList(mappingSheet) Then success = False         ' 加载待处理表格列表
    If Not LoadGitSettings(settingsSheet) Then success = False      ' 加载Git相关设置
    If Not LoadConfigSwitch(settingsSheet) Then success = False     ' 加载其他开关
    
    ' --- 如果所有加载都成功，计算衍生配置 ---
    If success Then
        DetermineOutputLineFields ' 根据加载的输出版本和版本模板，确定需要输出的线路字段
        CalculateOutputDirectory ' 计算最终的输出目录
    End If

Finally:
    LoadConfig = success ' 返回加载结果
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadConfig", m_DataSourceWorkbook.Name
    success = False
    Resume Finally ' 跳转到清理并返回失败
End Function

'---
' 获取指定表格的配置信息 (从已加载的 m_TablesToProcess 字典中)
'---
Public Function GetTableInfo(chineseName As String) As Variant
    If m_TablesToProcess.exists(chineseName) Then
        GetTableInfo = m_TablesToProcess(chineseName) ' 返回存储的数组或对象
    Else
        GetTableInfo = Null ' 或者 Empty，表示未找到
    End If
End Function

'---
' 将内存中的版本序列号加一，并写回控制表
'---
Public Sub IncrementAndSaveVersionSequence()
    Dim controlSheet As Worksheet
    Dim versionSeqCell As Range

    On Error GoTo CatchError

    Set controlSheet = modUtilities.GetWorksheetSafe(m_DataSourceWorkbook, m_ControlSheetName)
    If controlSheet Is Nothing Then Exit Sub ' 如果找不到控制表，则无法保存

    ' 查找版本序列号单元格 (假设 #数据表版本# 标记的上一行，第2列)
    Set versionSeqCell = modUtilities.FindNamedRange(controlSheet, CFG_DATA_VERSION)
    If Not versionSeqCell Is Nothing Then
        ' 递增内存中的值
        m_OutputVersionSequence = m_OutputVersionSequence + 1
        ' 写回工作表
        versionSeqCell.Offset(-1, 1).Value = m_OutputVersionSequence
    Else
        modErrorHandler.LogError 1010, "在控制表中未找到 '" & CFG_DATA_VERSION & "' 标记，无法保存版本序列号", "clsConfig.IncrementAndSaveVersionSequence", m_DataSourceWorkbook.Name, m_ControlSheetName
    End If

Finally:
    Set controlSheet = Nothing
    Set versionSeqCell = Nothing
    Exit Sub

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.IncrementAndSaveVersionSequence", m_DataSourceWorkbook.Name, m_ControlSheetName
    Resume Finally
End Sub


'====================================================================================================
' 私有辅助方法
'====================================================================================================

'---
' 加载基础设置 (如果需要从表中读取字段名等)
'---
Private Function LoadBasicSettings() As Boolean
    ' 目前字段名是硬编码或使用常量，此函数暂时为空或用于加载其他基础设置
    ' 如果 VersionRowFilterField 等需要从配置表读取，在此处实现
    LoadBasicSettings = True ' 假设总是成功
End Function

'---
' 从配置设置表加载版本模板信息
'---
Private Function LoadVersionTemplates(settingsSheet As Worksheet) As Boolean
    Dim startCell As Range
    Dim dataRange As Range
    Dim i As Long, j As Long
    Dim versionData As Variant
    Dim versionKey As String
    Dim directoryTemplate As String
    Dim linesRaw As String
    Dim linesArray As Variant
    Dim linesCollection As Collection

    On Error GoTo CatchError

    Set startCell = modUtilities.FindNamedRange(settingsSheet, CFG_VERSION_LIST)
    If startCell Is Nothing Then
        modErrorHandler.LogError 1020, "配置设置表中未找到 '" & CFG_VERSION_LIST & "' 标记", "clsConfig.LoadVersionTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
        LoadVersionTemplates = False
        Exit Function
    End If

    ' 获取数据区域 (从标记下一行开始)
    Set dataRange = startCell.CurrentRegion
    If dataRange.Rows.Count <= 1 Then
        LoadVersionTemplates = True ' 没有数据也算成功
        Exit Function
    End If
    ' Offset(1) 跳过标题行, Resize 去掉标题行
    versionData = dataRange.Offset(1, 0).Resize(dataRange.Rows.Count - 1, dataRange.Columns.Count).Value

    ' 清空现有数据
    m_TemplateVersions.RemoveAll

    ' 遍历数据行
    For i = 1 To UBound(versionData, 1)
        versionKey = Trim(CStr(versionData(i, 1))) ' 版本名称 (第1列)
        If Len(versionKey) > 0 Then
            linesRaw = Trim(CStr(versionData(i, 2)))          ' 线路列表字符串 (第2列)
            directoryTemplate = Trim(CStr(versionData(i, 3))) ' 目录模板 (第3列)

            ' 解析线路列表
            Set linesCollection = New Collection
            If Len(linesRaw) > 0 Then
                linesArray = Split(linesRaw, ";")
                For j = LBound(linesArray) To UBound(linesArray)
                    If Len(Trim(linesArray(j))) > 0 Then
                         linesCollection.Add Trim(linesArray(j)) ' 添加非空线路名称
                    End If
                Next j
            End If

            ' 存入字典
            If Not m_TemplateVersions.exists(versionKey) Then
                ' 使用数组存储目录模板和线路集合
                m_TemplateVersions.Add versionKey, Array(directoryTemplate, linesCollection)
            Else
                modErrorHandler.LogError 1021, "配置设置表中发现重复的版本名称: '" & versionKey & "'", "clsConfig.LoadVersionTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
                ' 可以选择覆盖或忽略，这里选择忽略并记录错误
            End If
        Else
            Exit For '遇到空行则停止
        End If
    Next i

    LoadVersionTemplates = True ' 加载完成

Finally:
    Set startCell = Nothing
    Set dataRange = Nothing
    Set linesCollection = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadVersionTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
    LoadVersionTemplates = False
    Resume Finally
End Function

'---
' 从配置设置表加载线路模板信息
'---
Private Function LoadLineTemplates(settingsSheet As Worksheet) As Boolean
    Dim startCell As Range
    Dim dataRange As Range
    Dim i As Long
    Dim lineData As Variant
    Dim lineId As String
    Dim lineField As String
    Dim lineRemark As String

    On Error GoTo CatchError

    Set startCell = modUtilities.FindNamedRange(settingsSheet, CFG_LINE_LIST)
    If startCell Is Nothing Then
        modErrorHandler.LogError 1030, "配置设置表中未找到 '" & CFG_LINE_LIST & "' 标记", "clsConfig.LoadLineTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
        LoadLineTemplates = False
        Exit Function
    End If

    Set dataRange = startCell.CurrentRegion
    If dataRange.Rows.Count <= 1 Then
        LoadLineTemplates = True ' 没有数据也算成功
        Exit Function
    End If
    lineData = dataRange.Offset(1, 0).Resize(dataRange.Rows.Count - 1, dataRange.Columns.Count).Value

    m_TemplateLines.RemoveAll ' 清空现有数据

    For i = 1 To UBound(lineData, 1)
        lineId = Trim(CStr(lineData(i, 1))) ' 线路id (第1列) 默认id从1开始按顺序依次
        If Len(lineId) > 0 Then
            lineField = Trim(CStr(lineData(i, 2))) ' 线路字段名 (第2列) 线路备注不加载
            If Not m_TemplateLines.exists(lineId) Then
                m_TemplateLines.Add lineId, lineField
            Else
                modErrorHandler.LogError 1031, "配置设置表中发现重复的线路字段ID: '" & lineId & "'", "clsConfig.LoadLineTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
            End If
        Else
             Exit For '遇到空行则停止
        End If
    Next i

    LoadLineTemplates = True

Finally:
    Set startCell = Nothing
    Set dataRange = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadLineTemplates", m_DataSourceWorkbook.Name, settingsSheet.Name
    LoadLineTemplates = False
    Resume Finally
End Function

'---
' 从配置设置表加载人员代码
'---
Private Function LoadStaffCodes(settingsSheet As Worksheet) As Boolean
    Dim startCell As Range
    Dim dataRange As Range
    Dim i As Long
    Dim staffData As Variant
    Dim staffCode As String

    On Error GoTo CatchError

    Set startCell = modUtilities.FindNamedRange(settingsSheet, CFG_STAFF_CODE)
    If startCell Is Nothing Then
        modErrorHandler.LogError 1040, "配置设置表中未找到 '" & CFG_STAFF_CODE & "' 标记", "clsConfig.LoadStaffCodes", m_DataSourceWorkbook.Name, settingsSheet.Name
        LoadStaffCodes = False
        Exit Function
    End If

    Set dataRange = startCell.CurrentRegion
    If dataRange.Rows.Count <= 1 Then
        LoadStaffCodes = True ' 没有数据也算成功
        Exit Function
    End If
    staffData = dataRange.Offset(1, 0).Resize(dataRange.Rows.Count - 1, dataRange.Columns.Count).Value

    m_TemplateStaffCodes.RemoveAll ' 清空现有数据

    For i = 1 To UBound(staffData, 1)
        staffCode = Trim(CStr(staffData(i, 3))) ' 人员代码在第3列
        If Len(staffCode) > 0 Then
            If Not m_TemplateStaffCodes.exists(staffCode) Then
                 m_TemplateStaffCodes.Add staffCode, True ' 使用字典，Value 可以存储其他信息，或简单设为 True
            Else
                ' 可以记录重复，但通常人员代码允许重复出现在不同行？根据实际需求定
            End If
        Else
            Exit For '遇到空行则停止
        End If
    Next i

    LoadStaffCodes = True

Finally:
    Set startCell = Nothing
    Set dataRange = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadStaffCodes", m_DataSourceWorkbook.Name, settingsSheet.Name
    LoadStaffCodes = False
    Resume Finally
End Function

'---
' 从控制表加载输出版本、版本号等信息
'---
Private Function LoadOutputSettings(controlSheet As Worksheet) As Boolean
    Dim versionSeqCell As Range
    Dim outputVersionCell As Range
    Dim outputVersionNumCell As Range

    On Error GoTo CatchError

    ' --- 获取版本序列号 ---
    Set versionSeqCell = modUtilities.FindNamedRange(controlSheet, CFG_DATA_VERSION)
    If versionSeqCell Is Nothing Then
        modErrorHandler.LogError 1050, "控制表中未找到 '" & CFG_DATA_VERSION & "' 标记", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If
    If IsNumeric(versionSeqCell.Offset(-1, 1).Value) Then
        m_OutputVersionSequence = CLng(versionSeqCell.Offset(-1, 1).Value)
    Else
        modErrorHandler.LogError 1051, "控制表中 '" & CFG_DATA_VERSION & "' 标记对应的版本序列号非数字", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If

    ' --- 获取输出版本名称 ---
    Set outputVersionCell = modUtilities.FindNamedRange(controlSheet, CFG_OUTPUT_VERSION)
    If outputVersionCell Is Nothing Then
        modErrorHandler.LogError 1052, "控制表中未找到 '" & CFG_OUTPUT_VERSION & "' 标记", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If
    m_OutputVersionName = Trim(CStr(outputVersionCell.Offset(0, 1).Value))
    If Len(m_OutputVersionName) = 0 Then
        modErrorHandler.LogError 1053, "控制表中 '" & CFG_OUTPUT_VERSION & "' 标记对应的输出版本名称不能为空", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If
     ' 验证输出版本名称是否存在于模板中
    If Not m_TemplateVersions.exists(m_OutputVersionName) Then
         modErrorHandler.LogError 1054, "控制表中指定的输出版本 '" & m_OutputVersionName & "' 在配置设置表的版本模板中未找到", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
         LoadOutputSettings = False
         Exit Function
    End If

    ' --- 获取输出版本号 ---
    Set outputVersionNumCell = modUtilities.FindNamedRange(controlSheet, CFG_OUTPUT_VERSION_NUM)
    If outputVersionNumCell Is Nothing Then
        modErrorHandler.LogError 1055, "控制表中未找到 '" & CFG_OUTPUT_VERSION_NUM & "' 标记", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If
    If IsNumeric(outputVersionNumCell.Offset(0, 1).Value) Then
        m_OutputVersionNumber = CDbl(outputVersionNumCell.Offset(0, 1).Value)
    Else
        modErrorHandler.LogError 1056, "控制表中 '" & CFG_OUTPUT_VERSION_NUM & "' 标记对应的输出版本号非数字", "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
        LoadOutputSettings = False
        Exit Function
    End If

    LoadOutputSettings = True

Finally:
    Set versionSeqCell = Nothing
    Set outputVersionCell = Nothing
    Set outputVersionNumCell = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadOutputSettings", m_DataSourceWorkbook.Name, controlSheet.Name
    LoadOutputSettings = False
    Resume Finally
End Function

'---
' 从表名对照表加载待处理的表格列表
'---
Private Function LoadTableList(mappingSheet As Worksheet) As Boolean
    Dim startCell As Range
    Dim dataRange As Range
    Dim i As Long
    Dim tableData As Variant
    Dim chineseName As String
    Dim englishName As String
    Dim ShouldOutput As Boolean
    Dim versionRange As String

    On Error GoTo CatchError

    Set startCell = modUtilities.FindNamedRange(mappingSheet, CFG_OUTPUT_CONTROL)
    If startCell Is Nothing Then
        modErrorHandler.LogError 1060, "表名对照表中未找到 '" & CFG_OUTPUT_CONTROL & "' 标记", "clsConfig.LoadTableList", m_DataSourceWorkbook.Name, mappingSheet.Name
        LoadTableList = False
        Exit Function
    End If

    Set dataRange = startCell.CurrentRegion
    If dataRange.Rows.Count <= 1 Then
        LoadTableList = True ' 没有数据也算成功
        Exit Function
    End If
    tableData = dataRange.Offset(1, 0).Resize(dataRange.Rows.Count - 1, dataRange.Columns.Count).Value

    m_TablesToProcess.RemoveAll ' 清空现有数据

    For i = 1 To UBound(tableData, 1)
        versionRange = Trim(CStr(tableData(i, 1))) ' 版本区间 (第1列)
        If Len(versionRange) > 0 Then ' 假设第一列是版本区间，不为空则处理
            chineseName = Trim(CStr(tableData(i, 2))) ' 中文名 (第2列)
            If Len(chineseName) = 0 Then
                modErrorHandler.LogError 1061, "表名对照表第 " & i + startCell.Row & " 行中文表名为空", "clsConfig.LoadTableList", m_DataSourceWorkbook.Name, mappingSheet.Name
                'Continue For ' 跳过此行
            End If
            englishName = Trim(CStr(tableData(i, 3))) ' 英文名 (第3列)
            If Len(englishName) = 0 Then
                modErrorHandler.LogError 1062, "表名对照表第 " & i + startCell.Row & " 行英文表名为空 (中文名: " & chineseName & ")", "clsConfig.LoadTableList", m_DataSourceWorkbook.Name, mappingSheet.Name
                'Continue For ' 跳过此行
            End If
            ShouldOutput = CBool(tableData(i, 4))   ' 是否输出 (第4列)

            If Not m_TablesToProcess.exists(chineseName) Then
                ' 使用数组存储: 英文名, 是否默认输出, 版本区间字符串
                m_TablesToProcess.Add chineseName, Array(englishName, ShouldOutput, versionRange)
            Else
                modErrorHandler.LogError 1063, "表名对照表中发现重复的中文表名: '" & chineseName & "'", "clsConfig.LoadTableList", m_DataSourceWorkbook.Name, mappingSheet.Name
            End If
        Else
             Exit For '遇到空行则停止 (根据第一列判断)
        End If
    Next i

    LoadTableList = True

Finally:
    Set startCell = Nothing
    Set dataRange = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadTableList", m_DataSourceWorkbook.Name, mappingSheet.Name
    LoadTableList = False
    Resume Finally
End Function

'---
' 从配置设置表加载Git相关设置
'---
Private Function LoadGitSettings(settingsSheet As Worksheet) As Boolean
    Dim commitLogCell As Range
    On Error GoTo CatchError

    Set commitLogCell = modUtilities.FindNamedRange(settingsSheet, CFG_GIT_COMMIT_LOG)
    If commitLogCell Is Nothing Then
        modErrorHandler.LogError 1070, "配置设置表中未找到 '" & CFG_GIT_COMMIT_LOG & "' 标记", "clsConfig.LoadGitSettings", m_DataSourceWorkbook.Name, settingsSheet.Name
        LoadGitSettings = False
        Exit Function
    End If

    m_GitCommitMessageTemplate = Trim(CStr(commitLogCell.Offset(1, 0).Value)) ' 假设模板在标记下一行

    LoadGitSettings = True

Finally:
    Set commitLogCell = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadGitSettings", m_DataSourceWorkbook.Name, settingsSheet.Name
    LoadGitSettings = False
    Resume Finally
End Function

'---
' 从配置设置表设置各种开关
'---
Private Function LoadConfigSwitch(settingsSheet As Worksheet) As Boolean
    
    Dim switchCell As Range
    On Error GoTo CatchError
    
    Set switchCell = modUtilities.FindNamedRange(settingsSheet, SHOW_RESOURCE_POPUP)
    If switchCell Is Nothing Then
        modErrorHandler.LogError 1070, "配置设置表中未找到 '" & SHOW_RESOURCE_POPUP & "' 标记", "clsConfig.LoadConfigSwitch", m_DataSourceWorkbook.Name, settingsSheet.Name
        LoadConfigSwitch = False
        m_IsShowResource = False
        Exit Function
    End If
    m_IsShowResource = switchCell.Offset(0, 1).Value
    
    LoadConfigSwitch = True
    
Finally:
    Set switchCell = Nothing
    Exit Function
    
CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsConfig.LoadConfigSwitch", m_DataSourceWorkbook.Name, settingsSheet.Name
    switchCell = False
    Resume Finally
    
End Function



'---
' 根据加载的输出版本和版本模板，确定当前输出所需的线路字段列表
'---
Private Sub DetermineOutputLineFields()
    Dim versionInfo As Variant
    Dim linesCollection As Collection
    Dim lineIndex As Variant
    Dim lineField As Variant

    ' 清空旧列表
    Set m_OutputLineFields = New Collection

    If m_TemplateVersions.exists(m_OutputVersionName) Then
        versionInfo = m_TemplateVersions(m_OutputVersionName) ' 获取版本信息数组
        Set linesCollection = versionInfo(1) ' 第二个元素是线路名称集合

        ' 遍历此版本需要的线路名称
        For Each lineIndex In linesCollection
            ' 在线路模板字典中查找对应的线路字段 (roads_x)
            ' 注意：这里假设 TemplateLines 的 Key 是字段名 (roads_x)，Value 是备注
            ' 而 VersionTemplates 中的线路列表存储的是备注。需要反向查找或调整数据结构。
            ' **修改假设：假设 VersionTemplates 的线路列表直接存储字段名 (roads_x)**
             If m_TemplateLines.exists(lineIndex) Then  ' 检查线路字段是否在总列表中定义过
                m_OutputLineFields.Add m_TemplateLines(lineIndex) ' 添加线路字段到输出列表
             Else
                  modErrorHandler.LogError 1080, "版本 '" & m_OutputVersionName & "' 配置的线路 '" & lineIndex & "' 在线路模板中未定义", "clsConfig.DetermineOutputLineFields"
             End If

            ' ---- 如果 VersionTemplates 存的是备注，需要反查 ----
            ' Dim foundField As Boolean: foundField = False
            ' For Each lineField In m_TemplateLines.Keys
            '     If m_TemplateLines(lineField) = lineName Then ' 如果备注匹配
            '         m_OutputLineFields.Add lineField
            '         foundField = True
            '         Exit For
            '     End If
            ' Next lineField
            ' If Not foundField Then
            '      modErrorHandler.LogError 1080, "版本 '" & m_OutputVersionName & "' 配置的线路备注 '" & lineName & "' 无法找到对应的线路字段", "clsConfig.DetermineOutputLineFields"
            ' End If
            ' ---- End 反查逻辑 ----

        Next lineIndex
    Else
        ' 这个错误理论上在 LoadOutputSettings 中已经检查过了
        modErrorHandler.LogError 1081, "无法确定线路字段，因为输出版本 '" & m_OutputVersionName & "' 的模板信息未加载", "clsConfig.DetermineOutputLineFields"
    End If
End Sub

'---
' 根据加载的配置计算最终的输出目录
'---
Private Sub CalculateOutputDirectory()
    Dim versionInfo As Variant
    Dim dirTemplate As String
    Dim userName As String

    If m_TemplateVersions.exists(m_OutputVersionName) Then
        versionInfo = m_TemplateVersions(m_OutputVersionName)
        dirTemplate = versionInfo(0) ' 第一个元素是目录模板

        ' 替换模板中的占位符
        ' {0} -> 版本号 (特殊处理，小于3位时加 .0)
        Dim versionString As String
        If Len(CStr(m_OutputVersionNumber)) < 3 And InStr(CStr(m_OutputVersionNumber), ".") = 0 Then ' 例如版本号是 3, 12
             versionString = m_OutputVersionNumber & ".0"
        Else ' 例如版本号是 3.5, 12.1
             versionString = CStr(m_OutputVersionNumber)
        End If
        dirTemplate = Replace(dirTemplate, "{0}", versionString)

        ' {1} -> 当前用户名
        userName = Environ("username")
        dirTemplate = Replace(dirTemplate, "{1}", userName)

        m_OutputDirectory = dirTemplate
    Else
        modErrorHandler.LogError 1090, "无法计算输出目录，因为输出版本 '" & m_OutputVersionName & "' 的模板信息未加载", "clsConfig.CalculateOutputDirectory"
        m_OutputDirectory = "" ' 设置为空目录，后续步骤会检查
    End If
End Sub




