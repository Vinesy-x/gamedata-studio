VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsInMemoryTableData"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'===========================================================
' 类模块: clsInMemoryTableData
' 作  用: 存储单个表格在内存中的数据集合
'===========================================================
Option Explicit

Public mainData As Variant          ' 主数据区域 (二维数组)
Public versionRowData As Variant    ' 行版本控制数据 (二维数组, 可能为 Empty)
Public versionColData As Variant    ' 列版本控制数据 (二维数组, 可能为 Empty)
Public HasVersionRowFlag As Boolean ' 是否找到行版本标记
Public HasVersionColFlag As Boolean ' 是否找到列版本标记
Public SourceSheetName As String    ' 源工作表名 (用于日志记录)
