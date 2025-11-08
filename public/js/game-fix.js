// 修復遊戲頁面載入和服務條款問題
(function() {
    'use strict';
    
    console.log('🔧 遊戲頁面修復腳本載入');
    
    // 防止頁面載入卡住
    let pageLoadTimeout;
    let isGameInitialized = false;
    
    function initializeGameSafely() {
        if (isGameInitialized) {
            console.log('遊戲已經初始化，跳過重複初始化');
            return;
        }
        
        try {
            console.log('🎮 安全初始化遊戲...');
            
            // 檢查必要的元素是否存在
            const gameContainer = document.querySelector('.game-container');
            if (!gameContainer) {
                console.error('❌ 遊戲容器未找到');
                return;
            }
            
            // 檢查 BaccaratGame 類是否可用
            if (typeof BaccaratGame === 'undefined') {
                console.error('❌ BaccaratGame 類未定義');
                return;
            }
            
            // 初始化遊戲
            if (!window.game) {
                window.game = new BaccaratGame();
                console.log('✅ 遊戲初始化成功');
            }
            
            isGameInitialized = true;
            
        } catch (error) {
            console.error('❌ 遊戲初始化失敗:', error);
        }
    }
    
    // 處理服務條款彈窗
    function handleTermsModal() {
        // 查找可能的服務條款彈窗
        const modals = document.querySelectorAll('.modal, .terms-modal, [class*="modal"]');
        
        modals.forEach(modal => {
            if (modal.style.display === 'block' || modal.classList.contains('show')) {
                console.log('🔍 發現顯示中的彈窗:', modal);
                
                // 查找確認/同意按鈕
                const confirmButtons = modal.querySelectorAll('button, .btn, [onclick*="confirm"], [onclick*="accept"]');
                confirmButtons.forEach(btn => {
                    if (btn.textContent.includes('同意') || btn.textContent.includes('確認') || btn.textContent.includes('繼續')) {
                        console.log('🔘 自動點擊同意按鈕:', btn);
                        btn.click();
                    }
                });
                
                // 如果沒找到按鈕，直接隱藏彈窗
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }, 1000);
            }
        });
    }
    
    // 頁面載入超時處理
    function setupLoadTimeout() {
        pageLoadTimeout = setTimeout(() => {
            console.log('⚠️ 頁面載入超時，強制初始化');
            handleTermsModal();
            initializeGameSafely();
        }, 5000);
    }
    
    // 監聽頁面載入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM 載入完成');
            clearTimeout(pageLoadTimeout);
            
            setTimeout(() => {
                handleTermsModal();
                initializeGameSafely();
            }, 200);
        });
        
        setupLoadTimeout();
    } else {
        // 頁面已載入
        console.log('📄 頁面已載入，立即初始化');
        handleTermsModal();
        initializeGameSafely();
    }
    
    // 監聽可能的彈窗出現
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && (node.classList.contains('modal') || node.classList.contains('terms-modal'))) {
                    console.log('🔍 檢測到新彈窗:', node);
                    setTimeout(() => handleTermsModal(), 100);
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('✅ 遊戲頁面修復腳本已啟動');
    
})();