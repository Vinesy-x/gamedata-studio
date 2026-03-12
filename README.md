# GameData Studio

RPG/MMO 游戏数值管理工具 — Excel Add-in

---

## 安装教程

### Mac

**第一步：安装加载项**

打开终端，运行：

```bash
bash -c "$(curl -sL https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-mac.sh)"
```

或手动下载 [`install-mac.sh`](https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-mac.sh) 后运行 `bash install-mac.sh`。

安装完成后重启 Excel。在「开始」选项卡 →「加载项」→「开发人员加载项」中即可看到 GameData Studio。

**第二步：启动文件服务（导出时需要）**

导出功能需要一个本地文件服务来写入磁盘。Mac 自带 Python，无需额外安装：

```bash
curl -sL https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.py -o ~/file-server.py
python3 ~/file-server.py
```

保持终端窗口开着即可。每次导出前确保服务在运行。

---

### Windows

**第一步：安装加载项**

1. 下载 [`install-windows.bat`](https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/install-windows.bat)
2. 双击运行
3. 重启 Excel
4. 在「开始」选项卡 →「加载项」→「开发人员加载项」中看到 GameData Studio

**第二步：启动文件服务（导出时需要）**

导出功能需要一个本地文件服务来写入磁盘。Windows 自带 PowerShell，无需额外安装：

1. 下载以下两个文件到同一目录：
   - [`start-file-server.bat`](https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/start-file-server.bat)
   - [`file-server.ps1`](https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.ps1)
2. 双击 `start-file-server.bat`

保持窗口开着即可。每次导出前确保服务在运行。

---

### 卸载

**Mac：**
```bash
rm ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/manifest.xml
```

**Windows：**
```cmd
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\a1b2c3d4-e5f6-7890-abcd-ef1234567890" /f
```

---

## 使用说明

1. 打开 Excel，点击「加载项」→ 选择 GameData Studio
2. 首次使用点击「初始化工作簿」，自动创建配置表和表名对照
3. 在「管理」选项卡中添加/管理数据表
4. 在「导出」选项卡中配置版本参数，点击「开始导出」
5. 在「校验」选项卡中检查数据格式
6. 在「预览」选项卡中预览导出结果

---

## 技术栈

- Office Web Add-in (Excel)
- React + TypeScript + FluentUI v9
- Office JavaScript API
- GitHub Pages 托管
