// 共用JavaScript功能
class ApiClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            console.log('🌐 API 請求:', { url, method: config.method || 'GET' });
            const response = await fetch(url, config);
            console.log('📡 API 回應狀態:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('📦 API 數據:', data);

            // 不管狀態碼如何，都返回數據讓調用者處理
            return data;
        } catch (error) {
            console.error('❌ API請求錯誤:', error);
            throw error;
        }
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }
}

// 全域API客戶端實例
const api = new ApiClient();

// 訊息提示功能
class MessageBox {
    constructor() {
        this.container = document.getElementById('messageBox');
        this.icon = document.getElementById('messageIcon');
        this.text = document.getElementById('messageText');
        this.timeout = null;
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.container) return;

        // 清除之前的timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // 設置圖標
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        this.icon.className = icons[type] || icons.info;
        this.text.textContent = message;

        // 設置樣式類別
        this.container.className = `message-box ${type}`;
        
        // 顯示
        setTimeout(() => {
            this.container.classList.add('show');
        }, 10);

        // 自動隱藏
        if (duration > 0) {
            this.timeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    hide() {
        if (!this.container) return;
        
        this.container.classList.remove('show');
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// 全域訊息提示實例
const messageBox = new MessageBox();

// 載入動畫功能
class LoadingOverlay {
    constructor() {
        this.overlay = document.getElementById('loadingOverlay');
    }

    show(message = '載入中...') {
        if (!this.overlay) return;
        
        const messageElement = this.overlay.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        this.overlay.classList.add('show');
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.remove('show');
    }
}

// 全域載入動畫實例
const loadingOverlay = new LoadingOverlay();

// 身份驗證功能
class Auth {
    constructor() {
        this.user = null;
        this.loadUserFromStorage();
    }

    loadUserFromStorage() {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                this.user = JSON.parse(userData);
                api.setToken(token);
            } catch (error) {
                console.error('載入用戶資料失敗:', error);
                this.logout();
            }
        }
    }


    async login(username, password) {
        try {
            const response = await api.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.success) {
                this.user = response.user;
                api.setToken(response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                return response;
            }

            throw new Error(response.error || '登入失敗');
        } catch (error) {
            console.error('登入錯誤:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await api.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                return response;
            }

            throw new Error(response.error || '註冊失敗');
        } catch (error) {
            console.error('註冊錯誤:', error);
            throw error;
        }
    }

    logout() {
        console.log('執行登出...');
        this.user = null;
        api.clearToken();
        
        // 清除所有相關的本地存儲
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('loginTime');
        
        // 清除 sessionStorage
        sessionStorage.clear();
        
        console.log('登出完成，準備重定向...');
        
        // 延遲一點確保清理完成
        setTimeout(() => {
            window.location.href = '/login';
        }, 100);
    }

    isAuthenticated() {
        return !!(this.user && localStorage.getItem('token'));
    }

    isAdmin() {
        return this.user && this.user.role === 'admin';
    }

    getUser() {
        return this.user;
    }

    async checkTokenValidity() {
        try {
            await api.request('/api/auth/me', {
                method: 'GET'
            });
            return true;
        } catch (error) {
            console.error('Token驗證失敗:', error);
            this.logout();
            return false;
        }
    }
}

// 全域身份驗證實例
const auth = new Auth();

// 工具函數
const utils = {
    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天 ' + date.toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays === 1) {
            return '昨天 ' + date.toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-TW');
        }
    },

    // 格式化時間距離
    formatTimeAgo(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        
        const minutes = Math.floor(diffTime / (1000 * 60));
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return '剛才';
        if (minutes < 60) return `${minutes}分鐘前`;
        if (hours < 24) return `${hours}小時前`;
        if (days < 30) return `${days}天前`;
        
        return date.toLocaleDateString('zh-TW');
    },

    // 複製到剪貼板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            messageBox.success('已複製到剪貼板');
        } catch (error) {
            console.error('複製失敗:', error);
            // 降級處理
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            messageBox.success('已複製到剪貼板');
        }
    },

    // 防抖函數
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 節流函數
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 驗證許可證到期
    isLicenseExpired(expiryDate) {
        if (!expiryDate) return true;
        return new Date(expiryDate) < new Date();
    },

    // 計算剩餘天數
    getDaysRemaining(expiryDate) {
        if (!expiryDate) return 0;
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    },

    // 生成隨機ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // 安全的JSON解析
    safeJsonParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            console.error('JSON解析失敗:', error);
            return defaultValue;
        }
    }
};

// 頁面權限檢查
function requireAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!auth.isAuthenticated() || !auth.isAdmin()) {
        window.location.href = '/dashboard';
        return false;
    }
    return true;
}

// 全域登出函數
function logout() {
    try {
        console.log('全域登出函數被調用');
        
        // 強制清除所有登入資料
        localStorage.clear();
        sessionStorage.clear();
        
        // 重置全域物件
        if (window.auth) {
            auth.user = null;
            auth.token = null;
        }
        
        if (window.api) {
            api.token = null;
        }
        
        console.log('登出完成，重定向到登入頁面');
        
        // 強制重定向
        window.location.href = '/login';
        
    } catch (error) {
        console.error('登出過程中發生錯誤:', error);
        // 即使出錯也要清理和重定向
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    // 設置用戶資訊顯示
    const usernameElements = document.querySelectorAll('#username');
    if (auth.isAuthenticated()) {
        const user = auth.getUser();
        usernameElements.forEach(element => {
            element.textContent = user.username;
        });

        // 顯示許可證資訊
        const licenseExpiryElement = document.getElementById('licenseExpiry');
        if (licenseExpiryElement && user.license_expiry) {
            const daysRemaining = utils.getDaysRemaining(user.license_expiry);
            if (daysRemaining > 0) {
                licenseExpiryElement.textContent = `剩餘 ${daysRemaining} 天`;
            } else {
                licenseExpiryElement.textContent = '已過期';
                licenseExpiryElement.style.color = 'var(--error-color)';
            }
        }
    }

    // 點擊訊息框外部關閉
    document.addEventListener('click', function(event) {
        const messageBox = document.getElementById('messageBox');
        if (messageBox && !messageBox.contains(event.target)) {
            messageBox.classList.remove('show');
        }
    });

    // 全域錯誤處理
    window.addEventListener('unhandledrejection', function(event) {
        console.error('未處理的Promise拒絕:', event.reason);
        messageBox.error('發生未知錯誤，請重新整理頁面');
    });

    // 檢查網路連線
    if (!navigator.onLine) {
        messageBox.warning('網路連線異常，部分功能可能無法使用');
    }

    window.addEventListener('online', () => {
        messageBox.success('網路連線已恢復');
    });

    window.addEventListener('offline', () => {
        messageBox.warning('網路連線已中斷');
    });
});

// 定期檢查Token有效性（每30分鐘）
if (auth.isAuthenticated()) {
    setInterval(async () => {
        await auth.checkTokenValidity();
    }, 30 * 60 * 1000);
}