// 登入頁面JavaScript
class LoginPage {
    constructor() {
        this.currentTab = 'login';
        this.licenseValidated = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingLogin();
    }

    bindEvents() {
        // 登入表單
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // 註冊表單
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // 許可證驗證按鈕
        const validateBtn = document.querySelector('.validate-btn');
        if (validateBtn) {
            validateBtn.addEventListener('click', this.validateLicense.bind(this));
        }

        // 許可證輸入框回車驗證
        const licenseInput = document.getElementById('licenseKey');
        if (licenseInput) {
            licenseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validateLicense();
                }
            });

            licenseInput.addEventListener('input', () => {
                this.resetLicenseValidation();
            });
        }
    }

    checkExistingLogin() {
        // 完全禁用自動重定向，讓用戶手動選擇
        // 這樣可以避免登入頁面被自動跳轉
        console.log('檢查登入狀態，但不自動重定向');
        
        if (auth.isAuthenticated()) {
            const user = auth.getUser();
            console.log('用戶已登入:', user.username, '角色:', user.role);
            
            // 顯示一個提示，但不自動重定向
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.innerHTML = `
                    <div style="text-align: center; padding: 20px; background: rgba(76, 175, 80, 0.1); border-radius: 10px; color: #4CAF50;">
                        <h3>您已經登入</h3>
                        <p>用戶: ${user.username} (${user.role === 'admin' ? '管理員' : '一般用戶'})</p>
                        <div style="margin-top: 15px;">
                            <a href="/game" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 5px;">
                                開始遊戲
                            </a>
                            ${user.role === 'admin' ? 
                                '<a href="/admin" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 5px;">管理後台</a>' : 
                                '<a href="/dashboard" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 5px;">儀表板</a>'
                            }
                            <button onclick="forceLogout()" style="display: inline-block; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; margin: 5px; cursor: pointer;">登出</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            messageBox.error('請輸入用戶名和密碼');
            return;
        }

        try {
            loadingOverlay.show('登入中...');
            
            const response = await auth.login(username, password);
            
            if (response.success) {
                messageBox.success('登入成功！正在跳轉...');
                
                // 立即跳轉，不使用 setTimeout 避免卡住
                loadingOverlay.show('跳轉中...');
                
                // 使用 location.replace 強制跳轉，避免卡住
                setTimeout(() => {
                    window.location.replace('/game');
                }, 500);
            }
        } catch (error) {
            messageBox.error(error.message || '登入失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const licenseKey = document.getElementById('licenseKey').value.trim();

        // 驗證輸入
        if (!username || !password || !licenseKey) {
            messageBox.error('請填寫所有必要欄位');
            return;
        }

        if (password.length < 6) {
            messageBox.error('密碼長度至少需要6位');
            return;
        }

        if (!this.licenseValidated) {
            messageBox.error('請先驗證許可證金鑰');
            return;
        }

        // 電子郵件格式驗證
        if (email && !this.isValidEmail(email)) {
            messageBox.error('請輸入有效的電子郵件地址');
            return;
        }

        try {
            loadingOverlay.show('註冊中...');
            
            const userData = {
                username,
                password,
                licenseKey
            };

            if (email) {
                userData.email = email;
            }

            const response = await auth.register(userData);
            
            if (response.success) {
                messageBox.success('註冊成功！請使用新帳戶登入');
                
                // 清空註冊表單
                document.getElementById('registerForm').reset();
                this.resetLicenseValidation();
                
                // 切換到登入標籤
                setTimeout(() => {
                    this.switchTab('login');
                    // 自動填入用戶名
                    document.getElementById('loginUsername').value = username;
                }, 1500);
            }
        } catch (error) {
            messageBox.error(error.message || '註冊失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    async validateLicense() {
        const licenseInput = document.getElementById('licenseKey');
        const validateBtn = document.querySelector('.validate-btn');
        const statusDiv = document.getElementById('licenseStatus');

        const licenseKey = licenseInput.value.trim();
        
        if (!licenseKey) {
            messageBox.error('請輸入許可證金鑰');
            return;
        }

        try {
            // 更新按鈕狀態
            validateBtn.className = 'validate-btn validating';
            validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            statusDiv.className = 'license-status validating';
            statusDiv.textContent = '驗證中...';

            const response = await api.request('/api/license/validate', {
                method: 'POST',
                body: JSON.stringify({ licenseKey })
            });

            if (response.valid) {
                // 驗證成功
                validateBtn.className = 'validate-btn valid';
                validateBtn.innerHTML = '<i class="fas fa-check"></i>';
                statusDiv.className = 'license-status valid';
                statusDiv.textContent = `✓ 許可證有效 (${response.duration_days}天期限)`;
                this.licenseValidated = true;
                
                messageBox.success('許可證驗證成功');
            } else {
                // 驗證失敗
                this.setLicenseInvalid(response.message);
            }
        } catch (error) {
            this.setLicenseInvalid(error.message || '驗證失敗');
        }
    }

    setLicenseInvalid(message) {
        const validateBtn = document.querySelector('.validate-btn');
        const statusDiv = document.getElementById('licenseStatus');
        
        validateBtn.className = 'validate-btn invalid';
        validateBtn.innerHTML = '<i class="fas fa-times"></i>';
        statusDiv.className = 'license-status invalid';
        statusDiv.textContent = `✗ ${message}`;
        this.licenseValidated = false;
    }

    resetLicenseValidation() {
        const validateBtn = document.querySelector('.validate-btn');
        const statusDiv = document.getElementById('licenseStatus');
        
        validateBtn.className = 'validate-btn';
        validateBtn.innerHTML = '<i class="fas fa-check"></i>';
        statusDiv.className = 'license-status';
        statusDiv.textContent = '';
        this.licenseValidated = false;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// 標籤切換功能
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');

    // 移除所有活動狀態
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));

    // 設置新的活動狀態
    const activeTab = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    const activeForm = document.getElementById(`${tabName}Form`);

    if (activeTab) activeTab.classList.add('active');
    if (activeForm) activeForm.classList.add('active');

    // 更新當前標籤
    if (window.loginPage) {
        window.loginPage.currentTab = tabName;
        if (tabName === 'register') {
            window.loginPage.resetLicenseValidation();
        }
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.loginPage = new LoginPage();
    
    // 添加輸入框焦點效果
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            if (this.value.trim() === '') {
                this.parentElement.classList.remove('filled');
            } else {
                this.parentElement.classList.add('filled');
            }
        });
        
        // 檢查初始值
        if (input.value.trim() !== '') {
            input.parentElement.classList.add('filled');
        }
    });

    // 表單驗證樣式
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.parentElement.classList.remove('error', 'success');
            
            // 即時驗證
            if (this.type === 'email' && this.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) {
                    this.parentElement.classList.add('success');
                } else {
                    this.parentElement.classList.add('error');
                }
            }
            
            if (this.type === 'password' && this.value) {
                if (this.value.length >= 6) {
                    this.parentElement.classList.add('success');
                } else {
                    this.parentElement.classList.add('error');
                }
            }
        });
    });

    // 回車鍵登入
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const activeForm = document.querySelector('.auth-form.active');
            if (activeForm) {
                const submitBtn = activeForm.querySelector('.auth-btn');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        }
    });
});

// 強制登出函數
function forceLogout() {
    console.log('強制登出');
    localStorage.clear();
    sessionStorage.clear();
    
    // 重置 auth 物件
    if (window.auth) {
        auth.user = null;
        auth.token = null;
    }
    
    // 重新載入頁面
    window.location.reload();
}