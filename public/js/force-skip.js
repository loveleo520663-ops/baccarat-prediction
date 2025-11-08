// 強制跳過服務條款 - 緊急修復腳本
(function() {
    'use strict';
    
    console.log('🚨 緊急修復：強制跳過服務條款');
    
    // 立即執行，不等待任何事件
    function forceSkipTerms() {
        console.log('💥 強制跳過服務條款執行中...');
        
        // 1. 隱藏所有可能的彈窗層
        const hideSelectors = [
            '.modal', '.terms-modal', '.popup', '.dialog', '.overlay',
            '[class*="modal"]', '[class*="popup"]', '[class*="dialog"]',
            '[style*="position: fixed"]', '[style*="z-index"]'
        ];
        
        hideSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden !important';
                el.style.opacity = '0 !important';
                el.style.pointerEvents = 'none !important';
                el.classList.add('force-hidden');
            });
        });
        
        // 2. 移除可能阻塞的樣式
        document.body.style.overflow = 'auto !important';
        document.documentElement.style.overflow = 'auto !important';
        
        // 3. 強制點擊所有可能的同意按鈕
        const buttonTexts = ['同意', '確認', '繼續', 'OK', 'Accept', 'Agree', 'Continue', '開始', 'Start'];
        
        document.querySelectorAll('*').forEach(el => {
            const text = (el.textContent || '').trim();
            if (buttonTexts.some(btnText => text.includes(btnText))) {
                console.log('🎯 嘗試點擊元素:', el);
                try {
                    // 多種點擊方式
                    el.click();
                    el.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new Event('mousedown', { bubbles: true }));
                    el.dispatchEvent(new Event('mouseup', { bubbles: true }));
                    
                    // 如果是表單元素
                    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
                        el.form && el.form.submit();
                    }
                } catch (e) {
                    console.log('點擊失敗:', e);
                }
            }
        });
        
        // 4. 設定localStorage避免再次顯示
        try {
            localStorage.setItem('termsAccepted', 'true');
            localStorage.setItem('skipTermsModal', 'true');
        } catch (e) {
            console.log('無法設定 localStorage');
        }
        
        // 5. 確保遊戲可以正常初始化
        setTimeout(() => {
            if (typeof BaccaratGame !== 'undefined' && !window.game) {
                console.log('🎮 強制初始化遊戲');
                try {
                    window.game = new BaccaratGame();
                } catch (e) {
                    console.log('遊戲初始化失敗:', e);
                }
            }
        }, 1000);
        
        console.log('✅ 強制跳過完成');
    }
    
    // 立即執行
    forceSkipTerms();
    
    // 持續監控並執行
    const forceInterval = setInterval(() => {
        forceSkipTerms();
        
        // 如果遊戲已初始化，停止強制執行
        if (window.game && typeof window.game === 'object') {
            console.log('🎮 遊戲已初始化，停止強制跳過');
            clearInterval(forceInterval);
        }
    }, 500);
    
    // 10秒後停止強制執行
    setTimeout(() => {
        clearInterval(forceInterval);
        console.log('⏰ 強制跳過超時停止');
    }, 10000);
    
})();