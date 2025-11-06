// 主控台頁面JavaScript
class Dashboard {
    constructor() {
        this.stats = null;
        this.predictions = [];
        this.init();
    }

    init() {
        // 檢查權限
        if (!requireAuth()) return;

        this.loadStats();
        this.loadRecentPredictions();
        this.updateUserInfo();
    }

    async loadStats() {
        try {
            const response = await api.request('/api/prediction/stats');
            
            if (response.success) {
                this.stats = response.stats;
                this.updateStatsDisplay();
                this.updatePredictionBreakdown();
            }
        } catch (error) {
            console.error('載入統計數據失敗:', error);
            this.displayEmptyStats();
        }
    }

    async loadRecentPredictions() {
        try {
            const response = await api.request('/api/prediction/history?limit=5');
            
            if (response.success) {
                this.predictions = response.predictions || [];
                this.displayRecentPredictions();
            }
        } catch (error) {
            console.error('載入最近預測失敗:', error);
            this.displayEmptyPredictions();
        }
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (!user) return;

        // 更新用戶名
        const usernameElements = document.querySelectorAll('#username');
        usernameElements.forEach(element => {
            element.textContent = user.username;
        });

        // 更新許可證資訊
        const licenseExpiryElement = document.getElementById('licenseExpiry');
        if (licenseExpiryElement && user.license_expiry) {
            const daysRemaining = utils.getDaysRemaining(user.license_expiry);
            
            if (daysRemaining > 7) {
                licenseExpiryElement.textContent = `剩餘 ${daysRemaining} 天`;
                licenseExpiryElement.style.color = 'var(--success-color)';
            } else if (daysRemaining > 0) {
                licenseExpiryElement.textContent = `剩餘 ${daysRemaining} 天`;
                licenseExpiryElement.style.color = 'var(--warning-color)';
            } else {
                licenseExpiryElement.textContent = '已過期';
                licenseExpiryElement.style.color = 'var(--error-color)';
                
                // 顯示過期警告
                messageBox.warning('您的許可證已過期，請聯繫管理員延長', 0);
            }
        }
    }

    updateStatsDisplay() {
        if (!this.stats) return;

        // 更新統計數字
        this.updateElement('totalPredictions', this.stats.totalPredictions || 0);
        this.updateElement('overallAccuracy', `${this.stats.overallAccuracy || 0}%`);
        this.updateElement('recentAccuracy', `${this.stats.recentAccuracy || 0}%`);
        this.updateElement('correctPredictions', this.stats.correctPredictions || 0);

        // 添加動畫效果
        this.animateNumbers();
    }

    updatePredictionBreakdown() {
        if (!this.stats || !this.stats.predictionBreakdown) return;

        const breakdown = this.stats.predictionBreakdown;
        const total = breakdown.reduce((sum, item) => sum + item.count, 0);

        if (total === 0) {
            this.displayEmptyBreakdown();
            return;
        }

        // 計算百分比並更新顯示
        breakdown.forEach(item => {
            const percentage = Math.round((item.count / total) * 100);
            const countElement = document.getElementById(`${item.predicted_result}Count`);
            const barElement = document.getElementById(`${item.predicted_result}Bar`);

            if (countElement) {
                countElement.textContent = `${item.count} (${percentage}%)`;
            }

            if (barElement) {
                setTimeout(() => {
                    barElement.style.width = `${percentage}%`;
                }, 300);
            }
        });
    }

    displayRecentPredictions() {
        const container = document.getElementById('recentPredictions');
        if (!container) return;

        if (this.predictions.length === 0) {
            this.displayEmptyPredictions();
            return;
        }

        const html = this.predictions.map(prediction => {
            const cardColorsHtml = JSON.parse(prediction.card_pattern).map(color => 
                `<div class="card-color ${color}"></div>`
            ).join('');

            const statusClass = prediction.is_correct === null ? 'pending' : 
                              prediction.is_correct ? 'correct' : 'incorrect';
            const statusText = prediction.is_correct === null ? '待確認' : 
                             prediction.is_correct ? '正確' : '錯誤';

            return `
                <div class="prediction-item">
                    <div class="prediction-info">
                        <div class="prediction-cards">${cardColorsHtml}</div>
                        <div class="prediction-result ${prediction.predicted_result}">
                            預測: ${this.getResultText(prediction.predicted_result)}
                        </div>
                        <div class="prediction-meta">
                            ${utils.formatDate(prediction.created_at)}
                        </div>
                    </div>
                    <div class="prediction-status">
                        <div class="status-badge ${statusClass}">${statusText}</div>
                        <div class="confidence-display">${Math.round(prediction.confidence_score * 100)}%</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    displayEmptyPredictions() {
        const container = document.getElementById('recentPredictions');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>還沒有預測記錄</h3>
                <p>開始您的第一次預測分析吧！</p>
                <a href="/prediction" class="action-btn primary">開始預測</a>
            </div>
        `;
    }

    displayEmptyStats() {
        this.updateElement('totalPredictions', 0);
        this.updateElement('overallAccuracy', '0%');
        this.updateElement('recentAccuracy', '0%');
        this.updateElement('correctPredictions', 0);
    }

    displayEmptyBreakdown() {
        ['banker', 'player', 'tie'].forEach(result => {
            const countElement = document.getElementById(`${result}Count`);
            const barElement = document.getElementById(`${result}Bar`);

            if (countElement) countElement.textContent = '0 (0%)';
            if (barElement) barElement.style.width = '0%';
        });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    getResultText(result) {
        const resultMap = {
            'banker': '莊家',
            'player': '閒家',
            'tie': '和局'
        };
        return resultMap[result] || result;
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
                    if (element.textContent.includes('%')) {
                        element.textContent += '%';
                    }
                    clearInterval(timer);
                } else {
                    const displayValue = Math.floor(currentValue);
                    element.textContent = displayValue;
                    if (element.parentElement.querySelector('p').textContent.includes('準確率')) {
                        element.textContent += '%';
                    }
                }
            }, duration / steps);
        });
    }

    // 刷新數據
    async refreshData() {
        loadingOverlay.show('刷新數據...');
        
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentPredictions()
            ]);
            
            messageBox.success('數據已更新');
        } catch (error) {
            messageBox.error('刷新失敗');
        } finally {
            loadingOverlay.hide();
        }
    }
}

// 全域刷新函數
function refreshDashboard() {
    if (window.dashboard) {
        window.dashboard.refreshData();
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();

    // 添加下拉刷新功能（移動端）
    let startY = 0;
    let startX = 0;
    let isRefreshing = false;

    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].pageY;
        startX = e.touches[0].pageX;
    });

    document.addEventListener('touchmove', function(e) {
        if (isRefreshing) return;
        
        const currentY = e.touches[0].pageY;
        const currentX = e.touches[0].pageX;
        const diffY = currentY - startY;
        const diffX = Math.abs(currentX - startX);
        
        // 向下滑動超過50px且水平移動小於30px，並且在頁面頂部
        if (diffY > 50 && diffX < 30 && window.scrollY === 0) {
            isRefreshing = true;
            refreshDashboard();
            
            setTimeout(() => {
                isRefreshing = false;
            }, 2000);
        }
    });

    // 定期自動刷新（每5分鐘）
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            refreshDashboard();
        }
    }, 5 * 60 * 1000);

    // 頁面可見時刷新
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            refreshDashboard();
        }
    });
});