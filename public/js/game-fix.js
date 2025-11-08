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
    
    // 處理服務條款彈窗 - 增強版
    function handleTermsModal() {
        console.log('🔍 檢查服務條款彈窗...');
        
        // 1. 查找所有可能的彈窗元素
        const modalSelectors = [
            '.modal', '.terms-modal', '[class*="modal"]',
            '.popup', '.dialog', '.overlay',
            '[style*="z-index"]', '[style*="position: fixed"]',
            'div[id*="modal"]', 'div[id*="popup"]', 'div[id*="dialog"]'
        ];
        
        modalSelectors.forEach(selector => {
            const modals = document.querySelectorAll(selector);
            modals.forEach(modal => {
                const isVisible = (
                    modal.style.display === 'block' ||
                    modal.classList.contains('show') ||
                    modal.classList.contains('active') ||
                    getComputedStyle(modal).display !== 'none'
                );
                
                if (isVisible) {
                    console.log('🔍 發現顯示中的彈窗:', modal);
                    handleSingleModal(modal);
                }
            });
        });
        
        // 2. 檢查整個頁面是否有阻塞元素
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('我同意') || text.includes('服務條款') || text.includes('使用條款')) {
                console.log('🔍 發現包含條款文字的元素:', el);
                handleSingleModal(el.closest('div') || el);
            }
        });
        
        // 3. 強制檢查是否有按鈕包含"同意"文字
        const allButtons = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"], a[role="button"]');
        allButtons.forEach(btn => {
            const text = btn.textContent || btn.value || '';
            if (text.includes('同意') || text.includes('確認') || text.includes('繼續') || text.includes('OK')) {
                console.log('🔘 發現可能的同意按鈕，自動點擊:', btn);
                try {
                    btn.click();
                    btn.dispatchEvent(new Event('click', { bubbles: true }));
                    btn.dispatchEvent(new Event('mousedown', { bubbles: true }));
                    btn.dispatchEvent(new Event('mouseup', { bubbles: true }));
                } catch (e) {
                    console.log('按鈕點擊失敗:', e);
                }
            }
        });
    }
    
    function handleSingleModal(modal) {
        if (!modal) return;
        
        console.log('🔧 處理單個彈窗:', modal);
        
        // 查找所有可能的按鈕
        const buttonSelectors = [
            'button', '.btn', '.button',
            'input[type="button"]', 'input[type="submit"]',
            'a[role="button"]', '[onclick]', '[data-action]'
        ];
        
        buttonSelectors.forEach(selector => {
            const buttons = modal.querySelectorAll(selector);
            buttons.forEach(btn => {
                const text = (btn.textContent || btn.value || '').toLowerCase();
                if (text.includes('同意') || text.includes('確認') || text.includes('繼續') || 
                    text.includes('accept') || text.includes('ok') || text.includes('yes')) {
                    console.log('🔘 點擊同意按鈕:', btn);
                    try {
                        btn.click();
                        // 多種方式觸發點擊事件
                        btn.dispatchEvent(new Event('click', { bubbles: true }));
                        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    } catch (e) {
                        console.log('按鈕點擊失敗:', e);
                    }
                }
            });
        });
        
        // 如果沒找到按鈕，嘗試隱藏彈窗
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.classList.remove('show', 'active', 'open');
            modal.classList.add('hidden');
            if (modal.parentElement) {
                modal.parentElement.style.display = 'none';
            }
        }, 1000);
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
    
    // 定期檢查彈窗 - 每秒檢查
    setInterval(() => {
        handleTermsModal();
    }, 1000);
    
    // 監聽鍵盤事件 - Enter 鍵自動同意
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            console.log('🎯 檢測到 Enter/Space 鍵，檢查彈窗');
            handleTermsModal();
        }
    });
    
    // 監聽點擊事件 - 任何地方點擊都檢查
    document.addEventListener('click', (e) => {
        console.log('🖱️ 檢測到點擊事件，檢查彈窗');
        setTimeout(() => {
            handleTermsModal();
        }, 100);
    });
    
    // 頁面聚焦時檢查
    window.addEventListener('focus', () => {
        console.log('🔍 頁面重新聚焦，檢查彈窗');
        handleTermsModal();
    });
    
    console.log('✅ 遊戲頁面修復腳本已啟動 - 增強版');
    
})();