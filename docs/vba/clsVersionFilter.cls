VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsVersionFilter"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
'====================================================================================================
' 类模块: clsVersionFilter
' 作  用: 封装版本号解析和基于版本/线路的筛选逻辑。
'====================================================================================================
Option Explicit

' --- 常量定义 ---
Private Const DEFAULT_MAX_VERSION As Double = 99 ' 省略最大版本时的默认值

' --- 私有成员变量 ---
Private m_TargetVersionNumber As Double     ' 当前导出任务的目标版本号
Private m_TargetLineFields As Collection    ' 当前导出任务需要包含的线路字段名 (Collection of Strings)

'====================================================================================================
' 初始化和清理
'====================================================================================================

Private Sub Class_Initialize()
    ' 创建集合对象
    Set m_TargetLineFields = New Collection
End Sub

Private Sub Class_Terminate()
    ' 释放对象引用
    Set m_TargetLineFields = Nothing

End Sub

'====================================================================================================
' 公共方法
'====================================================================================================

'---
' 初始化版本筛选器
'---
Public Sub Initialize(targetVersion As Double, targetLines As Collection)
    m_TargetVersionNumber = targetVersion
    Set m_TargetLineFields = targetLines ' 直接引用传入的 Collection
End Sub

'---
' 检查目标版本号是否在给定的版本区间字符串内
'---
Public Function IsVersionInRange(versionRangeString As String) As Boolean
    Dim parsedRange As Variant
    Dim minVersion As Double
    Dim maxVersion As Double

    On Error GoTo CatchError ' 处理 ParseVersionRangeString 可能引发的错误

    parsedRange = ParseVersionRangeString(versionRangeString)

    If IsNull(parsedRange) Or IsEmpty(parsedRange) Then
        IsVersionInRange = False ' 解析失败则认为不在区间内
    Else
        minVersion = CDbl(parsedRange(0))
        maxVersion = CDbl(parsedRange(1))
        IsVersionInRange = (m_TargetVersionNumber >= minVersion And m_TargetVersionNumber < maxVersion)
    End If

Finally:
    Exit Function

CatchError:
    ' 记录解析或比较中发生的错误，但函数仍返回 False
    modErrorHandler.LogError Err.Number, "检查版本区间时出错: " & Err.Description, "clsVersionFilter.IsVersionInRange", , , "输入: '" & versionRangeString & "'"
    IsVersionInRange = False
    Resume Finally
End Function

'---
' 比较两个版本区间字符串是否代表相同的数值范围
'---
Public Function AreVersionRangesEqual(rangeString1 As String, rangeString2 As String) As Boolean
    Dim parsedRange1 As Variant, parsedRange2 As Variant

    On Error GoTo CatchError ' 处理解析错误

    parsedRange1 = ParseVersionRangeString(rangeString1)
    parsedRange2 = ParseVersionRangeString(rangeString2)

    ' 如果任一解析失败，则认为不相等
    If IsNull(parsedRange1) Or IsEmpty(parsedRange1) Or IsNull(parsedRange2) Or IsEmpty(parsedRange2) Then
        AreVersionRangesEqual = False
    Else
        ' 比较解析出的最小值和最大值
        AreVersionRangesEqual = (CDbl(parsedRange1(0)) = CDbl(parsedRange2(0)) And CDbl(parsedRange1(1)) = CDbl(parsedRange2(1)))
    End If

Finally:
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "比较版本区间时出错: " & Err.Description, "clsVersionFilter.AreVersionRangesEqual", , , "输入: '" & rangeString1 & "', '" & rangeString2 & "'"
    AreVersionRangesEqual = False
    Resume Finally
End Function

'====================================================================================================
' 私有辅助方法
'====================================================================================================

'---
' 解析版本区间字符串，返回包含最小值和最大值的数组 Array(min, max)
' 如果解析失败，返回 Null
' 支持格式: "1.0", "1.0~2.5", "~2.5", "1.0~", "" (视为 0~0 或 0~DefaultMax?)
'---
Private Function ParseVersionRangeString(versionRangeString As String) As Variant
    Dim parts() As String
    Dim minStr As String, maxStr As String
    Dim minVersion As Double, maxVersion As Double
    Dim tildePos As Integer

    On Error GoTo CatchError

    ParseVersionRangeString = Null ' 默认返回值
    versionRangeString = Trim(versionRangeString)

    If versionRangeString = "" Then
        ' 空字符串处理：可以视为 0 ~ 0.1 默认不导出
        minVersion = 0
        'maxVersion = DEFAULT_MAX_VERSION
        maxVersion = 0.1
        ParseVersionRangeString = Array(minVersion, maxVersion)
        Exit Function
    End If

    tildePos = InStr(versionRangeString, "~")

    If tildePos = 0 Then
        ' 情况1：无~符号 (如 "3.5a" → 解析为 "3.5a" ~ DEFAULT_MAX)
        minStr = versionRangeString
        maxStr = CStr(DEFAULT_MAX_VERSION)
    Else
        ' 情况2：有~符号
        minStr = Trim(Left(versionRangeString, tildePos - 1))
        maxStr = Trim(Mid(versionRangeString, tildePos + 1))

        ' 处理省略情况
        If minStr = "" And maxStr = "" Then
             Err.Raise 1002, "ParseVersionRangeString", "不能同时省略最低和最高版本 (~)"
        ElseIf minStr = "" Then
             minStr = "0" ' ~2.5 解析为 0~2.5
        ElseIf maxStr = "" Then
             maxStr = CStr(DEFAULT_MAX_VERSION) ' 1.0~ 解析为 1.0~DefaultMax
        End If
    End If

    ' 提取数字部分并验证格式
    If Not IsValidVersion(minStr) Or Not IsValidVersion(maxStr) Then
        Err.Raise 1003, "ParseVersionRangeString", "版本号格式无效: '" & minStr & "' 或 '" & maxStr & "'"
    End If

    minVersion = GetNumericPart(minStr)
    maxVersion = GetNumericPart(maxStr)

    ' 验证范围有效性
    If minVersion > maxVersion Then
        Err.Raise 1004, "ParseVersionRangeString", "最低版本 (" & minVersion & ") 不能高于最高版本 (" & maxVersion & ")"
    End If

    ' 返回包含最小值和最大值的数组
    ParseVersionRangeString = Array(minVersion, maxVersion)

Finally:
    Exit Function

CatchError:
    modErrorHandler.LogError Err.Number, "版本区间解析失败: " & Err.Description, "clsVersionFilter.ParseVersionRangeString", , , "输入: '" & versionRangeString & "'"
    ParseVersionRangeString = Null ' 确保出错时返回 Null
    Resume Finally
End Function

'---
' 辅助函数：从版本字符串中提取数字部分 (忽略末尾的字母)
' 例如："3.5a" -> 3.5, "12" -> 12, "2.0" -> 2.0
'---
Private Function GetNumericPart(versionStr As String) As Double
    Dim i As Integer
    Dim numStr As String

    numStr = ""
    For i = 1 To Len(versionStr)
        Dim char As String
        char = Mid(versionStr, i, 1)
        If IsNumeric(char) Or char = "." Then
             numStr = numStr & char
        Else
             Exit For '遇到非数字非小数点则停止
        End If
    Next i

    ' 尝试转换为 Double，处理可能的错误
    On Error Resume Next
    GetNumericPart = CDbl(numStr)
    If Err.Number <> 0 Then
         GetNumericPart = 0 ' 转换失败返回 0
         modErrorHandler.LogError Err.Number, "无法将 '" & numStr & "' 转换为数字", "clsVersionFilter.GetNumericPart"
    End If
    On Error GoTo 0
End Function

'---
' 辅助函数：验证版本字符串的基本格式 (数字 + 可选小数点 + 可选末尾字母)
' 使用简化检查，不使用正则表达式以提高兼容性
'---
Private Function IsValidVersion(versionStr As String) As Boolean
    Dim i As Integer
    Dim hasDecimal As Boolean: hasDecimal = False
    Dim hasLetter As Boolean: hasLetter = False
    Dim digitEncountered As Boolean: digitEncountered = False

    IsValidVersion = False ' Default to false
    If Len(versionStr) = 0 Then Exit Function ' Empty string is invalid

    For i = 1 To Len(versionStr)
        Dim char As String: char = Mid(versionStr, i, 1)

        If IsNumeric(char) Then
            digitEncountered = True
            If hasLetter Then Exit Function ' 数字不能出现在字母之后
        ElseIf char = "." Then
            If hasDecimal Or hasLetter Then Exit Function ' 不能有多个小数点，或小数点在字母后
            hasDecimal = True
        ElseIf char Like "[a-zA-Z]" Then
             If hasLetter Then Exit Function ' 只允许最多一个字母在末尾
             If Not digitEncountered Then Exit Function ' 字母前必须有数字
             hasLetter = True
        Else
             Exit Function ' 其他任何字符都是无效的
        End If
    Next i

    ' 必须至少包含一个数字
    If Not digitEncountered Then Exit Function

    IsValidVersion = True ' All checks passed
End Function





