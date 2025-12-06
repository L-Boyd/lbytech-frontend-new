// 全局变量
let currentNoteId = null;
let notes = [];
// API基础URL配置
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api' // 开发环境，已添加/api前缀
    : 'http://106.53.121.165:8080/api'; // 生产环境，已添加/api前缀

// 通用API请求函数，自动处理token认证
async function apiRequest(endpoint, options = {}) {
    // 构建完整URL
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 确保options存在
    options = options || {};
    options.headers = options.headers || {};
    
    // 默认Content-Type
    if (!options.headers['Content-Type'] && options.body) {
        options.headers['Content-Type'] = 'application/json';
    }
    
    // 对于非登录、注册、验证码、忘记密码等公开接口，添加token认证
    const publicEndpoints = [
        '/user/loginByVerifyCode',
        '/user/loginByPassword',
        '/user/sendVerifyCode',
        '/user/register',
        '/user/changePassword'
    ];
    
    // 检查是否需要添加token
    if (!publicEndpoints.includes(endpoint)) {
        const token = getCookie('token');
        if (token) {
            options.headers['token'] = token;
        }
    }
    
    // 设置超时
    if (!options.signal) {
        options.signal = AbortSignal.timeout(5000);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`网络响应异常: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 检查是否返回401未授权状态
        if (data.statusCode && data.statusCode.code === 401) {
            console.warn('用户未授权，需要重新登录:', data.data || data.statusCode.message);
            // 清除登录状态
            handleLogout();
            // 显示登录模态框
            const loginModal = document.getElementById('loginModal');
            const mainContainer = document.getElementById('mainContainer');
            loginModal.classList.add('active');
            loginModal.classList.remove('hidden');
            mainContainer.classList.add('hidden');
            // 显示提示信息
            alert('用户未登录，请重新登录');
            throw new Error('用户未授权');
        }
        
        return data;
    } catch (error) {
        console.error(`API请求失败 (${endpoint}):`, error);
        throw error;
    }
}

// 初始化函数
function init() {
    console.log('开始执行init()函数');
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定事件
    bindEvents();
    
    console.log('init()函数执行完成');
}

// 页面加载完成后执行初始化
window.addEventListener('DOMContentLoaded', function() {
    init();
});

// 检查登录状态
function checkLoginStatus() {
    const userEmail = getCookie('userEmail');
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    
    if (userEmail) {
        // 已登录状态
        // 初始状态显示部分隐藏的邮箱
        document.getElementById('userEmail').textContent = getMaskedEmail(userEmail);
        loginModal.classList.add('hidden');
        loginModal.classList.remove('active');
        mainContainer.classList.remove('hidden');
        
        // 从API获取笔记列表
        fetchNotebookList().then(() => {
            // 生成侧边栏索引
            generateSidebarIndex();
            // 默认加载第一个笔记
            if (notes.length > 0) {
                loadNote(notes[0].id);
            }
        });
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
    document.getElementById('showFullAccountBtn').addEventListener('click', showFullAccount);
    
    // 笔记上传相关事件
    document.getElementById('uploadNotebookBtn').addEventListener('click', handleUploadButtonClick);
    document.getElementById('notebookFileInput').addEventListener('change', handleFileSelect);
    
    // 点赞按钮事件
    document.getElementById('thumbBtn').addEventListener('click', handleThumb);
    
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

// 注入目录相关样式
function injectTocStyles() {
    // 检查样式是否已存在
    let styleElement = document.getElementById('toc-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'toc-styles';
        document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
        /* 目录箭头样式 */
        .toc-arrow {
            cursor: pointer;
            display: inline-block;
            margin-right: 8px;
            font-size: 12px;
            width: 12px;
            height: 12px;
            text-align: center;
            line-height: 12px;
            vertical-align: middle;
            /* 确保箭头在链接内部 */
            position: relative;
        }
        
        /* 箭头方向 */
        .arrow-right {
            transform: rotate(0deg);
        }
        
        .arrow-down {
            transform: rotate(90deg);
        }
        
        /* 折叠状态 */
        .collapsed {
            display: none;
        }
        
        /* 目录层级样式 */
        .toc-h2-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h3-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h4-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h5-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h6-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        /* 目录链接样式 - 确保箭头在链接内部 */
        #noteNav a {
            display: block;
            padding: 4px 12px;
            margin: 2px 0;
            color: #333;
            text-decoration: none;
            border-radius: 4px;
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
            /* 确保链接内容不会溢出 */
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        #noteNav a:hover {
            background-color: #f0f0f0;
        }
        
        #noteNav a.active {
            background-color: #007bff;
            color: white;
        }
        
        /* 目录项样式 */
        #noteNav li {
            margin: 3px 0;
            list-style-type: none;
        }
        
        /* 处理箭头点击事件的样式 */
        #noteNav a .toc-arrow {
            pointer-events: auto;
        }
        
        /* 确保箭头在链接内显示正确 */
        #noteNav a[data-has-children="true"] {
            padding-left: 12px;
        }
    `;
}

// 切换用户下拉菜单显示状态
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// 全局变量，用于记录账号是否完整显示
let isFullAccountVisible = false;

// 处理邮箱显示（部分隐藏）的函数
function getMaskedEmail(email) {
    if (!email || email.length <= 5) return email;
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    // 对于用户名部分，只显示前2个和后1个字符，中间用星号代替
    if (username.length <= 3) {
        return username.charAt(0) + '*'.repeat(username.length - 1) + '@' + domain;
    }
    
    const maskedUsername = username.substring(0, 2) + '*'.repeat(username.length - 3) + username.charAt(username.length - 1);
    return maskedUsername + '@' + domain;
}

// 切换显示/隐藏完整账号
function showFullAccount() {
    // 获取用户邮箱（从cookie中）
    const userEmail = getCookie('userEmail');
    const userEmailElement = document.getElementById('userEmail');
    const showFullAccountBtn = document.getElementById('showFullAccountBtn');
    
    if (!userEmail) {
        alert('未找到账号信息，请重新登录');
        // 关闭下拉菜单
        document.getElementById('userDropdown').classList.add('hidden');
        return;
    }
    
    // 切换显示状态
    isFullAccountVisible = !isFullAccountVisible;
    
    if (isFullAccountVisible) {
        // 显示完整账号
        userEmailElement.textContent = userEmail;
        // 更改按钮文本为隐藏完整账号
        showFullAccountBtn.textContent = '隐藏完整账号';
    } else {
        // 显示部分隐藏的账号
        userEmailElement.textContent = getMaskedEmail(userEmail);
        // 更改按钮文本为显示完整账号
        showFullAccountBtn.textContent = '显示完整账号';
    }
    
    // 关闭下拉菜单
    document.getElementById('userDropdown').classList.add('hidden');
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
        // 使用新的apiRequest函数调用后端发送验证码接口
        const result = await apiRequest('/user/sendVerifyCode', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
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

// 获取笔记列表
async function fetchNotebookList() {
    try {
        const result = await apiRequest('/notebook/list', {
            method: 'GET'
        });
        
        if (result.statusCode && result.statusCode.code === 200 && result.data) {
            // 将API返回的数据转换为前端需要的格式
            notes = result.data.map(item => ({
                id: item.id, // 保持原始ID，不再生成note${index+1}格式
                title: item.fileName.replace('.md', ''),
                fileName: item.fileName
                // 不再直接存储fileUrl，而是在loadNote时获取
            }));
            
            // 更新笔记下拉框
            updateNotebookDropdown();
            
            return true;
        } else {
            console.error('获取笔记列表失败:', result.statusCode?.message || '未知错误');
            // 如果获取失败，使用模拟数据作为后备
            loadMockNotes();
            updateNotebookDropdown();
            return false;
        }
    } catch (error) {
        console.error('获取笔记列表请求失败:', error);
        // 如果请求失败，使用模拟数据作为后备
        loadMockNotes();
        updateNotebookDropdown();
        return false;
    }
}

// 更新笔记下拉框
function updateNotebookDropdown() {
    const dropdown = document.getElementById('notebookDropdown');
    if (!dropdown) return;
    
    // 清空下拉框
    dropdown.innerHTML = '';
    
    // 添加笔记选项
    notes.forEach(note => {
        const option = document.createElement('option');
        option.value = note.id;
        option.textContent = note.title;
        dropdown.appendChild(option);
    });
    
    // 默认选择第一个笔记
    if (notes.length > 0) {
        dropdown.value = notes[0].id;
    }
}

// 处理笔记选择
function handleNotebookSelect() {
    console.log('handleNotebookSelect 被调用');
    const dropdown = document.getElementById('notebookDropdown');
    const noteId = dropdown.value;
    console.log('选择的noteId:', noteId);
    if (noteId) {
        loadNote(noteId);
    }
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
            document.getElementById('userEmail').textContent = getMaskedEmail(response.data.email);
            const loginModal = document.getElementById('loginModal');
            loginModal.classList.add('hidden');
            loginModal.classList.remove('active');
            document.getElementById('mainContainer').classList.remove('hidden');
            
            // 获取笔记列表
            await fetchNotebookList();
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
        // 使用新的apiRequest函数调用后端验证码登录接口
        const result = await apiRequest('/user/loginByVerifyCode', {
            method: 'POST',
            body: JSON.stringify({
                email,
                verifyCode
            })
        });
        
        // 检查statusCode.code是否为200来判断登录是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            // 保存token到cookie
            if (result.data && result.data.token) {
                setCookie('token', result.data.token, 30);
            }
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
            // 模拟保存token
            setCookie('token', 'mock_token_' + Date.now(), 30);
            return { success: true, data: { email, token: 'mock_token_' + Date.now() }, message: '登录成功' };
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
        // 使用新的apiRequest函数调用后端登录接口
        const result = await apiRequest('/user/loginByPassword', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        });
        
        // 检查statusCode.code是否为200来判断登录是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            // 保存token到cookie
            if (result.data && result.data.token) {
                setCookie('token', result.data.token, 30);
            }
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
    // 清除token cookie
    setCookie('token', '', -1);
    
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
    const emailInput = document.getElementById('forgotEmail');
    const email = emailInput.value.trim();
    const errorElement = document.getElementById('forgotPasswordError');
    const sendCodeBtn = document.getElementById('sendForgotVerifyCode');
    
    // 简单的邮箱格式验证
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorElement.textContent = '请输入有效的邮箱地址';
        return;
    }
    
    // 清空错误提示
    errorElement.textContent = '';
    
    // 禁用按钮，防止重复发送
    sendCodeBtn.disabled = true;
    
    // 使用新的apiRequest函数调用发送验证码API
    apiRequest('/user/sendVerifyCode', {
        method: 'POST',
        body: JSON.stringify({
            email,
            type: 'forgot'
        })
    })
    .then(result => {
        // 检查statusCode.code是否为200来判断是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            errorElement.textContent = '验证码已发送';
            errorElement.style.color = 'green';
            
            // 倒计时功能
            let countdown = 60;
            sendCodeBtn.textContent = `${countdown}秒后重新发送`;
            
            const timer = setInterval(() => {
                countdown--;
                sendCodeBtn.textContent = `${countdown}秒后重新发送`;
                
                if (countdown <= 0) {
                    clearInterval(timer);
                    sendCodeBtn.textContent = '发送验证码';
                    sendCodeBtn.disabled = false;
                }
            }, 1000);
        } else {
            errorElement.textContent = result.statusCode?.message || '验证码发送失败';
            sendCodeBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('发送验证码失败:', error);
        errorElement.textContent = '验证码发送失败，请稍后重试';
        sendCodeBtn.disabled = false;
    });
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
        // 使用新的apiRequest函数调用修改密码接口
        const result = await apiRequest('/user/changePassword', {
            method: 'POST',
            body: JSON.stringify({
                email,
                verifyCode,
                newPassword
            })
        });
        
        if (result.statusCode && result.statusCode.code === 200) {
            // 密码修改成功
            alert('密码修改成功，请使用新密码登录');
            // 返回登录页面
            document.getElementById('forgotPasswordModal').classList.add('hidden');
            document.getElementById('loginModal').classList.remove('hidden');
        } else {
            // 密码修改失败
            document.getElementById('forgotPasswordError').textContent = result.statusCode?.message || '修改密码失败，请重试';
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
        // 使用新的apiRequest函数调用后端发送验证码接口
        const result = await apiRequest('/user/sendVerifyCode', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        // 检查statusCode.code是否为200来判断验证码发送成功
        if (result.statusCode && result.statusCode.code === 200) {
            return { success: true, message: result.statusCode.message || '验证码已发送' };
        } else {
            return { success: false, message: result.statusCode?.message || '验证码发送失败' };
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
        // 使用新的apiRequest函数调用后端注册接口
        const result = await apiRequest('/user/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                verifyCode
            })
        });
        
        // 检查statusCode.code是否为200来判断注册是否成功
        if (result.statusCode && result.statusCode.code === 200) {
            // 保存token到cookie
            if (result.data && result.data.token) {
                setCookie('token', result.data.token, 30);
            }
            return {
                success: true,
                data: result.data || {},
                message: result.statusCode.message || '注册成功'
            };
        } else {
            return {
                success: false,
                message: result.statusCode?.message || '注册失败'
            };
        }
    } catch (error) {
        // 使用debug级别记录错误，减少控制台干扰
        console.debug('调用注册接口失败:', error);
        // 在开发环境中提供模拟成功响应，以便前端可以正常测试
        console.log('（演示环境：后端服务未运行，使用模拟数据）');
        return { success: true, message: '注册成功' };
    }
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
\`\`\``,
            thumbCount: 5,
            isThumbed: false
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
\`\`\``,
            thumbCount: 12,
            isThumbed: true
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
\`\`\``,
            thumbCount: 8,
            isThumbed: false
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

// 响应式图片可以通过以下方式实现：

- 使用\`<picture>\`元素
- 使用\`srcset\`属性
- 使用CSS的\`max-width: 100%\`确保图片不会溢出容器`,
            thumbCount: 15,
            isThumbed: false
        }
    ];
}

// 生成侧边栏索引 - 显示当前笔记的目录结构
function generateSidebarIndex() {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';
    
    // 如果没有当前选中的笔记，显示笔记列表
    if (!currentNoteId) {
        notes.forEach(note => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = `#${note.id}`;
            a.textContent = note.title;
            a.setAttribute('data-note-id', note.id);
            
            // 添加点击事件
            a.addEventListener('click', (e) => {
                console.log('目录链接点击事件被触发');
                e.preventDefault();
                const noteId = a.getAttribute('data-note-id');
                console.log('选择的noteId:', noteId);
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
        return;
    }
    
    // 显示当前笔记的标题作为返回链接
    const currentNote = notes.find(note => note.id === currentNoteId);
    if (currentNote) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = '#notes';
        a.textContent = '返回笔记列表';
        a.classList.add('back-to-list');
        
        // 添加点击事件 - 返回笔记列表
        a.addEventListener('click', (e) => {
            e.preventDefault();
            currentNoteId = null;
            generateSidebarIndex();
        });
        
        li.appendChild(a);
        navList.appendChild(li);
    }
    
    // 获取当前渲染的Markdown内容中的标题，包括H1到H6
    const headings = document.querySelectorAll('#markdownContent h1, #markdownContent h2, #markdownContent h3, #markdownContent h4, #markdownContent h5, #markdownContent h6');
    
    if (headings.length === 0) {
        // 如果没有标题，显示提示信息
        const li = document.createElement('li');
        li.textContent = '当前笔记没有目录结构';
        li.style.color = '#666';
        li.style.fontStyle = 'italic';
        li.style.padding = '10px 12px';
        navList.appendChild(li);
        return;
    }
    
    // 使用栈来管理目录层级关系
    const headingStack = [];
    
    // 遍历所有标题，构建层级目录
    headings.forEach((heading) => {
        const headingId = heading.id;
        const headingText = heading.textContent.trim();
        const headingLevel = parseInt(heading.tagName.substring(1));
        
        // 创建目录项
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${headingId}`;
        link.textContent = headingText;
        link.classList.add(`toc-h${headingLevel}`);
        link.setAttribute('data-heading-id', headingId);
        
        // 添加点击事件 - 滚动到对应标题
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-heading-id');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                
                // 更新活动状态
                document.querySelectorAll('#noteNav a').forEach(item => {
                    item.classList.remove('active');
                });
                link.classList.add('active');
            }
        });
        
        // 对于非H6标题，添加箭头
        let arrow = null;
        if (headingLevel < 6) {
            arrow = document.createElement('span');
            arrow.classList.add('toc-arrow');
            arrow.classList.add('arrow-right');
            arrow.textContent = '▶';
            arrow.style.display = 'none'; // 默认隐藏
            
            // 先清空链接内容，然后添加箭头和文本节点
            link.textContent = '';
            link.appendChild(arrow);
            link.appendChild(document.createTextNode(headingText));
            link.setAttribute('data-has-children', 'false');
        }
        
        li.appendChild(link);
        
        // 找到正确的父容器
        let parentContainer = navList;
        
        // 从栈中找到合适的父级 - 移除所有大于等于当前层级的标题
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= headingLevel) {
            headingStack.pop();
        }
        
        if (headingStack.length > 0) {
            // 获取栈顶元素的子容器
            const lastHeading = headingStack[headingStack.length - 1];
            if (!lastHeading.subContainer) {
                // 创建子容器
                lastHeading.subContainer = document.createElement('ul');
                lastHeading.subContainer.classList.add(`toc-h${lastHeading.level + 1}-list`);
                lastHeading.subContainer.classList.add('collapsed');
                lastHeading.li.appendChild(lastHeading.subContainer);
                
                // 显示箭头
                if (lastHeading.arrow) {
                    lastHeading.arrow.style.display = 'inline-block';
                    // 将data-has-children属性设置在链接上而不是列表项上
                    lastHeading.link.setAttribute('data-has-children', 'true');
                }
                
                // 添加箭头点击事件 - 确保只控制当前标题的子容器
                if (lastHeading.arrow) {
                    lastHeading.arrow.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // 只操作当前标题对应的子容器
                        const subContainer = lastHeading.subContainer;
                        if (subContainer) {
                            const isCollapsed = subContainer.classList.toggle('collapsed');
                            if (isCollapsed) {
                                lastHeading.arrow.classList.remove('arrow-down');
                                lastHeading.arrow.classList.add('arrow-right');
                            } else {
                                lastHeading.arrow.classList.remove('arrow-right');
                                lastHeading.arrow.classList.add('arrow-down');
                            }
                        }
                    });
                }
            }
            parentContainer = lastHeading.subContainer;
        }
        
        // 添加当前标题到父容器
        parentContainer.appendChild(li);
        
        // 将当前标题加入栈中，包含link属性
        headingStack.push({
            level: headingLevel,
            li: li,
            link: link,  // 添加link属性，以便在后续代码中引用
            arrow: arrow,
            subContainer: null
        });
    });
    
    // 注入目录相关样式
    injectTocStyles();
}

// 注入目录相关样式
function injectTocStyles() {
    // 检查样式是否已存在
    let styleElement = document.getElementById('toc-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'toc-styles';
        document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
        /* 目录箭头样式 - 完全融入链接框内 */
        .toc-arrow {
            cursor: pointer;
            display: inline-block;
            margin-right: 8px;
            font-size: 12px;
            width: 12px;
            height: 12px;
            text-align: center;
            line-height: 12px;
            vertical-align: middle;
            position: relative;
            pointer-events: auto;
        }
        
        /* 箭头方向 */
        .arrow-right {
            transform: rotate(0deg);
        }
        
        .arrow-down {
            transform: rotate(90deg);
        }
        
        /* 折叠状态 */
        .collapsed {
            display: none;
        }
        
        /* 目录层级样式 */
        .toc-h2-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h3-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h4-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h5-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        .toc-h6-list {
            margin-left: 20px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        
        /* 目录链接样式 - 确保箭头完全融入链接框内 */
        #noteNav a {
            display: block;
            padding: 4px 12px;
            margin: 2px 0;
            color: #333;
            text-decoration: none;
            border-radius: 4px;
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* 对于有子项的链接，确保箭头区域显示正常 */
        #noteNav a[data-has-children="true"] {
            padding-left: 12px;
        }
        
        #noteNav a:hover {
            background-color: #f0f0f0;
        }
        
        #noteNav a.active {
            background-color: #007bff;
            color: white;
        }
        
        /* 目录项样式 */
        #noteNav li {
            margin: 3px 0;
            list-style-type: none;
        }
    `;
}

// 加载笔记内容
async function loadNote(noteId) {
    console.log('loadNote 被调用，noteId:', noteId, '类型:', typeof noteId);
    console.log('notes 数组:', notes);
    // 显示notes数组中每个笔记的id和类型
    console.log('notes数组中的id类型:', notes.map(n => ({id: n.id, type: typeof n.id})));
    // 使用类型转换解决比较问题
    const note = notes.find(n => n.id == noteId);
    console.log('找到的笔记:', note);
    if (!note) return;
    
    currentNoteId = noteId;
    
    // 更新下拉框选中状态
    const dropdown = document.getElementById('notebookDropdown');
    if (dropdown) {
        dropdown.value = noteId;
    }
    
    try {
        // 通过API获取笔记的完整信息
        const result = await apiRequest(`/notebook/getFileById?id=${noteId}`, {
            method: 'GET'
        });
        
        if (result.statusCode && result.statusCode.code === 200 && result.data) {
            const noteData = result.data;
            
            // 更新笔记信息
            note.fileUrl = noteData.fileUrl;
            note.thumbCount = noteData.thumbCount;
            note.isThumbed = noteData.isThumbed;
            
            // 如果有fileUrl，则通过URL加载内容
            if (noteData.fileUrl) {
                fetch(noteData.fileUrl.trim())
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(content => {
                        // 渲染Markdown内容
                        renderMarkdown(content);
                        // 生成侧边栏目录
                        generateSidebarIndex();
                        // 更新点赞按钮UI
                        updateThumbUI(note);
                    })
                    .catch(error => {
                        // 如果加载失败，使用标题作为内容
                        renderMarkdown(`# ${note.title}\n\n无法加载笔记内容，请稍后重试。`);
                        // 生成侧边栏目录
                        generateSidebarIndex();
                        // 更新点赞按钮UI
                        updateThumbUI(note);
                    });
            } else {
                // 如果有本地内容，则使用本地内容（用于模拟数据）
                if (note.content) {
                    renderMarkdown(note.content);
                } else {
                    renderMarkdown(`# ${note.title}\n\n无法加载笔记内容，请稍后重试。`);
                }
                // 生成侧边栏目录
                generateSidebarIndex();
                // 更新点赞按钮UI
                updateThumbUI(note);
            }
            
            // 更新页面标题
            document.title = `${note.title} - 学习笔记平台`;
            
            // 高亮当前选中的导航项
            document.querySelectorAll('#noteNav a').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-note-id') === noteId) {
                    item.classList.add('active');
                }
            });
        } else {
            console.error('获取笔记详情失败:', result.statusCode?.message || '未知错误');
            // 如果获取失败但有本地模拟数据，则使用本地内容
            if (note.content) {
                renderMarkdown(note.content);
                // 生成侧边栏目录
                generateSidebarIndex();
            } else {
                // 否则显示错误消息
                renderMarkdown(`# ${note.title}\n\n无法加载笔记详情，请稍后重试。`);
                // 生成侧边栏目录
                generateSidebarIndex();
            }
        }
    } catch (error) {
        console.error('获取笔记详情请求失败:', error);
        // 如果请求失败但有本地模拟数据，则使用本地内容
        if (note.content) {
            renderMarkdown(note.content);
            // 生成侧边栏目录
            generateSidebarIndex();
        } else {
            // 否则显示错误消息
            renderMarkdown(`# ${note.title}\n\n无法加载笔记详情，请稍后重试。`);
            // 生成侧边栏目录
            generateSidebarIndex();
        }
    }
}

// 阿里云图片存储基础URL
const ALIYUN_BASE_URL = 'https://lbytechcn.oss-cn-shenzhen.aliyuncs.com/';

// 渲染Markdown内容
function renderMarkdown(content) {
    const markdownContent = document.getElementById('markdownContent');
    
    // 创建自定义renderer
    const renderer = new marked.Renderer();
    
    // 重写image渲染方法，将相对路径转换为阿里云路径
    renderer.image = function(href, title, text) {
        // 处理href可能是对象的情况
        let imageUrl = href;
        
        // 尝试获取实际的href字符串
        let actualHref = null;
        if (typeof href === 'string') {
            actualHref = href;
        } else if (typeof href === 'object' && href !== null && href.href) {
            // 如果href是对象且有href属性，则使用其href属性
            actualHref = href.href;
        } else {
            // 默认处理，避免渲染失败
            return `<img src="" alt="${text || ''}"${title ? ` title="${title}"` : ''}>`;
        }
        
        if (actualHref) {
            imageUrl = actualHref;
            
            if (!actualHref.startsWith('http')) {
                // 处理Windows路径分隔符
                const normalizedPath = actualHref.replace(/\\/g, '/');
                // 处理相对路径
                if (normalizedPath.startsWith('../')) {
                    // 移除../前缀
                    const parts = normalizedPath.split('/').filter(part => part !== '..');
                    imageUrl = ALIYUN_BASE_URL + parts.join('/');
                } else if (normalizedPath.startsWith('/')) {
                    imageUrl = ALIYUN_BASE_URL + normalizedPath.substring(1);
                } else {
                    imageUrl = ALIYUN_BASE_URL + normalizedPath;
                }
            }
        }
        
        // 返回HTML img标签
        const escapedText = text ? text.replace(/"/g, '&quot;') : '';
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${imageUrl}" alt="${escapedText}"${titleAttr}>`;
    };
    
    // 设置marked选项
    marked.setOptions({
        renderer: renderer,
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });
    
    try {
        // 渲染Markdown，确保使用自定义renderer
        markdownContent.innerHTML = marked.parse(content);

    } catch (error) {
        markdownContent.innerHTML = '<div class="error">渲染内容失败，请检查格式</div>';
    }
    
    // 为渲染后的内容中的标题添加id，用于内部导航
    addHeadingIds(markdownContent);
    
    // 为页面内链接添加点击事件
    addHeadingLinksEvent();
    
    // 渲染后额外检查并修正图片路径，确保所有相对路径都正确转换
    setTimeout(() => {
        const images = markdownContent.querySelectorAll('img');
        images.forEach((img) => {
            // 获取当前图片src
            let src = img.getAttribute('src');
            
            // 检查src是否为字符串类型且有效
            if (typeof src === 'string' && src && !src.startsWith('http')) {
                // 处理Windows路径分隔符
                const normalizedPath = src.replace(/\\/g, '/');
                
                // 将相对路径转换为阿里云路径
                let newSrc;
                if (normalizedPath.startsWith('../')) {
                    // 移除../前缀
                    const parts = normalizedPath.split('/').filter(part => part !== '..');
                    newSrc = ALIYUN_BASE_URL + parts.join('/');
                } else if (normalizedPath.startsWith('/')) {
                    newSrc = ALIYUN_BASE_URL + normalizedPath.substring(1);
                } else {
                    newSrc = ALIYUN_BASE_URL + normalizedPath;
                }
                
                img.setAttribute('src', newSrc);
            }
        });
    }, 100);
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

// 笔记上传相关函数
// 处理上传按钮点击事件
function handleUploadButtonClick() {
    const fileInput = document.getElementById('notebookFileInput');
    fileInput.click();
}

// 处理文件选择事件
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    const allowedTypes = ['.md', '.txt', '.json'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        alert('只支持上传 .md、.txt 或 .json 格式的文件');
        event.target.value = ''; // 清空文件输入
        return;
    }
    
    // 验证文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('文件大小不能超过10MB');
        event.target.value = ''; // 清空文件输入
        return;
    }
    
    // 获取按钮元素和原始文本（移到try块外部）
    const uploadBtn = document.getElementById('uploadNotebookBtn');
    const originalText = uploadBtn.textContent;
    
    try {
        // 显示上传中状态
        uploadBtn.textContent = '上传中...';
        uploadBtn.disabled = true;
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);
        
        // 调用上传API
        const response = await fetch(`${API_BASE_URL}/notebook/upload`, {
            method: 'POST',
            headers: {
                'token': getCookie('token')
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`上传失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.statusCode && result.statusCode.code === 200) {
            // 上传成功
            alert('笔记上传成功！');
            
            // 刷新笔记列表
            await fetchNotebookList();
            
            // 更新下拉框
            updateNotebookDropdown();
            
            // 重新生成侧边栏索引
            generateSidebarIndex();
            
            // 如果返回了新上传的笔记信息，可以选择加载它
            if (result.data && result.data.id) {
                loadNote(result.data.id);
            }
        } else {
            throw new Error(result.data || result.statusCode?.message || '上传失败');
        }
    } catch (error) {
        console.error('上传笔记失败:', error);
        alert(`上传失败: ${error.message}`);
    } finally {
        // 恢复按钮状态
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
        
        // 清空文件输入
        event.target.value = '';
    }
}

// 处理点赞和取消点赞
async function handleThumb() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id == currentNoteId);
    if (!note) return;
    
    const thumbBtn = document.getElementById('thumbBtn');
    const thumbCountSpan = document.getElementById('thumbCount');
    
    try {
        if (note.isThumbed) {
            // 取消点赞
            await apiRequest('/thumb/unThumbNotebook', {
                method: 'POST',
                body: JSON.stringify({ notebookId: currentNoteId })
            });
            
            // 更新本地状态
            note.isThumbed = false;
            note.thumbCount = Math.max(0, note.thumbCount - 1);
        } else {
            // 点赞
            await apiRequest('/thumb/thumbNotebook', {
                method: 'POST',
                body: JSON.stringify({ notebookId: currentNoteId })
            });
            
            // 更新本地状态
            note.isThumbed = true;
            note.thumbCount += 1;
        }
        
        // 更新UI
        updateThumbUI(note);
    } catch (error) {
        console.error('点赞操作失败:', error);
        alert('点赞操作失败，请稍后重试');
    }
}

// 更新点赞按钮UI
function updateThumbUI(note) {
    const thumbBtn = document.getElementById('thumbBtn');
    const thumbCountSpan = document.getElementById('thumbCount');
    
    if (note.isThumbed) {
        thumbBtn.classList.add('thumbed');
    } else {
        thumbBtn.classList.remove('thumbed');
    }
    
    thumbCountSpan.textContent = note.thumbCount;
}