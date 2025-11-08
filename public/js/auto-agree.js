// 簡單修復：按下同意後自動刷新頁面
(function() {
    'use strict';
    
    console.log('� 服務條款同意後自動刷新修復');
    
    function handleAgreeClick() {
        // 尋找包含「我同意」或「✓ 我同意」文字的按鈕
        const buttons = document.querySelectorAll('button, .btn, input[type="button"], div[role="button"], span[role="button"], *');
        
        buttons.forEach(btn => {
            const text = btn.textContent || btn.innerText || '';
            if (text.includes('我同意') || text.includes('✓ 我同意') || text === '我同意') {
                console.log('🎯 找到同意按鈕，綁定刷新事件:', btn);
                
                // 移除現有事件監聽器，添加我們的處理
                btn.addEventListener('click', function(e) {
                    console.log('📝 用戶點擊了我同意按鈕');
                    
                    // 設置已同意標記
                    localStorage.setItem('termsAccepted', 'true');
                    localStorage.setItem('userAgreed', 'true');
                    
                    // 延遲刷新，讓點擊動作完成
                    setTimeout(() => {
                        console.log('🔄 正在刷新頁面...');
                        window.location.reload();
                    }, 100);
                }, true); // 使用 capture 優先處理
                
                return true;
            }
        });
        
        return false;
    }
    
    function setupRefreshOnAgree() {
        console.log('🔧 設置同意按鈕刷新功能');
        
        // 立即嘗試綁定
        if (handleAgreeClick()) {
            console.log('✅ 成功綁定同意按鈕');
            return;
        }
        
        // 持續檢查按鈕出現
        let attempts = 0;
        const maxAttempts = 30; // 15秒
        
        const checkInterval = setInterval(() => {
            attempts++;
            console.log(`🔍 第 ${attempts} 次嘗試綁定同意按鈕...`);
            
            if (handleAgreeClick() || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (attempts >= maxAttempts) {
                    console.log('⚠️ 未找到同意按鈕，但繼續監控');
                }
            }
        }, 500);
        
        // 監聽DOM變化，新增元素時重新綁定
        const observer = new MutationObserver(() => {
            handleAgreeClick();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 全域點擊監聽，確保不漏掉任何同意按鈕
        document.addEventListener('click', function(e) {
            const text = e.target.textContent || '';
            if (text.includes('我同意') || text.includes('✓ 我同意')) {
                console.log('🎯 檢測到同意按鈕點擊，準備刷新');
                localStorage.setItem('termsAccepted', 'true');
                setTimeout(() => {
                    window.location.reload();
                }, 200);
            }
        }, true);
    }
    
    // 檢查是否已經同意過
    if (localStorage.getItem('termsAccepted') === 'true') {
        console.log('✅ 用戶已同意服務條款');
        return;
    }
    
    // DOM準備好後執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupRefreshOnAgree);
    } else {
        setupRefreshOnAgree();
    }
    
    console.log('🔄 同意後刷新修復已載入');
})();