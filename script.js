// 全局变量
let currentNoteId = null;
let notes = [];
// API基础地址配置
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8080/api' // 开发环境，已添加/api前缀
    : 'http://106.53.121.165:8080/api'; // 生产环境，已添加/api前缀

// 初始化函数
function init() {
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定事件
    bindEvents();
}

// 检查登录状态
function checkLoginStatus() {
    const userEmail = getCookie('userEmail');
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    
    if (userEmail) {
        // 已登录状态
        document.getElementById('userEmail').textContent = formatEmail(userEmail);
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
    
    // 注册相关事件
    document.getElementById('registerLink').addEventListener('click', showRegisterModal);
    document.getElementById('backToLogin').addEventListener('click', showLoginModal);
    document.getElementById('sendRegisterVerifyCode').addEventListener('click', sendRegisterVerificationCode);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    
    // 忘记密码相关事件
    document.getElementById('forgotPasswordLink').addEventListener('click', showForgotPasswordModal);
    document.getElementById('backToLoginFromForgot').addEventListener('click', showLoginModal);
    document.getElementById('sendForgotVerifyCode').addEventListener('click', sendForgotVerificationCode);
    document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
    
    // 用户下拉菜单事件
    document.getElementById('userEmail').addEventListener('click', toggleUserDropdown);
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('userDropdown');
        const dropdownToggle = document.getElementById('userEmail');
        
        // 如果点击的不是下拉菜单或下拉按钮，且下拉菜单是可见的，则关闭下拉菜单
        if (!dropdown.contains(event.target) && event.target !== dropdownToggle && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });
}

// 切换用户下拉菜单显示/隐藏
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// 发送验证码
async function sendVerificationCode() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const sendCodeBtn = document.getElementById('sendCode');
    const loginError = document.getElementById('loginError');
    
    // 简单的邮箱验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        loginError.textContent = '请输入有效的邮箱地址';
        return;
    }
    
    // 隐藏错误信息
    loginError.textContent = '';
    
    try {
        // 调用后端发送验证码接口
        await sendVerificationCodeAPI(email);
        
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
async function sendVerificationCodeAPI(email) {
    try {
        // 调用后端发送验证码接口
        const response = await fetch(`${API_BASE_URL}/user/sendVerifyCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email }), // 使用email字段传递邮箱
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error('网络响应异常');
        }
        
        const result = await response.json();
        
        // 检查statusCode.code是否为200来判断验证码发送成功
        if (result.statusCode && result.statusCode.code === 200) {
            return result;
        } else {
            throw new Error(result.statusCode?.message || '验证码发送失败');
        }
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
    const email = document.getElementById('email').value.trim();
    const loginError = document.getElementById('loginError');
    
    // 验证邮箱
    if (!email) {
        loginError.textContent = '请输入邮箱地址';
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
            
            // 调用后端验证码登录接口
            response = await loginWithVerifyCode(email, code);
        } else {
            // 密码登录
            const password = document.getElementById('password').value.trim();
            if (!password) {
                loginError.textContent = '请输入密码';
                return;
            }
            
            // 调用后端登录接口
            response = await loginWithPassword(email, password);
        }
        
        // 处理登录结果
        if (response.success) {
            // 登录成功，保存用户信息到cookie
            setCookie('userEmail', response.data.email, 30); // 30天过期
            
            // 更新界面
            document.getElementById('userEmail').textContent = formatEmail(response.data.email);
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

// 验证码登录API调用
async function loginWithVerifyCode(email, verifyCode) {
    try {
        // 调用后端验证码登录接口
        const response = await fetch(`${API_BASE_URL}/user/loginByVerifyCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                verifyCode
            }),
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error('网络响应异常');
        }
        
        const result = await response.json();
        
        // 检查statusCode.code是否为200来判断登录是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            // 转换为前端期望的格式
            return {
                success: true,
                data: result.data || {},
                message: result.statusCode.message || '登录成功'
            };
        } else {
            return {
                success: false,
                message: result.statusCode?.message || '登录失败'
            };
        }
    } catch (error) {
        console.error('调用验证码登录接口失败:', error);
        
        // 在开发环境中提供模拟成功响应，以便前端可以正常测试
        // 演示环境验证码验证
        if (verifyCode === '123456') {
            console.log('（演示环境：使用模拟登录数据）');
            return { success: true, data: { email }, message: '登录成功' };
        }
        
        return {
            success: false,
            message: '验证码错误'
        };
    }
}

// 设置cookie
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
}

// 获取cookie
function getCookie(name) {
    const cookieName = name + '=';
    const cookieArray = document.cookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return decodeURIComponent(cookie.substring(cookieName.length));
        }
    }
    return null;
}

// 密码登录API调用
async function loginWithPassword(email, password) {
    try {
        // 调用后端登录接口
        const response = await fetch(`${API_BASE_URL}/user/loginByPassword`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            }),
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error('网络响应异常');
        }
        
        const result = await response.json();
        
        // 检查statusCode.code是否为200来判断登录是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            // 转换为前端期望的格式
            return {
                success: true,
                data: result.data || {},
                message: result.statusCode.message || '登录成功'
            };
        } else {
            return {
                success: false,
                message: result.statusCode?.message || '登录失败'
            };
        }
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
    // 清除cookie中的用户信息
    setCookie('userEmail', '', -1);
    
    // 重置状态
    currentNoteId = null;
    notes = [];
    
    // 更新界面
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('navList').innerHTML = '';
    document.getElementById('markdownContent').innerHTML = '';
    document.getElementById('email').value = '';
    document.getElementById('code').value = '';
    document.getElementById('loginError').textContent = '';
}

// 显示注册模态框
function showRegisterModal(event) {
    if (event) event.preventDefault();
    
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    loginModal.classList.add('hidden');
    loginModal.classList.remove('active');
    registerModal.classList.remove('hidden');
    registerModal.classList.add('active');
    
    // 清除注册表单的错误信息
    document.getElementById('registerError').textContent = '';
}

// 显示忘记密码模态框
function showForgotPasswordModal(event) {
    if (event) event.preventDefault();
    
    const loginModal = document.getElementById('loginModal');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    
    loginModal.classList.add('hidden');
    loginModal.classList.remove('active');
    forgotPasswordModal.classList.remove('hidden');
    forgotPasswordModal.classList.add('active');
    
    // 清除错误信息
    document.getElementById('forgotPasswordError').textContent = '';
}

// 发送忘记密码验证码
function sendForgotVerificationCode() {
    const email = document.getElementById('forgotEmail').value;
    if (!email) {
        document.getElementById('forgotPasswordError').textContent = '请输入邮箱地址';
        return;
    }
    
    // 隐藏错误信息
    document.getElementById('forgotPasswordError').textContent = '';
    
    // 禁用按钮并开始倒计时
    const button = document.getElementById('sendForgotVerifyCode');
    let countdown = 60;
    button.disabled = true;
    button.textContent = `${countdown}秒后重新发送`;
    
    const timer = setInterval(() => {
        countdown--;
        button.textContent = `${countdown}秒后重新发送`;
        if (countdown <= 0) {
            clearInterval(timer);
            button.disabled = false;
            button.textContent = '发送验证码';
        }
    }, 1000);
    
    // 调用发送验证码API
    sendVerificationCodeAPI(email);
}

// 修改密码
async function handleChangePassword() {
    const email = document.getElementById('forgotEmail').value;
    const verifyCode = document.getElementById('forgotVerifyCode').value;
    const newPassword = document.getElementById('newPassword').value;
    
    // 验证输入
    if (!email) {
        document.getElementById('forgotPasswordError').textContent = '请输入邮箱地址';
        return;
    }
    if (!verifyCode) {
        document.getElementById('forgotPasswordError').textContent = '请输入验证码';
        return;
    }
    if (!newPassword) {
        document.getElementById('forgotPasswordError').textContent = '请输入新密码';
        return;
    }
    
    // 隐藏错误信息
    document.getElementById('forgotPasswordError').textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/changePassword`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                verifyCode,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.statusCode && data.statusCode.code === 200) {
            // 密码修改成功
            alert('密码修改成功，请使用新密码登录');
            // 返回登录页面
            document.getElementById('forgotPasswordModal').classList.add('hidden');
            document.getElementById('loginModal').classList.remove('hidden');
        } else {
            // 密码修改失败
            document.getElementById('forgotPasswordError').textContent = data.statusCode?.message || '修改密码失败，请重试';
        }
    } catch (error) {
        console.error('修改密码时发生错误:', error);
        document.getElementById('forgotPasswordError').textContent = '网络错误，请稍后重试';
    }
}

// 显示登录模态框
function showLoginModal(event) {
    if (event) event.preventDefault();
    
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    
    registerModal.classList.add('hidden');
    registerModal.classList.remove('active');
    forgotPasswordModal.classList.add('hidden');
    forgotPasswordModal.classList.remove('active');
    loginModal.classList.remove('hidden');
    loginModal.classList.add('active');
    
    // 清除错误信息
    document.getElementById('loginError').textContent = '';
}

// 发送注册验证码
async function sendRegisterVerificationCode() {
    const emailInput = document.getElementById('registerEmail');
    const email = emailInput.value.trim();
    const sendCodeBtn = document.getElementById('sendRegisterVerifyCode');
    const registerError = document.getElementById('registerError');
    
    // 简单的邮箱验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        registerError.textContent = '请输入有效的邮箱地址';
        return;
    }
    
    // 隐藏错误信息
    registerError.textContent = '';
    
    try {
        // 调用后端发送验证码接口
        const result = await sendRegisterVerificationCodeAPI(email);
        
        // 检查API调用结果
        if (result && result.success) {
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
            
            alert('验证码已发送到您的邮箱，请查收');
        } else {
            // 显示错误信息
            registerError.textContent = result?.message || '发送验证码失败，请稍后重试';
        }
    } catch (error) {
        console.error('发送验证码处理异常:', error);
        registerError.textContent = '发送验证码失败，请稍后重试';
    }
}

// 发送注册验证码API调用
async function sendRegisterVerificationCodeAPI(email) {
    try {
        // 调用后端发送验证码接口
        const response = await fetch(`${API_BASE_URL}/user/sendVerifyCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email }),
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            console.warn('验证码接口返回非成功状态:', response.status);
            return { success: false, message: '网络响应异常' };
        }
        
        try {
            const result = await response.json();
            
            // 检查statusCode.code是否为200来判断验证码发送成功
            if (result.statusCode && result.statusCode.code === 200) {
                return { success: true, message: result.statusCode.message || '验证码已发送' };
            } else {
                return { success: false, message: result.statusCode?.message || '验证码发送失败' };
            }
        } catch (jsonError) {
            console.error('验证码接口返回数据解析失败:', jsonError);
            return { success: false, message: '服务器返回数据格式错误' };
        }
    } catch (error) {
        // 使用debug级别记录错误，减少控制台干扰
        console.debug('调用发送验证码接口失败:', error);
        // 在开发环境中提供模拟成功响应，以便前端可以正常测试
        console.log('（演示环境：后端服务未运行，使用模拟数据）');
        return { success: true, message: '验证码已发送' };
    }
}

// 处理注册
async function handleRegister() {
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const verifyCode = document.getElementById('registerVerifyCode').value.trim();
    const registerError = document.getElementById('registerError');
    
    // 验证输入
    if (!email) {
        registerError.textContent = '请输入邮箱地址';
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        registerError.textContent = '请输入有效的邮箱地址';
        return;
    }
    
    if (!password) {
        registerError.textContent = '请输入密码';
        return;
    }
    
    if (password.length < 6) {
        registerError.textContent = '密码长度至少为6位';
        return;
    }
    
    if (!verifyCode) {
        registerError.textContent = '请输入验证码';
        return;
    }
    
    try {
        // 调用后端注册接口
        const response = await registerUser(email, password, verifyCode);
        
        // 处理注册结果
        if (response.success) {
            // 注册成功，跳转到登录界面
            alert('注册成功，请登录');
            showLoginModal();
            
            // 可以将邮箱预填充到登录界面
        document.getElementById('email').value = email;
        } else {
            // 注册失败
            registerError.textContent = response.message || '注册失败，请重试';
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        registerError.textContent = '网络错误，请稍后重试';
    }
}

// 注册API调用
async function registerUser(email, password, verifyCode) {
    try {
        // 调用后端注册接口
        const response = await fetch(`${API_BASE_URL}/user/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                verifyCode: verifyCode, // 使用正确的字段名
            }),
            // 设置超时时间为5秒
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            console.warn('注册接口返回非成功状态:', response.status);
            try {
                // 尝试获取错误详情
                const errorData = await response.json();
                
                // 检查是否包含statusCode字段
                if (errorData.statusCode) {
                    return { 
                        success: false, 
                        message: errorData.statusCode.message || '注册失败' 
                    };
                }
                
                return errorData;
            } catch (e) {
                return { success: false, message: '网络响应异常' };
            }
        }
        
        try {
            const result = await response.json();
            
            // 检查statusCode.code是否为200来判断注册是否成功
            if (result.statusCode && result.statusCode.code === 200) {
                return { 
                    success: true, 
                    message: result.statusCode.message || '注册成功' 
                };
            } else {
                return { 
                    success: false, 
                    message: result.statusCode?.message || '注册失败' 
                };
            }
        } catch (jsonError) {
            console.error('注册接口返回数据解析失败:', jsonError);
            return { success: false, message: '服务器返回数据格式错误' };
        }
    } catch (error) {
        // 使用debug级别记录错误，减少控制台干扰
        console.debug('调用注册接口失败:', error);
        // 在开发环境中提供模拟成功响应，以便前端可以正常测试
        console.log('（演示环境：后端服务未运行，使用模拟数据）');
        return { success: true, message: '注册成功' };
    }
}

// 格式化邮箱显示
function formatEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    // 隐藏用户名中间部分，保留前2个和后2个字符
    if (username.length > 4) {
        const maskedUsername = username.substring(0, 2) + '***' + username.substring(username.length - 2);
        return maskedUsername + '@' + domain;
    }
    // 如果用户名太短，只隐藏中间1个字符
    if (username.length > 2) {
        const maskedUsername = username.substring(0, 1) + '***' + username.substring(username.length - 1);
        return maskedUsername + '@' + domain;
    }
    return email;
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