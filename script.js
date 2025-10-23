// 全局变量
let currentNoteId = null;
let notes = [];

// 初始化函数
function init() {
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定事件
    bindEvents();
}

// 检查登录状态
function checkLoginStatus() {
    const userPhone = localStorage.getItem('userPhone');
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    
    if (userPhone) {
        // 已登录状态
        document.getElementById('userPhone').textContent = formatPhone(userPhone);
        loginModal.classList.add('hidden');
        loginModal.classList.remove('active');
        mainContainer.classList.remove('hidden');
        
        // 加载模拟笔记数据
        loadMockNotes();
        // 生成侧边栏索引
        generateSidebarIndex();
        // 默认加载第一个笔记
        if (notes.length > 0) {
            loadNote(notes[0].id);
        }
    } else {
        // 未登录状态
        loginModal.classList.add('active');
        mainContainer.classList.add('hidden');
    }
}

// 绑定事件
function bindEvents() {
    // 发送验证码按钮
    document.getElementById('sendCode').addEventListener('click', sendVerificationCode);
    
    // 登录按钮
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    
    // 退出登录按钮
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // 登录选项卡切换
    document.getElementById('tabCode').addEventListener('click', () => switchLoginTab('code'));
    document.getElementById('tabPassword').addEventListener('click', () => switchLoginTab('password'));
}

// 发送验证码
async function sendVerificationCode() {
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput.value.trim();
    const sendCodeBtn = document.getElementById('sendCode');
    const loginError = document.getElementById('loginError');
    
    // 简单的手机号验证
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        loginError.textContent = '请输入有效的手机号码';
        return;
    }
    
    // 隐藏错误信息
    loginError.textContent = '';
    
    try {
        // 调用后端发送验证码接口
        await sendVerificationCodeAPI(phone);
        
        // 倒计时功能
        let countdown = 60;
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = `${countdown}秒后重新发送`;
        
        const timer = setInterval(() => {
            countdown--;
            sendCodeBtn.textContent = `${countdown}秒后重新发送`;
            
            if (countdown <= 0) {
                clearInterval(timer);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = '发送验证码';
            }
        }, 1000);
        
        // 模拟验证码为 '123456'
        alert('验证码已发送，演示环境请输入: 123456');
    } catch (error) {
        console.error('发送验证码失败:', error);
        loginError.textContent = '发送验证码失败，请稍后重试';
    }
}

// 发送验证码API调用
async function sendVerificationCodeAPI(phone) {
    try {
        // 这里可以调用实际的后端发送验证码接口
        // 为了演示，暂时只打印日志
        console.log('发送验证码到手机号:', phone);
        
        // 模拟API调用
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 500);
        });
    } catch (error) {
        console.error('调用发送验证码接口失败:', error);
        throw error;
    }
}

// 切换登录选项卡
function switchLoginTab(tab) {
    // 更新选项卡状态
    document.getElementById('tabCode').classList.remove('active');
    document.getElementById('tabPassword').classList.remove('active');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    // 更新表单显示
    document.getElementById('codeLoginForm').classList.remove('active');
    document.getElementById('passwordLoginForm').classList.remove('active');
    document.getElementById(`${tab}LoginForm`).classList.add('active');
    
    // 清除错误信息
    document.getElementById('loginError').textContent = '';
}

// 处理登录
async function handleLogin() {
    const phone = document.getElementById('phone').value.trim();
    const loginError = document.getElementById('loginError');
    
    // 验证手机号
    if (!phone) {
        loginError.textContent = '请输入手机号码';
        return;
    }
    
    // 判断当前登录方式
    const isCodeLogin = document.getElementById('codeLoginForm').classList.contains('active');
    
    try {
        let response;
        
        if (isCodeLogin) {
            // 验证码登录
            const code = document.getElementById('code').value.trim();
            if (!code) {
                loginError.textContent = '请输入验证码';
                return;
            }
            
            // 演示环境验证码验证
            if (code !== '123456') {
                loginError.textContent = '验证码错误';
                return;
            }
            
            // 模拟登录成功（实际环境应调用API）
            response = { success: true, data: { phone } };
        } else {
            // 密码登录
            const password = document.getElementById('password').value.trim();
            if (!password) {
                loginError.textContent = '请输入密码';
                return;
            }
            
            // 调用后端登录接口
            response = await loginWithPassword(phone, password);
        }
        
        // 处理登录结果
        if (response.success) {
            // 登录成功，保存用户信息
            localStorage.setItem('userPhone', response.data.phone);
            
            // 更新界面
            document.getElementById('userPhone').textContent = formatPhone(response.data.phone);
            const loginModal = document.getElementById('loginModal');
            loginModal.classList.add('hidden');
            loginModal.classList.remove('active');
            document.getElementById('mainContainer').classList.remove('hidden');
            
            // 加载模拟笔记数据
            loadMockNotes();
            // 生成侧边栏索引
            generateSidebarIndex();
            // 默认加载第一个笔记
            if (notes.length > 0) {
                loadNote(notes[0].id);
            }
        } else {
            // 登录失败
            loginError.textContent = response.message || '登录失败，请重试';
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        loginError.textContent = '网络错误，请稍后重试';
    }
}

// 密码登录API调用
async function loginWithPassword(phone, password) {
    try {
        // 调用后端登录接口
        const response = await fetch('http://localhost:8080/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone,
                password,
                type: 'password' // 标识是密码登录
            }),
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error('网络响应异常');
        }
        
        return await response.json();
    } catch (error) {
        console.error('调用登录接口失败:', error);
        
        // 当后端无响应时，提示密码错误
        return {
            success: false,
            message: '密码错误'
        };
    }
}

// 处理退出登录
function handleLogout() {
    // 清除本地存储的用户信息
    localStorage.removeItem('userPhone');
    
    // 重置状态
    currentNoteId = null;
    notes = [];
    
    // 更新界面
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('navList').innerHTML = '';
    document.getElementById('markdownContent').innerHTML = '';
    document.getElementById('phone').value = '';
    document.getElementById('code').value = '';
    document.getElementById('loginError').textContent = '';
}

// 格式化手机号显示
function formatPhone(phone) {
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
}

// 加载模拟笔记数据
function loadMockNotes() {
    notes = [
        {
            id: 'note1',
            title: 'JavaScript基础',
            content: `# JavaScript基础

## 变量声明

在JavaScript中，有三种声明变量的方式：

- \`var\` - 函数作用域，可重新声明
- \`let\` - 块级作用域，不可重复声明
- \`const\` - 块级作用域，常量，不可重新赋值

## 数据类型

JavaScript有以下基本数据类型：

- 字符串（String）
- 数字（Number）
- 布尔值（Boolean）
- 空（Null）
- 未定义（Undefined）
- Symbol（ES6新增）
- BigInt（ES11新增）

## 示例代码

\`\`\`javascript
// 变量声明示例
let name = 'JavaScript';
const version = 1.0;

// 函数定义
function greet(message) {
    console.log(message);
}

// 调用函数
greet('Hello JavaScript!');
\`\`\``
        },
        {
            id: 'note2',
            title: 'HTML5新特性',
            content: `# HTML5新特性

## 语义化标签

HTML5引入了许多语义化标签，使文档结构更加清晰：

- \`<header>\` - 页眉
- \`<nav>\` - 导航
- \`<main>\` - 主要内容
- \`<section>\` - 章节
- \`<article>\` - 文章
- \`<aside>\` - 侧边栏
- \`<footer>\` - 页脚

## 表单增强

HTML5为表单添加了新的输入类型：

- \`<input type="email">\` - 电子邮件地址
- \`<input type="tel">\` - 电话号码
- \`<input type="url">\` - URL地址
- \`<input type="date">\` - 日期选择器
- \`<input type="color">\` - 颜色选择器

## Canvas绘图

HTML5 Canvas提供了强大的绘图能力：

\`\`\`html
<canvas id="myCanvas" width="200" height="100"></canvas>
<script>
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 150, 80);
</script>
\`\`\``
        },
        {
            id: 'note3',
            title: 'CSS3特性总结',
            content: `# CSS3特性总结

## 选择器增强

CSS3引入了许多新的选择器：

- 属性选择器：\`[attr^="value"]\`（以value开头）
- 伪类选择器：\`:nth-child(n)\`（第n个子元素）
- 伪元素选择器：\`::before\` 和 \`::after\`

## 盒模型属性

CSS3新增了一些盒模型相关的属性：

- \`box-shadow\` - 阴影效果
- \`border-radius\` - 圆角边框
- \`box-sizing\` - 盒模型计算方式

## 动画效果

CSS3支持多种动画效果：

### 过渡（Transition）

\`\`\`css
.element {
    transition: property duration timing-function delay;
    transition: all 0.3s ease;
}
\`\`\`

### 动画（Animation）

\`\`\`css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.element {
    animation: fadeIn 1s ease-in;
}
\`\`\`

### 变换（Transform）

\`\`\`css
.element {
    transform: translate(x, y) rotate(deg) scale(n);
}
\`\`\``
        },
        {
            id: 'note4',
            title: '响应式设计原则',
            content: `# 响应式设计原则

## 媒体查询

媒体查询是响应式设计的核心：

\`\`\`css
/* 针对小屏幕 */
@media (max-width: 768px) {
    .container {
        width: 100%;
    }
}

/* 针对中等屏幕 */
@media (min-width: 769px) and (max-width: 1024px) {
    .container {
        width: 90%;
    }
}

/* 针对大屏幕 */
@media (min-width: 1025px) {
    .container {
        width: 80%;
        max-width: 1200px;
    }
}
\`\`\`

## 灵活布局

- **流式布局**：使用百分比宽度
- **弹性布局**：使用Flexbox
- **网格布局**：使用Grid

## 图片处理

响应式图片可以通过以下方式实现：

- 使用\`<picture>\`元素
- 使用\`srcset\`属性
- 使用CSS的\`max-width: 100%\`确保图片不会溢出容器`
        }
    ];
}

// 生成侧边栏索引
function generateSidebarIndex() {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';
    
    notes.forEach(note => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = `#${note.id}`;
        a.textContent = note.title;
        a.setAttribute('data-note-id', note.id);
        
        // 添加点击事件
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const noteId = a.getAttribute('data-note-id');
            loadNote(noteId);
            
            // 更新活动状态
            document.querySelectorAll('#noteNav a').forEach(item => {
                item.classList.remove('active');
            });
            a.classList.add('active');
        });
        
        li.appendChild(a);
        navList.appendChild(li);
    });
}

// 加载笔记内容
function loadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    
    // 渲染Markdown内容
    renderMarkdown(note.content);
    
    // 更新页面标题
    document.title = `${note.title} - 学习笔记平台`;
    
    // 高亮当前选中的导航项
    document.querySelectorAll('#noteNav a').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-note-id') === noteId) {
            item.classList.add('active');
        }
    });
}

// 渲染Markdown内容
function renderMarkdown(content) {
    const markdownContent = document.getElementById('markdownContent');
    
    // 设置marked选项
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });
    
    // 渲染Markdown
    markdownContent.innerHTML = marked.parse(content);
    
    // 为渲染后的内容中的标题添加id，用于内部导航
    addHeadingIds(markdownContent);
    
    // 为页面内链接添加点击事件
    addHeadingLinksEvent();
}

// 为标题添加id
function addHeadingIds(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading, index) => {
        const id = `heading-${currentNoteId}-${index}`;
        heading.id = id;
    });
}

// 添加页面内链接事件
function addHeadingLinksEvent() {
    const links = document.querySelectorAll('#markdownContent a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);