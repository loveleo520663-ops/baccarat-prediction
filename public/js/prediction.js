// 預測頁面JavaScript
class PredictionPage {
    constructor() {
        this.selectedCards = Array(5).fill(null);
        this.currentSlot = 0;
        this.currentPrediction = null;
        this.gameHistory = [];
        this.historyPage = 1;
        this.init();
    }

    init() {
        // 檢查權限
        if (!requireAuth()) return;

        this.bindEvents();
        this.loadHistory();
        this.updateUserInfo();
        this.checkLicenseStatus();
    }

    bindEvents() {
        // 牌色選擇按鈕
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.selectCardColor(color);
            });
        });

        // 卡片槽點擊
        const cardSlots = document.querySelectorAll('.card-slot');
        cardSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.selectSlot(index);
            });
        });

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '5') {
                this.selectSlot(parseInt(e.key) - 1);
            } else if (e.key === 'r' || e.key === 'R') {
                this.selectCardColor('red');
            } else if (e.key === 'b' || e.key === 'B') {
                this.selectCardColor('black');
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                this.clearSelection();
            } else if (e.key === 'Enter') {
                if (this.canGeneratePrediction()) {
                    this.generatePrediction();
                }
            }
        });
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (!user) return;

        const usernameElements = document.querySelectorAll('#username');
        usernameElements.forEach(element => {
            element.textContent = user.username;
        });
    }

    checkLicenseStatus() {
        const user = auth.getUser();
        if (!user || !user.license_expiry) return;

        const daysRemaining = utils.getDaysRemaining(user.license_expiry);
        if (daysRemaining <= 0) {
            messageBox.error('您的許可證已過期，無法使用預測功能', 0);
            document.querySelector('.action-btn.primary').disabled = true;
        } else if (daysRemaining <= 3) {
            messageBox.warning(`您的許可證即將在 ${daysRemaining} 天後過期`, 0);
        }
    }

    selectSlot(index) {
        if (index < 0 || index >= 5) return;

        // 移除之前選中的槽
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.classList.remove('selected');
        });

        // 選中新槽
        const slot = document.querySelector(`[data-index="${index}"]`);
        if (slot) {
            slot.classList.add('selected');
            this.currentSlot = index;
        }
    }

    selectCardColor(color) {
        if (this.currentSlot === null || this.currentSlot < 0 || this.currentSlot >= 5) {
            // 如果沒有選中槽，自動選擇下一個空槽
            this.currentSlot = this.getNextEmptySlot();
            if (this.currentSlot === -1) {
                messageBox.warning('所有卡片槽都已填滿');
                return;
            }
        }

        // 設置卡片顏色
        this.selectedCards[this.currentSlot] = color;
        this.updateCardSlot(this.currentSlot, color);

        // 自動選擇下一個槽
        const nextSlot = this.getNextEmptySlot();
        if (nextSlot !== -1) {
            this.selectSlot(nextSlot);
        } else {
            // 所有槽都填滿了，取消選中
            document.querySelectorAll('.card-slot').forEach(slot => {
                slot.classList.remove('selected');
            });
            this.currentSlot = null;
        }

        this.updateGenerateButton();
    }

    updateCardSlot(index, color) {
        const slot = document.querySelector(`[data-index="${index}"]`);
        if (!slot) return;

        slot.className = `card-slot ${color}`;
        
        const placeholder = slot.querySelector('.card-placeholder');
        if (placeholder) {
            const colorText = color === 'red' ? '紅牌' : '黑牌';
            const icon = color === 'red' ? 'fas fa-heart' : 'fas fa-spade';
            
            placeholder.innerHTML = `
                <i class="${icon}"></i>
                <span>${colorText}</span>
            `;
        }
    }

    getNextEmptySlot() {
        for (let i = 0; i < 5; i++) {
            if (this.selectedCards[i] === null) {
                return i;
            }
        }
        return -1;
    }

    clearSelection() {
        this.selectedCards = Array(5).fill(null);
        this.currentSlot = 0;

        // 重置所有卡片槽
        const slots = document.querySelectorAll('.card-slot');
        slots.forEach((slot, index) => {
            slot.className = 'card-slot';
            const placeholder = slot.querySelector('.card-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <i class="fas fa-plus"></i>
                    <span>第${index + 1}張</span>
                `;
            }
        });

        // 選中第一個槽
        this.selectSlot(0);
        this.updateGenerateButton();
        
        // 隱藏預測結果
        const resultSection = document.getElementById('predictionResult');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
    }

    canGeneratePrediction() {
        return this.selectedCards.every(card => card !== null);
    }

    updateGenerateButton() {
        const generateBtn = document.querySelector('[onclick="generatePrediction()"]');
        if (generateBtn) {
            generateBtn.disabled = !this.canGeneratePrediction();
        }
    }

    async generatePrediction() {
        if (!this.canGeneratePrediction()) {
            messageBox.error('請選擇所有5張牌的顏色');
            return;
        }

        try {
            loadingOverlay.show('AI正在分析中...');

            const response = await api.request('/api/prediction/predict', {
                method: 'POST',
                body: JSON.stringify({
                    cardColors: this.selectedCards,
                    gameHistory: this.gameHistory.slice(-20) // 只發送最近20局
                })
            });

            if (response.success) {
                this.currentPrediction = {
                    id: response.predictionId,
                    ...response.result
                };
                
                this.displayPredictionResult();
                messageBox.success('預測生成成功！');
            }
        } catch (error) {
            console.error('生成預測失敗:', error);
            messageBox.error(error.message || '預測生成失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    displayPredictionResult() {
        if (!this.currentPrediction) return;

        const resultSection = document.getElementById('predictionResult');
        if (!resultSection) return;

        // 更新預測結果顯示
        const outcomeDisplay = document.getElementById('outcomeDisplay');
        if (outcomeDisplay) {
            const resultText = this.getResultText(this.currentPrediction.prediction);
            const resultIcon = this.getResultIcon(this.currentPrediction.prediction);
            
            outcomeDisplay.className = `outcome-display ${this.currentPrediction.prediction}`;
            outcomeDisplay.innerHTML = `
                <i class="${resultIcon}"></i>
                <span>${resultText}</span>
            `;
        }

        // 更新信心度
        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceFill && confidenceValue) {
            const confidence = this.currentPrediction.confidence;
            confidenceValue.textContent = `${confidence}%`;
            
            setTimeout(() => {
                confidenceFill.style.width = `${confidence}%`;
            }, 300);
        }

        // 更新機率分析
        this.updateProbabilityBars();

        // 更新分析因素
        this.updateAnalysisFactors();

        // 顯示結果區域
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    updateProbabilityBars() {
        if (!this.currentPrediction) return;

        const probabilities = this.currentPrediction.probabilities;
        
        ['banker', 'player', 'tie'].forEach(result => {
            const probability = probabilities[result];
            const fillElement = document.getElementById(`${result}Prob`);
            const valueElement = document.getElementById(`${result}Value`);

            if (fillElement && valueElement) {
                valueElement.textContent = `${probability}%`;
                
                setTimeout(() => {
                    fillElement.style.width = `${probability}%`;
                }, 500);
            }
        });
    }

    updateAnalysisFactors() {
        if (!this.currentPrediction || !this.currentPrediction.analysis) return;

        const factorsList = document.getElementById('factorsList');
        if (!factorsList) return;

        const factors = this.currentPrediction.analysis.factors || [];
        
        if (factors.length === 0) {
            factorsList.innerHTML = '<div class="factor-item"><i class="fas fa-info-circle"></i>基於標準機率分析</div>';
            return;
        }

        const factorsHtml = factors.map(factor => `
            <div class="factor-item">
                <i class="fas fa-lightbulb"></i>
                ${factor}
            </div>
        `).join('');

        factorsList.innerHTML = factorsHtml;
    }

    async confirmResult(actualResult) {
        if (!this.currentPrediction) {
            messageBox.error('沒有可確認的預測');
            return;
        }

        try {
            loadingOverlay.show('確認結果中...');

            const response = await api.request(`/api/prediction/predict/${this.currentPrediction.id}/confirm`, {
                method: 'PUT',
                body: JSON.stringify({ actualResult })
            });

            if (response.success) {
                // 添加到遊戲歷史
                this.gameHistory.push(actualResult.charAt(0).toUpperCase()); // B, P, T
                
                // 顯示結果
                const isCorrect = response.isCorrect;
                if (isCorrect) {
                    messageBox.success('🎉 預測正確！恭喜您！');
                } else {
                    messageBox.info('預測錯誤，繼續加油！');
                }

                // 重新載入歷史記錄
                this.loadHistory();

                // 清除當前預測
                this.currentPrediction = null;
                
                // 自動清除選擇，準備下一次預測
                setTimeout(() => {
                    this.clearSelection();
                }, 2000);
            }
        } catch (error) {
            console.error('確認結果失敗:', error);
            messageBox.error(error.message || '確認結果失敗');
        } finally {
            loadingOverlay.hide();
        }
    }

    async loadHistory(page = 1) {
        try {
            const response = await api.request(`/api/prediction/history?page=${page}&limit=12`);
            
            if (response.success) {
                this.displayHistory(response.predictions, response.page, response.totalPages);
            }
        } catch (error) {
            console.error('載入歷史記錄失敗:', error);
            this.displayEmptyHistory();
        }
    }

    displayHistory(predictions, currentPage, totalPages) {
        const historyGrid = document.getElementById('historyGrid');
        if (!historyGrid) return;

        if (!predictions || predictions.length === 0) {
            this.displayEmptyHistory();
            return;
        }

        const historyHtml = predictions.map(prediction => {
            const cardColorsHtml = prediction.card_pattern.map(color => 
                `<div class="card-color ${color}"></div>`
            ).join('');

            const statusClass = prediction.is_correct === null ? 'pending' : 
                              prediction.is_correct ? 'correct' : 'incorrect';
            const statusText = prediction.is_correct === null ? '待確認' : 
                             prediction.is_correct ? '✓' : '✗';

            const actualResultText = prediction.actual_result ? 
                this.getResultText(prediction.actual_result) : '待確認';

            return `
                <div class="history-item">
                    <div class="history-header">
                        <div class="status-badge ${statusClass}">${statusText}</div>
                        <div class="history-date">${utils.formatDate(prediction.created_at)}</div>
                    </div>
                    <div class="history-cards">${cardColorsHtml}</div>
                    <div class="history-result">
                        <div class="predicted-label">
                            預測: ${this.getResultText(prediction.predicted_result)}
                        </div>
                        <div class="actual-label">
                            實際: ${actualResultText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        historyGrid.innerHTML = historyHtml;

        // 更新分頁
        this.updatePagination(currentPage, totalPages);
    }

    displayEmptyHistory() {
        const historyGrid = document.getElementById('historyGrid');
        if (!historyGrid) return;

        historyGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>還沒有預測記錄</h3>
                <p>開始您的第一次預測吧！</p>
            </div>
        `;

        // 清空分頁
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.innerHTML = '';
        }
    }

    updatePagination(currentPage, totalPages) {
        const pagination = document.getElementById('pagination');
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';

        // 上一頁
        if (currentPage > 1) {
            paginationHtml += `<button onclick="window.predictionPage.loadHistory(${currentPage - 1})">上一頁</button>`;
        }

        // 頁碼
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHtml += `<button class="${activeClass}" onclick="window.predictionPage.loadHistory(${i})">${i}</button>`;
        }

        // 下一頁
        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="window.predictionPage.loadHistory(${currentPage + 1})">下一頁</button>`;
        }

        pagination.innerHTML = paginationHtml;
    }

    getResultText(result) {
        const resultMap = {
            'banker': '莊家',
            'player': '閒家',
            'tie': '和局'
        };
        return resultMap[result] || result;
    }

    getResultIcon(result) {
        const iconMap = {
            'banker': 'fas fa-crown',
            'player': 'fas fa-user',
            'tie': 'fas fa-handshake'
        };
        return iconMap[result] || 'fas fa-question';
    }
}

// 全域函數
function clearSelection() {
    if (window.predictionPage) {
        window.predictionPage.clearSelection();
    }
}

function generatePrediction() {
    if (window.predictionPage) {
        window.predictionPage.generatePrediction();
    }
}

function confirmResult(result) {
    if (window.predictionPage) {
        window.predictionPage.confirmResult(result);
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.predictionPage = new PredictionPage();

    // 添加觸控支持（移動端）
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function(e) {
        if (!e.changedTouches[0]) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        // 水平滑動切換卡片槽
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const currentSlot = window.predictionPage.currentSlot;
            if (diffX > 0 && currentSlot < 4) {
                // 向左滑動，選擇下一個槽
                window.predictionPage.selectSlot(currentSlot + 1);
            } else if (diffX < 0 && currentSlot > 0) {
                // 向右滑動，選擇上一個槽
                window.predictionPage.selectSlot(currentSlot - 1);
            }
        }
    });

    // 添加長按清除功能
    let longPressTimer;
    
    document.addEventListener('mousedown', function(e) {
        if (e.target.closest('.card-slot')) {
            longPressTimer = setTimeout(() => {
                clearSelection();
                messageBox.info('已清除所有選擇');
            }, 1000);
        }
    });

    document.addEventListener('mouseup', function() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
        }
    });

    // 自動保存遊戲歷史到本地儲存
    window.addEventListener('beforeunload', function() {
        if (window.predictionPage && window.predictionPage.gameHistory.length > 0) {
            localStorage.setItem('gameHistory', JSON.stringify(window.predictionPage.gameHistory));
        }
    });

    // 載入保存的遊戲歷史
    const savedHistory = localStorage.getItem('gameHistory');
    if (savedHistory && window.predictionPage) {
        try {
            window.predictionPage.gameHistory = JSON.parse(savedHistory);
        } catch (error) {
            console.error('載入遊戲歷史失敗:', error);
        }
    }
});