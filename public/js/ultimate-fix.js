// 終極修復：完全移除服務條款彈窗系統
(function() {
    'use strict';
    
    console.log('🛠️ 終極修復腳本啟動：移除服務條款系統');
    
    // 1. 完全禁用所有彈窗相關功能
    function nukeAllModals() {
        console.log('💣 核彈級移除所有彈窗');
        
        // 移除所有可能的彈窗元素
        const killSelectors = [
            '.modal', '.popup', '.dialog', '.overlay', '.backdrop',
            '.terms-modal', '.terms-popup', '.agreement-modal',
            '[class*="modal"]', '[class*="popup"]', '[class*="dialog"]', 
            '[class*="terms"]', '[class*="agreement"]',
            '[id*="modal"]', '[id*="popup"]', '[id*="dialog"]'
        ];
        
        killSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    console.log('🗑️ 移除元素:', el);
                    el.remove(); // 直接從DOM移除
                });
            } catch (e) {
                console.log('移除選擇器失敗:', selector);
            }
        });
        
        // 強制移除包含關鍵字的元素
        const keywords = ['服務條款', '使用條款', '我同意', 'Terms', 'Agreement', 'Accept Terms'];
        document.querySelectorAll('*').forEach(el => {
            const text = el.textContent || '';
            if (keywords.some(keyword => text.includes(keyword))) {
                const parent = el.closest('div[style*="position: fixed"], div[style*="z-index"], .modal, .popup');
                if (parent && parent !== document.body) {
                    console.log('🎯 移除包含條款文字的父元素:', parent);
                    parent.remove();
                }
            }
        });
        
        // 移除所有高 z-index 的元素（可能是彈窗）
        document.querySelectorAll('*').forEach(el => {
            const style = getComputedStyle(el);
            const zIndex = parseInt(style.zIndex);
            if (zIndex > 999 && el !== document.body && el !== document.documentElement) {
                console.log('🚫 移除高z-index元素:', el, 'z-index:', zIndex);
                el.remove();
            }
        });
    }
    
    // 2. 攔截所有可能創建彈窗的方法
    function interceptModalCreation() {
        console.log('🛡️ 攔截彈窗創建');
        
        // 攔截 createElement
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.apply(this, arguments);
            
            // 監聽元素屬性變化
            const observer = new MutationObserver(() => {
                const classes = element.className || '';
                const style = element.style.cssText || '';
                
                if (classes.includes('modal') || classes.includes('popup') || 
                    style.includes('position: fixed') || style.includes('z-index: 9')) {
                    console.log('🚨 阻止彈窗元素:', element);
                    element.remove();
                }
            });
            
            observer.observe(element, { 
                attributes: true, 
                attributeFilter: ['class', 'style'] 
            });
            
            return element;
        };
        
        // 攔截 appendChild 和 insertBefore
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(child) {
            if (child && child.nodeType === 1) {
                const classes = child.className || '';
                const text = child.textContent || '';
                
                if (classes.includes('modal') || classes.includes('popup') || 
                    text.includes('服務條款') || text.includes('我同意')) {
                    console.log('🚨 阻止添加彈窗子元素:', child);
                    return child; // 返回但不實際添加
                }
            }
            return originalAppendChild.call(this, child);
        };
        
        // 禁用可能的彈窗函數
        const modalFunctions = [
            'showModal', 'showPopup', 'showDialog', 'displayModal',
            'showTerms', 'showTermsModal', 'displayTerms', 'openModal'
        ];
        
        modalFunctions.forEach(funcName => {
            window[funcName] = function() {
                console.log(`🚫 ${funcName} 已被禁用`);
                return false;
            };
        });
    }
    
    // 3. 恢復頁面正常狀態
    function restorePageState() {
        console.log('🔄 恢復頁面正常狀態');
        
        // 移除可能的阻塞樣式
        const bodyClasses = ['modal-open', 'no-scroll', 'overflow-hidden', 'popup-open'];
        bodyClasses.forEach(cls => {
            document.body.classList.remove(cls);
            document.documentElement.classList.remove(cls);
        });
        
        // 恢復滾動
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.documentElement.style.overflow = '';
        
        // 設置已同意標記
        const agreeFlags = [
            'termsAccepted', 'termsAgreed', 'userAgreed', 
            'modalShown', 'skipModal', 'agreementAccepted'
        ];
        
        agreeFlags.forEach(flag => {
            localStorage.setItem(flag, 'true');
            sessionStorage.setItem(flag, 'true');
        });
        
        // 在 window 對象上也設置標記
        window.termsAccepted = true;
        window.modalShown = false;
        window.skipModal = true;
    }
    
    // 4. 強制執行修復
    function executeUltimateFix() {
        nukeAllModals();
        interceptModalCreation();
        restorePageState();
        console.log('✅ 終極修復執行完成');
    }
    
    // 立即執行
    executeUltimateFix();
    
    // DOM 準備好後再執行一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeUltimateFix);
    } else {
        setTimeout(executeUltimateFix, 10);
    }
    
    // 定期清理（前3秒每100ms一次，確保徹底清除）
    let cleanupCount = 0;
    const intensiveCleanup = setInterval(() => {
        nukeAllModals();
        restorePageState();
        cleanupCount++;
        
        if (cleanupCount >= 30) { // 3秒後停止
            clearInterval(intensiveCleanup);
            console.log('🎯 密集清理完成');
            
            // 切換到輕量級監控
            setInterval(nukeAllModals, 2000);
        }
    }, 100);
    
    // 全域事件攔截
    ['DOMNodeInserted', 'DOMSubtreeModified'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            if (e.target && e.target.nodeType === 1) {
                const classes = e.target.className || '';
                if (classes.includes('modal') || classes.includes('popup')) {
                    console.log('🚨 實時阻止彈窗:', e.target);
                    e.target.remove();
                }
            }
        }, true);
    });
    
    console.log('🛡️ 終極修復防護已啟動');
    
})();