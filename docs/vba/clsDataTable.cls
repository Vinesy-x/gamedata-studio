VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsDataTable"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'====================================================================================================
' 类模块: clsDataTable
' 作  用: 代表一个需要处理（筛选、输出）的 Excel 数据表。封装单个表的加载、筛选、比较和输出逻辑。
'====================================================================================================
Option Explicit

' --- 私有成员变量 ---
Private m_ChineseName As String             ' 表格中文名 (用于查找源数据)
Private m_EnglishName As String             ' 表格英文名 (用于输出文件名和 AllTables 表名)
Private m_VersionRangeString As String      ' 表格定义的版本区间字符串
Private m_ShouldOutputByDefault As Boolean  ' 配置中是否标记为默认输出

Private m_Config As clsConfig               ' 配置对象的引用
Private m_VersionFilter As clsVersionFilter ' 版本筛选器对象的引用

Private m_RawData As Variant                ' 从源表格读取的原始数据 (配置区域)
Private m_FilteredData As Variant           ' 经过筛选后的数据
Private m_FilteredRowCount As Long          ' 筛选后数据的实际行数
Private m_FilteredColCount As Long          ' 筛选后数据的实际列数

Private m_HasVersionRowFilter As Boolean    ' 标记该表是否有行版本控制字段
Private m_VersionRowData As Variant         ' 版本控制的行区域
Private m_HasVersionColFilter As Boolean    ' 标记该表是否有列版本控制字段
Private m_VersionColData As Variant         ' 版本控制的列区域

Private m_IsModified As Boolean             ' 标记与 "全部表" 中的数据相比是否有变化
Private m_ShouldOutput As Boolean           ' 标记该表本次是否需要输出 (基于筛选结果和配置)

'====================================================================================================
' 初始化和清理
'====================================================================================================

Private Sub Class_Initialize()
    ' 初始化标志位
    m_HasVersionRowFilter = False
    m_HasVersionColFilter = False
    m_IsModified = False
    m_ShouldOutput = False
    m_FilteredRowCount = 0
    m_FilteredColCount = 0
End Sub

Private Sub Class_Terminate()
    ' 释放对象引用 (数组变量会自动释放)
    Set m_Config = Nothing
    Set m_VersionFilter = Nothing
    
End Sub

'====================================================================================================
' 公共属性 (只读 Get)
'====================================================================================================
Public Property Get chineseName() As String
    chineseName = m_ChineseName
End Property

Public Property Get englishName() As String
    englishName = m_EnglishName
End Property

Public Property Get IsModified() As Boolean
    IsModified = m_IsModified
End Property

Public Property Get ShouldOutput() As Boolean
    ShouldOutput = m_ShouldOutput
End Property

Public Property Get FilteredRowCount() As Long
    FilteredRowCount = m_FilteredRowCount
End Property

Public Property Get FilteredColCount() As Long
    FilteredColCount = m_FilteredColCount
End Property

Public Property Get OutputFilePath() As String
    ' 根据 Config 的输出目录和英文名计算
    If Not m_Config Is Nothing And Len(m_EnglishName) > 0 Then
         OutputFilePath = m_Config.OutputDirectory & "\" & m_EnglishName & ".xlsx"
    Else
         OutputFilePath = ""
    End If
End Property


'====================================================================================================
' 公共方法
'====================================================================================================

'---
' 初始化数据表对象
'---
Public Sub InitializeFromMemory(chineseName As String, englishName As String, _
                              rawDataSourceArray As Variant, versionRowArray As Variant, versionColArray As Variant, _
                              hasRowFlag As Boolean, hasColFlag As Boolean, _
                              config As clsConfig, filter As clsVersionFilter)

    m_ChineseName = chineseName
    m_EnglishName = englishName
    m_RawData = rawDataSourceArray ' 直接赋值数组
    m_VersionRowData = versionRowArray
    m_VersionColData = versionColArray
    m_HasVersionRowFilter = hasRowFlag ' 使用传入的标志
    m_HasVersionColFilter = hasColFlag

    Set m_Config = config
    Set m_VersionFilter = filter

    ' 重置状态
    m_IsModified = False
    m_ShouldOutput = False
    m_FilteredRowCount = 0
    m_FilteredColCount = 0
    'Erase m_FilteredData ' 清空可能存在的旧数据
End Sub

'---
' 处理单个表格的主方法: 加载、筛选、比较、输出
' 返回值: Boolean - 表示处理过程中是否发生严重错误 (True=无严重错误, False=有严重错误)
'---
Public Function Process(allTablesWb As Workbook) As Boolean
    Dim success As Boolean
    success = True ' 默认成功

    On Error GoTo CatchError

    ' 检查初始化是否完成 (特别是 SourceSheet 是否找到)
'    If m_SourceSheet Is Nothing Then
'        modErrorHandler.LogError 2001, "无法找到源工作表: '" & m_ChineseName & "'", "clsDataTable.Process", m_SourceWorkbook.Name
'        success = False
'        GoTo Finally ' 源表不存在，无法继续
'    End If
    If m_Config Is Nothing Or m_VersionFilter Is Nothing Then
         modErrorHandler.LogError 2002, "DataTable 对象未正确初始化 (缺少依赖)", "clsDataTable.Process", , m_ChineseName
         success = False
         GoTo Finally
    End If

'    ' 1. 加载原始数据
'    If Not LoadRawData() Then
'        success = False ' 加载失败，后续无法进行
'        GoTo Finally
'    End If
'
'    ' 2. 确定是否存在版本筛选字段
'    DetermineFilterPresence ' 这个步骤相对简单，不影响后续流程，即使失败也继续

    ' 3. 应用筛选逻辑 (核心步骤)
    If Not ApplyFilters() Then
        success = False ' 筛选失败，后续无法进行
        GoTo Finally
    End If

    ' 4. 比较并输出 (仅当筛选后需要输出时执行)
    If m_ShouldOutput Then
        If Not CompareAndWriteOutput(allTablesWb) Then
            success = False ' 输出步骤失败
            ' 注意：即使输出失败，筛选可能已成功，根据需求决定是否仍返回 True
        End If
    Else
         If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_ChineseName & "' 筛选后无需输出."
    End If


Finally:
    Process = success ' 返回处理结果
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsDataTable.Process", , m_ChineseName
    success = False
    Resume Finally
End Function


'---
' 应用筛选逻辑，将结果存入 m_FilteredData
'---
Private Function ApplyFilters() As Boolean
    Dim rawRows As Long, rawCols As Long
    Dim filterRows As Long, filterCols As Long ' 筛选后的行列计数器
    Dim i As Long, j As Long, k As Long      ' 循环变量
    Dim includeRow As Boolean, includeCol As Boolean
    Dim rowVersionData As Range ' 需要获取源表中版本行信息对应的 Range 或数据
    Dim colVersionData As Range ' 需要获取源表中版本列信息对应的 Range 或数据
    Dim tempFilteredData() As Variant ' 临时数组存储筛选结果
    Dim outputLines As Collection: Set outputLines = m_Config.OutputLineFields ' 需要输出的线路字段
    Dim addLineCols As Boolean: addLineCols = (outputLines.Count > 1 And m_HasVersionRowFilter) ' 是否需要添加线路列
    Dim lineColOffset As Long: lineColOffset = 0 ' 线路列的起始偏移

    On Error GoTo CatchError
    
    If IsEmpty(m_RawData) Then
        modErrorHandler.LogError 2301, "原始数据为空，无法执行筛选", "clsDataTable.ApplyFilters", , m_ChineseName
        ApplyFilters = False
        Exit Function
    End If

    rawRows = UBound(m_RawData, 1)
    rawCols = UBound(m_RawData, 2)

    ' --- 获取版本筛选所需的数据范围 (这是难点，需要根据实际表结构定位) ---
    ' 假设 version_r/version_c 标记单元格确定了版本控制数据的起始位置
'    Dim rowVersionStartCell As Range, colVersionStartCell As Range
'    If m_HasVersionRowFilter Then Set rowVersionStartCell = modUtilities.FindNamedRange(m_SourceSheet, m_Config.VersionRowFilterField)
'    If m_HasVersionColFilter Then Set colVersionStartCell = modUtilities.FindNamedRange(m_SourceSheet, m_Config.VersionColFilterField)

    ' 预估筛选后的最大尺寸来初始化临时数组
    ' 如果需要添加线路列，列数增加
    If addLineCols Then lineColOffset = outputLines.Count
    ReDim tempFilteredData(1 To rawRows, 1 To rawCols + lineColOffset)

    Dim keepRowFlags() As Boolean ' 标记哪些原始行需要保留
    ReDim keepRowFlags(1 To rawRows)
    filterRows = 0 ' 重置筛选后的行计数器

    ' --- 第一遍：筛选行 ---
    For i = 1 To rawRows
        includeRow = True ' 默认包含

        ' --- 行版本检查 ---
        If m_HasVersionRowFilter And i > 2 Then ' 假设第一行和第二行总是包含（表头）
             If Not m_VersionFilter.IsVersionInRange(CStr(m_VersionRowData(i, 1))) Then
                  includeRow = False ' 无法判断，则不包含
             Else
                  
                  Dim filterResult As Integer, verCurrent As String
                  
                  filterResult = 0
                  '对每一条线路进行分析，结果叠加，只要有一条线路可输出，则可输出
                  For j = 1 To outputLines.Count
                    For k = 2 To UBound(m_VersionRowData, 2)
                        If m_VersionRowData(1, k) = outputLines(j) Then
                            verCurrent = m_VersionRowData(i, k)
                            If verCurrent = "1" Then
                                filterResult = filterResult + 1
                                
                            ElseIf m_VersionFilter.IsVersionInRange(verCurrent) Then
                                '-------判定是否在版本号内
                                filterResult = filterResult + 1
                            End If
                            Exit For
                        End If
                    Next
                    
                    If filterResult = 0 Then
                        includeRow = False
                    End If
                  Next

             End If
        End If
        
        keepRowFlags(i) = includeRow
        If includeRow Then filterRows = filterRows + 1 ' 统计有效行数
    Next i

    ' 如果筛选后行数为0 (或只有表头)，则无需继续
    If filterRows <= 1 And rawRows > 1 Then ' 假设表头总是保留
         m_ShouldOutput = False
         ApplyFilters = True ' 筛选本身算成功，只是结果为空
         If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_ChineseName & "' 筛选后无有效数据行."
         Exit Function
    End If


    Dim keepColFlags() As Boolean ' 标记哪些原始列需要保留
    ReDim keepColFlags(1 To rawCols)
    filterCols = 0 ' 重置筛选后的列计数器

    ' --- 第二遍：筛选列 ---
    For i = 1 To rawCols
        includeCol = True ' 默认包含

        ' --- 列版本检查 ---
        If m_HasVersionColFilter Then
            If Not m_VersionFilter.IsVersionInRange(CStr(m_VersionColData(1, i + 1))) Then
                 includeCol = False
            ElseIf UBound(m_VersionColData, 1) > 1 Then
                
                filterResult = 0
                '对每一条线路进行分析，结果叠加，只要有一条线路可输出，则可输出
                For j = 1 To outputLines.Count
                  For k = 2 To UBound(m_VersionColData, 1)
                      If m_VersionColData(k, 1) = outputLines(j) Then
                          verCurrent = m_VersionColData(k, i + 1)
                          If verCurrent = "1" Then
                              filterResult = filterResult + 1
                              
                          ElseIf m_VersionFilter.IsVersionInRange(verCurrent) Then
                              '-------判定是否在版本号内
                              filterResult = filterResult + 1
                          End If
                          Exit For
                      End If
                  Next
                  
                  If filterResult = 0 Then
                      includeRow = False
                  End If
                Next
            End If
        End If

         ' --- 其他列筛选条件 ---
         ' If includeCol Then ...

        keepColFlags(i) = includeCol
        If includeCol Then filterCols = filterCols + 1 ' 统计有效列数
    Next i

    ' 如果筛选后列数为0，则无需继续
    If filterCols = 0 Then
         m_ShouldOutput = False
         ApplyFilters = True
         If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_ChineseName & "' 筛选后无有效数据列."
         Exit Function
    End If

    ' --- 填充筛选后的数据到最终数组 ---
    m_FilteredRowCount = filterRows
    m_FilteredColCount = filterCols + lineColOffset ' 加上可能的线路列
    If m_FilteredRowCount = 0 Or m_FilteredColCount = 0 Then
         m_ShouldOutput = False ' 最终无数据
         ApplyFilters = True
         Exit Function
    End If

    ReDim m_FilteredData(1 To m_FilteredRowCount, 1 To m_FilteredColCount) ' 精确调整最终数组大小

    Dim currentRow As Long: currentRow = 0
    For i = 1 To rawRows
        If keepRowFlags(i) Then ' 如果此行需要保留
            currentRow = currentRow + 1
            Dim currentCol As Long: currentCol = 0
            ' 填充数据列
            For j = 1 To rawCols
                If keepColFlags(j) Then ' 如果此列需要保留
                    currentCol = currentCol + 1
                    ' --- 数据清理或转换 ---
                    If IsError(m_RawData(i, j)) Then
                         m_FilteredData(currentRow, currentCol) = "#N/A" ' 或空字符串，或记录错误
                         modErrorHandler.LogError 0, "发现错误值", "clsDataTable.ApplyFilters", , m_ChineseName, "位置: 原始行 " & i & ", 原始列 " & j
                    ElseIf IsEmpty(m_RawData(i, j)) Then
                         m_FilteredData(currentRow, currentCol) = "" ' 空值处理
                    Else
                         m_FilteredData(currentRow, currentCol) = m_RawData(i, j)
                    End If
                End If
            Next j

            ' 填充线路列 (如果需要，一般情况下不会设计到，同版本下不同的表内容，暂时先注释掉)
'            If addLineCols And i > 1 Then ' 假设线路信息对表头无效
'                 If m_HasVersionRowFilter Then
'                    ' 获取当前行的线路信息 (需要精确逻辑)
'                    Dim versionRowRange As Range ' 复用之前的逻辑获取版本行范围
'                    Set versionRowRange = Intersect(m_SourceSheet.Rows(i), rowVersionStartCell.CurrentRegion)
'
'                    If versionRowRange Is Nothing Then
'                        For k = 1 To outputLines.Count
'                             m_FilteredData(currentRow, filterCols + k) = 0 ' 获取失败填0
'                        Next k
'                    Else
'                        For k = 1 To outputLines.Count
'                             Dim targetLineField As String: targetLineField = outputLines(k)
'                             Dim lineValue As Variant
'                             ' 在 versionRowRange 中查找 targetLineField 列的值
'                             lineValue = GetValueForLine(versionRowRange, targetLineField) ' 需要实现 GetValueForLine 辅助函数
'                             If IsError(lineValue) Or IsEmpty(lineValue) Or lineValue = "" Then
'                                  m_FilteredData(currentRow, filterCols + k) = 0 ' 无效值填0
'                             Else
'                                  m_FilteredData(currentRow, filterCols + k) = lineValue ' 填充找到的值 (通常是 1 或 0)
'                             End If
'                        Next k
'                    End If
'                 End If
'            ElseIf addLineCols And i = 1 Then ' 表头行
'                 ' 填充线路列的表头 (线路字段名)
'                 For k = 1 To outputLines.Count
'                      m_FilteredData(currentRow, filterCols + k) = outputLines(k)
'                 Next k
'            End If
        End If
    Next i

    ' --- 处理重复 Key (原始代码逻辑) ---
    ' 遍历筛选后的数据，如果 key (第一列) 与上一行相同，则认为重复，移除上一行？
    ' 这个逻辑在筛选后执行可能更准确
    If m_FilteredRowCount > 1 Then ' 至少需要两行才能比较
         Dim finalRowCount As Long: finalRowCount = 1 ' 保留表头
         Dim finalData() As String
         ReDim finalData(1 To m_FilteredRowCount, 1 To m_FilteredColCount)

         ' 复制表头
         For j = 1 To m_FilteredColCount
              finalData(1, j) = m_FilteredData(1, j)
         Next j

         ' 比较数据行
         For i = 2 To m_FilteredRowCount
              If m_FilteredData(i, 1) <> m_FilteredData(i - 1, 1) Then ' Key 不同则保留
                   finalRowCount = finalRowCount + 1
                   For j = 1 To m_FilteredColCount
                        finalData(finalRowCount, j) = m_FilteredData(i, j)
                   Next j
              Else
                   ' Key 相同，则用当前行覆盖上一行 (在 finalData 中)
                   For j = 1 To m_FilteredColCount
                        finalData(finalRowCount, j) = m_FilteredData(i, j) ' finalRowCount 指向的是上一行刚复制的位置
                   Next j
                   If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_ChineseName & "' 发现重复Key并覆盖: " & m_FilteredData(i, 1)
              End If
         Next i

         ' 调整最终数组大小并替换
         m_FilteredRowCount = finalRowCount
         'ReDim Preserve finalData(1 To m_FilteredRowCount, 1 To m_FilteredColCount)
         m_FilteredData = finalData
    End If

    m_ShouldOutput = (m_FilteredRowCount > 0 And m_FilteredColCount > 0) ' 最终决定是否输出
    ApplyFilters = True ' 筛选过程完成

Finally:
    Set outputLines = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsDataTable.ApplyFilters", , m_ChineseName
    m_ShouldOutput = False
    ApplyFilters = False
    Resume Finally
End Function


'---
' 辅助函数：在给定的 Range (通常是一行) 中查找特定线路字段列的值
'---
Private Function GetValueForLine(dataRowRange As Range, lineField As String) As Variant
    Dim headerRowRange As Range
    Dim lineCol As Range
    Dim colIndex As Long

    GetValueForLine = CVErr(xlErrNA) ' 默认返回错误

    If dataRowRange Is Nothing Then Exit Function

    ' 假设表头在 dataRowRange 的第一行 (这依赖于版本数据的结构)
    ' 或者需要传入表头行的 Range
    ' 简化：再次查找字段名确定列？这效率低。
    ' 假设：我们能拿到整个版本数据区的 Range，并且知道表头是第一行
    ' Set headerRowRange = dataRowRange.Parent.Range("...") ' 需要精确的表头范围

    ' 临时方法：在 dataRowRange 的第一行（假设是表头）查找 lineField
    On Error Resume Next ' 查找失败则返回 #N/A
    colIndex = Application.Match(lineField, dataRowRange.Rows(1), 0)
    On Error GoTo 0

    If IsNumeric(colIndex) Then
        ' 如果找到列，返回该列在 dataRowRange 中的值 (假设 dataRowRange 包含数据行)
        ' 如果 dataRowRange 仅包含一行，则直接取值
        If dataRowRange.Rows.Count = 1 Then
             GetValueForLine = dataRowRange.Cells(1, colIndex).Value
        Else
             ' 需要确定是哪一行的数据，假设是 dataRowRange 的最后一行？
             ' 这个逻辑依赖于 ApplyFilters 如何确定 versionRowRange
             GetValueForLine = dataRowRange.Cells(dataRowRange.Rows.Count, colIndex).Value ' 假设取最后一行对应的值
        End If
    End If
End Function


'---
' 比较筛选后的数据与 AllTablesWorkbook 中的数据，并执行输出
'---
Private Function CompareAndWriteOutput(allTablesWb As Workbook) As Boolean
    Dim targetSheet As Worksheet
    Dim oldData As Variant
    Dim oldRowCount As Long, oldColCount As Long
    Dim areDifferent As Boolean: areDifferent = False
    Dim i As Long, j As Long

    On Error GoTo CatchError
    
    ' 获取 AllTablesWorkbook 中的目标工作表
    Set targetSheet = modUtilities.GetWorksheetSafe(allTablesWb, m_EnglishName)

    If targetSheet Is Nothing Then
        ' 工作表不存在，说明是新增的，需要输出
        areDifferent = True
        If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_EnglishName & "' 在 AllTables 中不存在, 判定为变更."
    Else
        ' 工作表存在，获取旧数据进行比较
        If targetSheet.Range("A1").Value = "" Then
            oldRowCount = 0
            oldColCount = 0
        Else
            With targetSheet.Range("A1").CurrentRegion
                If .Cells.Count > 1 Then
                    oldData = .Value
                Else ' 单单元格处理
                    ReDim oldData(1 To 1, 1 To 1)
                    oldData(1, 1) = .Value
                End If
                oldRowCount = .Rows.Count
                oldColCount = .Columns.Count
            End With
        End If

        ' 比较维度
        If oldRowCount <> m_FilteredRowCount Or oldColCount <> m_FilteredColCount Then
            areDifferent = True
             If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_EnglishName & "' 维度发生变化, 判定为变更."
        Else
            ' 维度相同，逐个单元格比较
            ' 特殊处理 GameConfig，总是认为有变动 (根据原逻辑)
            If m_EnglishName = "GameConfig" Then
                areDifferent = True
                If m_Config.IsDebugMode Then Debug.Print "表格 'GameConfig' 总是判定为变更."
            Else
                For i = 1 To m_FilteredRowCount
                     For j = 1 To m_FilteredColCount
                         ' VBA 处理空值和 "" 可能不同，以及类型差异，需要注意比较方式
                         If IsEmpty(m_FilteredData(i, j)) Or m_FilteredData(i, j) = "" Then
                            Err.Raise Number:=vbObjectError + 200, Description:="数据区，第 " & i & "行," & j & "列单元格值为空！"
                            areDifferent = True
                            Exit For ' 找到不同即可退出内层循环
                         ElseIf CStr(m_FilteredData(i, j)) <> CStr(oldData(i, j)) Then
                              areDifferent = True
                              If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_EnglishName & "' 在 (" & i & "," & j & ") 内容发生变化: '" & oldData(i, j) & "' -> '" & m_FilteredData(i, j) & "', 判定为变更."
                              Exit For ' 找到不同即可退出内层循环
                         End If
                     Next j
                     If areDifferent Then Exit For ' 退出外层循环
                 Next i
            End If
        End If
    End If

    ' 如果数据不同或需要强制输出，则执行写入操作
    If areDifferent Then
        m_IsModified = True ' 标记此对象为已修改

        ' 1. 输出到单独文件
        If Not WriteToIndividualFile() Then
             CompareAndWriteOutput = False ' 单独文件写入失败
             Exit Function
        End If
        '---*******记录外部输出日志
        Call LogToFile("写入 Individual File 完成: " & m_EnglishName) ' <<< 新增

        ' 2. 更新 AllTablesWorkbook
        If Not WriteToAllTablesWorkbook(allTablesWb, targetSheet) Then ' 传入 targetSheet 避免再次查找
             CompareAndWriteOutput = False ' 更新 AllTables 失败
             Exit Function
        End If
        '---*******记录外部输出日志
        Call LogToFile("写入 AllTablesWorkbook 完成: " & m_EnglishName) ' <<< 新增
        
    Else
         m_IsModified = False
         If m_Config.IsDebugMode Then Debug.Print "表格 '" & m_EnglishName & "' 与 AllTables 内容一致, 无需重复输出."
    End If

    CompareAndWriteOutput = True ' 所有步骤成功
    '---*******记录外部输出日志
    Call LogToFile("退出 CompareAndWriteOutput (成功): " & m_EnglishName)

Finally:
    Set targetSheet = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsDataTable.CompareAndWriteOutput", , m_ChineseName
    CompareAndWriteOutput = False
    Resume Finally
End Function


'---
' 将筛选后的数据写入单独的 .xlsx 文件
'---
Private Function WriteToIndividualFile() As Boolean
    Dim wbNew As Workbook
    Dim wsNew As Worksheet
    Dim filePath As String

    On Error GoTo CatchError

    filePath = Me.OutputFilePath ' 使用属性获取路径
    If Len(filePath) = 0 Then
         modErrorHandler.LogError 2601, "无法获取有效的输出文件路径", "clsDataTable.WriteToIndividualFile", , m_ChineseName
         WriteToIndividualFile = False
         Exit Function
    End If

    ' 检查目录是否存在 (理论上 ExportJob 会创建好)
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(m_Config.OutputDirectory) Then
         modErrorHandler.LogError 2602, "输出目录不存在: " & m_Config.OutputDirectory, "clsDataTable.WriteToIndividualFile", , m_ChineseName
         WriteToIndividualFile = False
         Exit Function
    End If

    ' --- 清理旧文件 (如果存在) ---
    If fso.FileExists(filePath) Then
        On Error Resume Next ' Kill 失败可能是文件被占用
        Kill filePath
        If Err.Number <> 0 Then
             modErrorHandler.LogError Err.Number, "无法删除旧文件: " & filePath & " (可能被占用)", "clsDataTable.WriteToIndividualFile", , m_ChineseName
             WriteToIndividualFile = False
             Exit Function
        End If
        On Error GoTo CatchError ' 恢复正常错误处理
    End If

    ' --- 创建新工作簿并写入数据 ---
    Application.SheetsInNewWorkbook = 1 ' 确保新工作簿只有一个表
    Set wbNew = Workbooks.Add
    Set wsNew = wbNew.Sheets(1)

    ' --- 特殊处理 GameConfig 版本号注入 ---
    If m_EnglishName = "GameConfig" Then
        ' 假设版本号在第3行第3列 (需要确认!)
        If m_FilteredRowCount >= 3 And m_FilteredColCount >= 3 Then
             Dim versionString As String
             versionString = m_Config.OutputVersionNumber & "." & m_Config.OutputVersionSequence
             ' 直接修改筛选后的数组 m_FilteredData
             m_FilteredData(3, 3) = versionString
             If m_Config.IsDebugMode Then Debug.Print "为 GameConfig 注入版本号: " & versionString
        Else
             modErrorHandler.LogError 2603, "GameConfig 表格行列数不足，无法注入版本号", "clsDataTable.WriteToIndividualFile", , m_ChineseName
        End If
    End If

    ' --- 写入数据到新表 ---
    If m_FilteredRowCount > 0 And m_FilteredColCount > 0 Then
         With wsNew.Range("A1").Resize(m_FilteredRowCount, m_FilteredColCount)
            .NumberFormat = "@"
            .Value = m_FilteredData
            .WrapText = False
         End With
         wsNew.Name = m_ChineseName ' 工作表名用中文名
         ' 可以添加格式设置代码，如列宽自适应等
         ' wsNew.UsedRange.Columns.AutoFit
    Else
          ' 虽然理论上不应该出现，但还是处理一下空数据的情况
         wsNew.Name = m_ChineseName
         wsNew.Range("A1").Value = "'空数据" ' 标记为空
    End If


    ' --- 保存并关闭 ---
    Dim originalAlerts As Boolean
    originalAlerts = Application.DisplayAlerts
    Application.DisplayAlerts = False ' 禁止保存提示

    wbNew.SaveAs filePath
    If Err.Number <> 0 Then ' 捕获保存错误
        Application.DisplayAlerts = originalAlerts
        Err.Raise Err.Number, "clsDataTable.WriteToIndividualFile", "保存文件失败: " & filePath & " (" & Err.Description & ")" ' 重新引发错误
    End If
    wbNew.Close SaveChanges:=False
    Application.DisplayAlerts = originalAlerts

    WriteToIndividualFile = True

Finally:
    Set wsNew = Nothing
    Set wbNew = Nothing
    Set fso = Nothing
    Exit Function

CatchError:
    If Not wbNew Is Nothing Then wbNew.Close SaveChanges:=False ' 确保关闭工作簿
    Application.DisplayAlerts = True ' 恢复提示
    modErrorHandler.LogError Err.Number, Err.Description, "clsDataTable.WriteToIndividualFile", , m_ChineseName
    WriteToIndividualFile = False
    Resume Finally
End Function


'---
' 将筛选后的数据写入 AllTablesWorkbook 的对应工作表
'---
Private Function WriteToAllTablesWorkbook(allTablesWb As Workbook, targetSheet As Worksheet) As Boolean
    On Error GoTo CatchError

    ' 如果传入的 targetSheet 是 Nothing，表示需要创建
    If targetSheet Is Nothing Then
        ' 在第一个工作表之后添加新表
        Set targetSheet = allTablesWb.Worksheets.Add(After:=allTablesWb.Worksheets(1))
        ' 重命名新表 (需要处理重名错误，尽管理论上不应发生)
        On Error Resume Next
        targetSheet.Name = m_EnglishName
        If Err.Number <> 0 Then
             modErrorHandler.LogError Err.Number, "无法将新工作表重命名为 '" & m_EnglishName & "' (可能已存在?)", "clsDataTable.WriteToAllTablesWorkbook", allTablesWb.Name
             On Error GoTo CatchError ' 恢复错误处理
             ' 可以尝试删除已存在的表再重试，或直接返回失败
             WriteToAllTablesWorkbook = False
             Exit Function
        End If
        On Error GoTo CatchError ' 恢复错误处理
    End If

    ' 清理目标工作表旧内容
    targetSheet.Cells.ClearContents

    ' 写入新数据
    If m_FilteredRowCount > 0 And m_FilteredColCount > 0 Then
        With targetSheet.Range("A1").Resize(m_FilteredRowCount, m_FilteredColCount)
            .NumberFormat = "@"
            .Value = m_FilteredData
            .WrapText = False
        End With
    Else
        targetSheet.Range("A1").Value = "'空数据" ' 写入空标记
    End If

    WriteToAllTablesWorkbook = True

Finally:
    Set targetSheet = Nothing
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, Err.Description, "clsDataTable.WriteToAllTablesWorkbook", allTablesWb.Name, m_EnglishName
    WriteToAllTablesWorkbook = False
    Resume Finally
End Function









