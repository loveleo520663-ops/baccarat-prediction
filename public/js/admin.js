// 管理員頁面JavaScript
class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentUser = null;
        this.currentPage = 1;
        this.init();
    }

    init() {
        // 檢查管理員權限
        if (!requireAdmin()) return;

        this.loadDashboardStats();
        this.bindEvents();
        this.updateUserInfo();
    }

    bindEvents() {
        // 側邊欄菜單點擊
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-menu-btn')) {
                this.toggleActionMenu(e.target.closest('.action-menu'));
            }

            // 點擊其他地方關閉菜單
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (user) {
            const usernameElements = document.querySelectorAll('#username');
            usernameElements.forEach(element => {
                element.textContent = user.username;
            });
        }
    }

    async loadDashboardStats() {
        try {
            const response = await api.request('/api/admin/stats');
            
            if (response.success) {
                this.updateStatsDisplay(response.stats);
            }
        } catch (error) {
            console.error('載入統計數據失敗:', error);
            messageBox.error('載入統計數據失敗');
        }
    }

    updateStatsDisplay(stats) {
        // 更新統計數字
        this.updateElement('totalUsers', stats.totalUsers || 0);
        this.updateElement('activeUsers', stats.activeUsers || 0);
        this.updateElement('totalLicenseKeys', stats.totalLicenseKeys || 0);
        this.updateElement('totalPredictions', stats.totalPredictions || 0);

        // 更新準確率圓圈
        const accuracyValue = document.getElementById('accuracyValue');
        const accuracyCircle = document.querySelector('.accuracy-circle');
        
        if (accuracyValue && accuracyCircle) {
            const accuracy = parseFloat(stats.accuracyRate) || 0;
            accuracyValue.textContent = `${accuracy}%`;
            
            // 設置CSS變數來控制圓圈進度
            accuracyCircle.style.setProperty('--accuracy', accuracy);
        }

        // 添加動畫效果
        this.animateNumbers();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    animateNumbers() {
        const numberElements = document.querySelectorAll('.stat-content h3');
        
        numberElements.forEach(element => {
            const finalValue = parseInt(element.textContent) || 0;
            const duration = 1500;
            const steps = 60;
            const increment = finalValue / steps;
            let currentValue = 0;
            let step = 0;

            const timer = setInterval(() => {
                currentValue += increment;
                step++;
                
                if (step >= steps) {
                    element.textContent = finalValue;
                    clearInterval(timer);
                } else {
                    element.textContent = Math.floor(currentValue);
                }
            }, duration / steps);
        });
    }

    async loadUsers() {
        try {
            loadingOverlay.show('載入用戶數據...');
            
            const response = await api.request('/api/admin/users');
            
            if (response.success) {
                this.displayUsers(response.users);
            }
        } catch (error) {
            console.error('載入用戶失敗:', error);
            messageBox.error('載入用戶失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">沒有用戶數據</td>
                </tr>
            `;
            return;
        }

        const html = users.map(user => {
            const statusClass = user.is_active ? 'active' : 'inactive';
            const statusText = user.is_active ? '啟用' : '禁用';
            const expiryText = user.license_expiry ? 
                utils.formatDate(user.license_expiry) : '-';
            const lastLoginText = user.last_login ? 
                utils.formatTimeAgo(user.last_login) : '從未登入';

            return `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.license_key || '-'}</td>
                    <td>${expiryText}</td>
                    <td>${lastLoginText}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-menu">
                            <button class="action-menu-btn">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="action-menu-items">
                                <button class="action-menu-item" onclick="toggleUserStatus(${user.id})">
                                    ${user.is_active ? '禁用' : '啟用'}用戶
                                </button>
                                <button class="action-menu-item" onclick="extendLicense(${user.id}, '${user.username}', '${user.license_expiry}')">
                                    延長許可證
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    }

    async loadLicenses(page = 1) {
        try {
            loadingOverlay.show('載入許可證數據...');
            
            const response = await api.request(`/api/admin/license/keys?page=${page}&limit=20`);
            
            if (response.success) {
                this.displayLicenses(response.keys, response.page, response.totalPages);
            }
        } catch (error) {
            console.error('載入許可證失敗:', error);
            messageBox.error('載入許可證失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    displayLicenses(licenses, currentPage, totalPages) {
        const tbody = document.getElementById('licensesTableBody');
        if (!tbody) return;

        if (!licenses || licenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">沒有許可證數據</td>
                </tr>
            `;
            return;
        }

        const html = licenses.map(license => {
            const statusClass = license.is_used ? 'used' : 'unused';
            const statusText = license.is_used ? '已使用' : '未使用';
            const usedByText = license.used_by_username || '-';
            const createdText = utils.formatDate(license.created_at);

            return `
                <tr>
                    <td>
                        <div class="key-code">${license.key_code}</div>
                    </td>
                    <td>${license.duration_days} 天</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${usedByText}</td>
                    <td>${createdText}</td>
                    <td>
                        ${!license.is_used ? `
                            <div class="action-menu">
                                <button class="action-menu-btn">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="action-menu-items">
                                    <button class="action-menu-item" onclick="copyLicenseKey('${license.key_code}')">
                                        複製金鑰
                                    </button>
                                    <button class="action-menu-item danger" onclick="deleteLicense(${license.id})">
                                        刪除金鑰
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <button class="action-menu-item" onclick="copyLicenseKey('${license.key_code}')">
                                複製
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;

        // 更新分頁
        this.updateLicensesPagination(currentPage, totalPages);
    }

    updateLicensesPagination(currentPage, totalPages) {
        const pagination = document.getElementById('licensesPagination');
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';

        // 上一頁
        if (currentPage > 1) {
            paginationHtml += `<button onclick="window.adminPanel.loadLicenses(${currentPage - 1})">上一頁</button>`;
        }

        // 頁碼
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHtml += `<button class="${activeClass}" onclick="window.adminPanel.loadLicenses(${i})">${i}</button>`;
        }

        // 下一頁
        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="window.adminPanel.loadLicenses(${currentPage + 1})">下一頁</button>`;
        }

        pagination.innerHTML = paginationHtml;
    }

    async generateLicenses() {
        const countInput = document.getElementById('keyCount');
        const durationInput = document.getElementById('keyDuration');

        const count = parseInt(countInput.value) || 1;
        const duration = parseInt(durationInput.value) || 30;

        if (count < 1 || count > 100) {
            messageBox.error('生成數量必須在 1-100 之間');
            return;
        }

        if (duration < 1 || duration > 365) {
            messageBox.error('有效期必須在 1-365 天之間');
            return;
        }

        try {
            loadingOverlay.show('生成許可證中...');

            const response = await api.request('/api/admin/license/generate', {
                method: 'POST',
                body: JSON.stringify({
                    count: count,
                    durationDays: duration
                })
            });

            if (response.success) {
                messageBox.success(response.message);
                this.showGeneratedKeys(response.keys);
                
                // 重新載入許可證列表
                this.loadLicenses();
                
                // 重新載入統計數據
                this.loadDashboardStats();
            }
        } catch (error) {
            console.error('生成許可證失敗:', error);
            messageBox.error(error.message || '生成許可證失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    showGeneratedKeys(keys) {
        const modal = document.getElementById('generatedKeysModal');
        const keysList = document.getElementById('generatedKeysList');

        if (!modal || !keysList) return;

        const keysHtml = keys.map(key => `
            <div class="generated-key-item">
                <div class="key-code">${key.key_code}</div>
                <div class="key-duration">${key.duration_days} 天</div>
                <button class="copy-key-btn" onclick="copyLicenseKey('${key.key_code}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `).join('');

        keysList.innerHTML = keysHtml;
        modal.classList.add('show');
    }

    toggleActionMenu(menu) {
        if (!menu) return;
        
        // 關閉其他菜單
        document.querySelectorAll('.action-menu').forEach(m => {
            if (m !== menu) {
                m.classList.remove('show');
            }
        });
        
        // 切換當前菜單
        menu.classList.toggle('show');
    }
}

// 全域函數
function showSection(sectionName) {
    // 隱藏所有區塊
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });

    // 移除所有菜單活動狀態
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // 顯示選中的區塊
    const section = document.getElementById(sectionName);
    const menuItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);

    if (section) section.classList.add('active');
    if (menuItem) menuItem.classList.add('active');

    // 載入對應數據
    if (window.adminPanel) {
        window.adminPanel.currentSection = sectionName;
        
        switch (sectionName) {
            case 'users':
                window.adminPanel.loadUsers();
                break;
            case 'licenses':
                window.adminPanel.loadLicenses();
                break;
            case 'dashboard':
                window.adminPanel.loadDashboardStats();
                break;
        }
    }
}

function refreshUsers() {
    if (window.adminPanel) {
        window.adminPanel.loadUsers();
    }
}

function refreshLicenses() {
    if (window.adminPanel) {
        window.adminPanel.loadLicenses();
    }
}

function generateLicenses() {
    if (window.adminPanel) {
        window.adminPanel.generateLicenses();
    }
}

async function toggleUserStatus(userId) {
    try {
        loadingOverlay.show('更新用戶狀態...');

        const response = await api.request(`/api/admin/users/${userId}/toggle`, {
            method: 'PUT'
        });

        if (response.success) {
            messageBox.success(response.message);
            refreshUsers();
        }
    } catch (error) {
        console.error('更新用戶狀態失敗:', error);
        messageBox.error(error.message || '更新用戶狀態失敗');
    } finally {
        loadingOverlay.hide();
    }
}

function extendLicense(userId, username, currentExpiry) {
    const modal = document.getElementById('extendModal');
    const usernameSpan = document.getElementById('extendUsername');
    const currentExpirySpan = document.getElementById('currentExpiry');
    const extendDaysInput = document.getElementById('extendDays');

    if (!modal) return;

    usernameSpan.textContent = username;
    currentExpirySpan.textContent = currentExpiry ? utils.formatDate(currentExpiry) : '無';
    extendDaysInput.value = 30;

    modal.classList.add('show');
    window.adminPanel.currentUser = userId;
}

async function submitExtend() {
    const extendDaysInput = document.getElementById('extendDays');
    const days = parseInt(extendDaysInput.value) || 0;
    const userId = window.adminPanel.currentUser;

    if (days <= 0) {
        messageBox.error('請輸入有效的延長天數');
        return;
    }

    try {
        loadingOverlay.show('延長許可證中...');

        const response = await api.request(`/api/admin/users/${userId}/extend-license`, {
            method: 'PUT',
            body: JSON.stringify({ days })
        });

        if (response.success) {
            messageBox.success(response.message);
            closeExtendModal();
            refreshUsers();
        }
    } catch (error) {
        console.error('延長許可證失敗:', error);
        messageBox.error(error.message || '延長許可證失敗');
    } finally {
        loadingOverlay.hide();
    }
}

function closeExtendModal() {
    const modal = document.getElementById('extendModal');
    if (modal) {
        modal.classList.remove('show');
    }
    window.adminPanel.currentUser = null;
}

function closeGeneratedKeysModal() {
    const modal = document.getElementById('generatedKeysModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function copyLicenseKey(keyCode) {
    await utils.copyToClipboard(keyCode);
}

function copyAllKeys() {
    const keyElements = document.querySelectorAll('.generated-key-item .key-code');
    const keys = Array.from(keyElements).map(el => el.textContent).join('\n');
    utils.copyToClipboard(keys);
}

async function deleteLicense(licenseId) {
    if (!confirm('確定要刪除這個許可證金鑰嗎？此操作無法撤銷。')) {
        return;
    }

    try {
        loadingOverlay.show('刪除許可證中...');

        const response = await api.request(`/api/admin/license/${licenseId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            messageBox.success(response.message);
            refreshLicenses();
        }
    } catch (error) {
        console.error('刪除許可證失敗:', error);
        messageBox.error(error.message || '刪除許可證失敗');
    } finally {
        loadingOverlay.hide();
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.adminPanel = new AdminPanel();

    // 模態框外部點擊關閉
    document.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // ESC鍵關閉模態框
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
});