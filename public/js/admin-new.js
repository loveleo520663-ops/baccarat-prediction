// 全域變數
let currentSection = 'dashboard';
let allUsers = [];

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// 初始化管理介面
function initializeAdmin() {
    console.log('🚀 初始化管理後台');
    
    // 檢查登入狀態
    checkAuthStatus();
    
    // 設置導航事件
    setupNavigation();
    
    // 載入儀表板數據
    loadDashboardData();
    
    // 設置表單事件
    setupForms();
}

// 檢查認證狀態
function checkAuthStatus() {
    // 暫時簡化認證檢查，直接允許訪問
    console.log('🔓 認證檢查已簡化，允許訪問管理後台');
}

// 設置導航事件
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const section = this.getAttribute('data-section');
            switchSection(section);
            
            // 更新導航狀態
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// 切換內容區域
function switchSection(section) {
    // 隱藏所有區域
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // 顯示目標區域
    document.getElementById(section).classList.add('active');
    
    // 更新標題
    const titles = {
        'dashboard': '儀表板',
        'users': '用戶管理',
        'register': '註冊用戶',
        'licenses': '金鑰管理'
    };
    document.getElementById('page-title').textContent = titles[section];
    
    // 載入對應數據
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'licenses':
            loadLicenses();
            break;
    }
    
    currentSection = section;
}

// 載入儀表板數據
async function loadDashboardData() {
    try {
        console.log('📊 載入儀表板數據');
        
        // 載入統計數據
        console.log('🔍 調用統計 API: /api/admin-new/stats');
        const statsResponse = await fetchWithAuth('/api/admin-new/stats');
        console.log('📊 統計 API 響應狀態:', statsResponse.status);
        const stats = await statsResponse.json();
        console.log('📊 統計數據:', stats);
        
        if (stats.success) {
            updateDashboardStats(stats.data);
        } else {
            console.error('❌ 統計數據載入失敗:', stats.message);
            showNotification('統計數據載入失敗: ' + (stats.message || '未知錯誤'), 'error');
        }
        
        // 載入最近用戶
        console.log('🔍 調用用戶 API: /api/admin-new/users');
        const usersResponse = await fetchWithAuth('/api/admin-new/users');
        console.log('👥 用戶 API 響應狀態:', usersResponse.status);
        const users = await usersResponse.json();
        console.log('👥 用戶數據:', users);
        
        if (users.success) {
            updateRecentUsers(users.users.slice(0, 5)); // 只顯示最近5個用戶
        } else {
            console.error('❌ 用戶數據載入失敗:', users.message);
            showNotification('用戶數據載入失敗: ' + (users.message || '未知錯誤'), 'error');
        }
        
    } catch (error) {
        console.error('❌ 載入儀表板數據失敗:', error);
        showNotification('載入數據失敗: ' + error.message, 'error');
    }
}

// 更新儀表板統計
function updateDashboardStats(stats) {
    document.getElementById('total-users').textContent = stats.totalUsers || 0;
    document.getElementById('active-users').textContent = stats.activeUsers || 0;
    document.getElementById('expired-users').textContent = stats.expiredUsers || 0;
    document.getElementById('total-licenses').textContent = stats.totalLicenses || 0;
}

// 更新最近用戶表格
function updateRecentUsers(users) {
    const tbody = document.getElementById('recent-users-table');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">暫無用戶數據</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${formatDate(user.created_at || new Date())}</td>
            <td>${formatDate(user.expiration_date)}</td>
            <td>
                <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                    ${user.is_active ? '啟用' : '停用'}
                </span>
            </td>
        </tr>
    `).join('');
}

// 載入用戶數據
async function loadUsers() {
    try {
        console.log('👥 開始載入用戶數據...');
        
        console.log('📡 向 /api/admin-new/users 發送請求...');
        const response = await fetchWithAuth('/api/admin-new/users');
        console.log('📥 用戶API響應狀態:', response.status);
        
        const data = await response.json();
        console.log('👥 用戶API響應數據:', data);
        
        if (data.success) {
            console.log('✅ 用戶數據載入成功，用戶數量:', data.users ? data.users.length : 0);
            if (data.users && data.users.length > 0) {
                console.log('👤 第一個用戶示例:', data.users[0]);
            }
            allUsers = data.users || [];
            updateUsersTable(allUsers);
        } else {
            console.error('❌ 用戶API返回失敗:', data.message);
            throw new Error(data.message || '載入用戶失敗');
        }
        
    } catch (error) {
        console.error('💥 載入用戶數據時發生錯誤:', error);
        console.error('錯誤詳情:', error.stack);
        document.getElementById('users-table').innerHTML = 
            '<tr><td colspan="6" style="text-align:center;color:#f56565;">載入用戶數據失敗: ' + error.message + '</td></tr>';
    }
}

// 更新用戶表格
function updateUsersTable(users) {
    const tbody = document.getElementById('users-table');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">暫無用戶數據</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.duration_days > 0 ? user.duration_days + ' 天' : '永久'}</td>
            <td>${formatDate(user.expiration_date)}</td>
            <td>
                <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                    ${user.is_active ? '啟用' : '停用'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">
                    <i class="fas fa-trash"></i>
                </button>
                ${user.is_active ? 
                    `<button class="btn btn-sm btn-warning" onclick="toggleUser(${user.id}, false)">停用</button>` :
                    `<button class="btn btn-sm btn-success" onclick="toggleUser(${user.id}, true)">啟用</button>`
                }
            </td>
        </tr>
    `).join('');
}

// 載入金鑰數據
async function loadLicenses() {
    try {
        console.log('🔑 載入金鑰數據');
        
        const response = await fetchWithAuth('/api/admin-new/licenses');
        const data = await response.json();
        
        if (data.success) {
            updateLicensesTable(data.licenses);
        } else {
            throw new Error(data.message || '載入金鑰失敗');
        }
        
    } catch (error) {
        console.error('載入金鑰失敗:', error);
        document.getElementById('licenses-table').innerHTML = 
            '<tr><td colspan="5" style="text-align:center;color:#f56565;">載入金鑰數據失敗</td></tr>';
    }
}

// 更新金鑰表格
function updateLicensesTable(licenses) {
    const tbody = document.getElementById('licenses-table');
    
    if (licenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">暫無金鑰數據</td></tr>';
        return;
    }
    
    tbody.innerHTML = licenses.map(license => `
        <tr>
            <td><code>${license.key}</code></td>
            <td>${license.duration_days > 0 ? license.duration_days + ' 天' : '永久'}</td>
            <td>${formatDate(license.created_at)}</td>
            <td>
                <span class="badge ${license.used ? 'badge-danger' : 'badge-success'}">
                    ${license.used ? '已使用' : '未使用'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="copyLicense('${license.key}')">
                    <i class="fas fa-copy"></i> 複製
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteLicense('${license.key}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 設置表單事件
function setupForms() {
    // 註冊表單
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', handleRegister);
    
    // 編輯用戶表單
    const editUserForm = document.getElementById('edit-user-form');
    editUserForm.addEventListener('submit', handleEditUser);
}

// 處理用戶註冊
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const duration = parseInt(document.getElementById('register-duration').value);
    
    // 驗證輸入
    if (!username || !password) {
        showNotification('請填寫所有必填欄位', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('密碼確認不一致', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/api/admin-new/users', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                duration_days: duration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('用戶註冊成功', 'success');
            document.getElementById('register-form').reset();
            
            // 如果在用戶管理頁面，重新載入數據
            if (currentSection === 'users') {
                loadUsers();
            }
        } else {
            throw new Error(result.message || '註冊失敗');
        }
        
    } catch (error) {
        console.error('註冊失敗:', error);
        showNotification(error.message || '註冊失敗', 'error');
    }
}

// 編輯用戶
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showNotification('找不到用戶', 'error');
        return;
    }
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-duration').value = user.duration_days;
    
    showModal('edit-user-modal');
}

// 處理編輯用戶
async function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const duration = parseInt(document.getElementById('edit-duration').value);
    
    try {
        const response = await fetchWithAuth(`/api/admin-new/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                duration_days: duration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('用戶更新成功', 'success');
            closeModal('edit-user-modal');
            loadUsers();
        } else {
            throw new Error(result.message || '更新失敗');
        }
        
    } catch (error) {
        console.error('更新用戶失敗:', error);
        showNotification(error.message || '更新失敗', 'error');
    }
}

// 刪除用戶
async function deleteUser(userId, username) {
    if (!confirm(`確定要刪除用戶 "${username}" 嗎？此操作不可復原。`)) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/admin-new/users/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('用戶已刪除', 'success');
            loadUsers();
        } else {
            throw new Error(result.message || '刪除失敗');
        }
        
    } catch (error) {
        console.error('刪除用戶失敗:', error);
        showNotification(error.message || '刪除失敗', 'error');
    }
}

// 切換用戶狀態
async function toggleUser(userId, isActive) {
    try {
        const response = await fetchWithAuth(`/api/admin-new/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                is_active: isActive
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`用戶已${isActive ? '啟用' : '停用'}`, 'success');
            loadUsers();
        } else {
            throw new Error(result.message || '操作失敗');
        }
        
    } catch (error) {
        console.error('切換用戶狀態失敗:', error);
        showNotification(error.message || '操作失敗', 'error');
    }
}

// 生成金鑰
async function generateLicense() {
    const duration = prompt('請輸入金鑰有效期（天數，0 表示永久）：', '30');
    if (duration === null) return;
    
    const durationDays = parseInt(duration);
    if (isNaN(durationDays) || durationDays < 0) {
        showNotification('請輸入有效的天數', 'error');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/api/admin-new/licenses', {
            method: 'POST',
            body: JSON.stringify({
                duration_days: durationDays
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('金鑰生成成功', 'success');
            loadLicenses();
        } else {
            throw new Error(result.message || '生成失敗');
        }
        
    } catch (error) {
        console.error('生成金鑰失敗:', error);
        showNotification(error.message || '生成失敗', 'error');
    }
}

// 複製金鑰
function copyLicense(key) {
    navigator.clipboard.writeText(key).then(() => {
        showNotification('金鑰已複製到剪貼板', 'success');
    }).catch(err => {
        console.error('複製失敗:', err);
        showNotification('複製失敗', 'error');
    });
}

// 刪除金鑰
async function deleteLicense(key) {
    if (!confirm('確定要刪除此金鑰嗎？')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/admin-new/licenses/${encodeURIComponent(key)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('金鑰已刪除', 'success');
            loadLicenses();
        } else {
            throw new Error(result.message || '刪除失敗');
        }
        
    } catch (error) {
        console.error('刪除金鑰失敗:', error);
        showNotification(error.message || '刪除失敗', 'error');
    }
}

// 重設用戶密碼
function resetUserPassword() {
    const username = document.getElementById('edit-username').value;
    const newPassword = prompt(`重設用戶 "${username}" 的密碼：`);
    
    if (!newPassword) return;
    
    // 這裡添加重設密碼的 API 調用
    showNotification('密碼重設功能開發中', 'info');
}

// 刷新用戶數據
function refreshUsers() {
    loadUsers();
    showNotification('用戶數據已刷新', 'success');
}

// 登出
function logout() {
    if (confirm('確定要登出嗎？')) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login.html';
    }
}

// 工具函數：帶認證的 fetch
function fetchWithAuth(url, options = {}) {
    // 暫時簡化，不需要 token
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '無';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '無效日期';
    
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 顯示通知
function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // 添加樣式（如果還沒有的話）
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease;
            }
            
            .notification-success {
                border-left: 4px solid #48bb78;
                color: #38a169;
            }
            
            .notification-error {
                border-left: 4px solid #f56565;
                color: #e53e3e;
            }
            
            .notification-warning {
                border-left: 4px solid #ed8936;
                color: #dd6b20;
            }
            
            .notification-info {
                border-left: 4px solid #667eea;
                color: #5a67d8;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒後自動移除
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 獲取通知圖標
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// 顯示模態框
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// 關閉模態框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 點擊模態框外部關閉
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});