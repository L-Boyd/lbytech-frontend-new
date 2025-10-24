# 学习笔记展示平台

这是一个基于 HTML、CSS 和 JavaScript 的学习笔记展示网站，支持 Markdown 内容渲染、侧边栏索引导航和邮箱验证码登录功能。

## 功能特点

- **邮箱验证码登录**：支持通过邮箱和验证码进行登录（演示环境验证码为 123456）
- **Markdown 渲染**：使用 marked.js 和 highlight.js 渲染 Markdown 内容，支持代码高亮
- **侧边栏索引**：左侧显示笔记标题列表，点击可快速切换查看不同笔记
- **响应式设计**：适配不同屏幕尺寸的设备
- **本地存储**：登录状态保存在 localStorage 中

## 项目结构

```
frontend_new/
├── index.html      # 主HTML文件
├── styles.css      # 样式文件
├── script.js       # JavaScript 功能实现
├── example-note.md # 示例Markdown笔记
└── README.md       # 项目说明文档
```

## 如何使用

### 本地运行

1. 确保你有一个 HTTP 服务器环境
2. 将项目文件放在服务器根目录
3. 访问 `http://localhost:[端口号]` 即可查看

### 使用指南

1. **注册**：
   - 在登录界面点击「立即注册」链接
   - 输入邮箱地址
   - 点击「发送验证码」按钮，系统会向您的邮箱发送验证码
   - 输入密码（至少6位）
   - 输入收到的验证码
   - 点击「注册」按钮
   - 注册成功后，系统会自动跳转到登录界面

2. **登录**：
   - **验证码登录**：
     - 输入邮箱地址
     - 点击「发送验证码」按钮
     - 输入验证码 `123456`（演示环境）
     - 点击「登录」按钮
   - **密码登录**：
     - 点击「邮箱密码登录」选项卡
     - 输入邮箱地址和密码
     - 点击「登录」按钮（演示环境中任意密码均可）

3. **浏览笔记**：
   - 左侧显示所有笔记的标题
   - 点击标题可切换查看不同笔记
   - 笔记内容支持 Markdown 格式，包括代码高亮、表格、引用等

4. **退出登录**：
   - 点击右上角用户信息旁的「退出」按钮

## 技术栈

- **HTML5**：页面结构
- **CSS3**：样式设计，包括响应式布局
- **JavaScript**：功能实现，包括登录验证、Markdown 渲染等
- **marked.js**：Markdown 解析和渲染
- **highlight.js**：代码语法高亮
- **localStorage**：本地存储用户登录状态

## 自定义和扩展

### 添加新笔记

要添加新笔记，请在 `script.js` 文件中的 `loadMockNotes()` 函数中添加新的笔记对象，包含 `id`、`title` 和 `content` 属性。

### 修改样式

可以通过编辑 `styles.css` 文件来自定义网站的外观，包括颜色、字体、布局等。

### 后端集成

项目已配置为连接后端API，主要集成点包括：

1. **注册功能**：
   - 发送邮箱验证码：调用`http://localhost:8080/user/sendVerifyCode`接口
     - 方法：POST
     - 请求体：`{"email": "邮箱地址"}`
     - 响应格式：`{"success": true/false, "message": "提示信息"}`
   
   - 用户注册：调用`http://localhost:8080/user/register`接口
     - 方法：POST
     - 请求体：`{"email": "邮箱地址", "password": "密码", "verifyCode": "验证码"}`
     - 响应格式：`{"success": true/false, "message": "提示信息"}`

2. **验证码登录**：通过 `handleLogin()` 函数中的验证码登录逻辑调用登录接口
   - 请求方法：POST
   - 请求体：`{"email": "邮箱地址", "verificationCode": "验证码", "type": "code"}`
   - 预期响应格式：`{"success": true/false, "data": {...}, "message": "..."}`

3. **密码登录**：通过 `loginWithPassword()` 函数调用 `http://localhost:8080/login` 接口
   - 请求方法：POST
   - 请求体：`{"email": "邮箱地址", "password": "密码", "type": "password"}`
   - 预期响应格式：`{"success": true/false, "data": {...}, "message": "..."}`

4. **发送登录验证码**：通过 `sendVerificationCodeAPI()` 函数调用验证码发送接口
   - 请求方法：POST
   - 请求体：`{"email": "邮箱地址"}`
   - 预期响应格式：`{"success": true/false, "message": "..."}`

5. **笔记数据**：目前使用 `loadMockNotes()` 提供模拟数据，可以修改为从后端API获取

## 注意事项

- 本项目仅为前端演示版本，实际生产环境中需要集成后端服务
- 演示环境中，验证码固定为 `123456`
- 用户登录状态保存在浏览器 localStorage 中，清除浏览器数据会导致登录状态丢失