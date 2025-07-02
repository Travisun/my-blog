/**
 * Tabs 组件 - ESM版本
 * 提供标签页切换、键盘导航和URL同步功能
 */

// 私有方法和常量
const KEYBOARD_ACTIONS = {
    ArrowLeft: (current, buttons) => current.previousElementSibling || buttons[buttons.length - 1],
    ArrowRight: (current, buttons) => current.nextElementSibling || buttons[0],
    Home: (_, buttons) => buttons[0],
    End: (_, buttons) => buttons[buttons.length - 1]
};

class Tabs {
    constructor(container) {
        this.container = container;
        this.buttons = container.querySelectorAll('.tab-button');
        this.panels = container.querySelectorAll('.tab-panel');
        this.init();
    }

    init() {
        // 绑定事件处理器
        this.bindEvents();
        // 从 URL 参数恢复 tab
        this.restoreTabFromUrl();
    }

    bindEvents() {
        // 点击事件委托到容器
        this.container.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            if (button) {
                this.switchTab(button.dataset.tab);
            }
        });

        // 键盘导航
        this.buttons.forEach(button => {
            button.addEventListener('keydown', this.handleKeyNavigation.bind(this));
        });
    }

    handleKeyNavigation(e) {
        const action = KEYBOARD_ACTIONS[e.key];
        if (action) {
            e.preventDefault();
            const targetButton = action(e.target, Array.from(this.buttons));
            if (targetButton) {
                targetButton.click();
                targetButton.focus();
            }
        }
    }

    switchTab(tabId) {
        if (!tabId) return;

        // 更新按钮状态
        this.buttons.forEach(button => {
            const isActive = button.dataset.tab === tabId;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive);
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // 更新面板状态
        this.panels.forEach(panel => {
            const isActive = panel.dataset.tabContent === tabId;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', !isActive);
            
            // 如果是激活的面板，确保它可以获得焦点
            if (isActive) {
                panel.setAttribute('tabindex', '0');
            } else {
                panel.setAttribute('tabindex', '-1');
            }
        });

        // 更新 URL
        this.updateUrl(tabId);

        // 触发自定义事件
        this.container.dispatchEvent(new CustomEvent('tabChange', {
            detail: { tabId },
            bubbles: true
        }));
    }

    updateUrl(tabId) {
        try {
            const url = new URL(window.location);
            url.searchParams.set('tab', tabId);
            window.history.replaceState({}, '', url);
        } catch (error) {
            console.warn('更新URL参数失败:', error);
        }
    }

    restoreTabFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const tabId = params.get('tab');
            
            if (tabId) {
                const targetButton = Array.from(this.buttons)
                    .find(button => button.dataset.tab === tabId);
                
                if (targetButton) {
                    this.switchTab(tabId);
                }
            } else {
                // 如果URL中没有指定标签，激活第一个标签
                const firstButton = this.buttons[0];
                if (firstButton) {
                    this.switchTab(firstButton.dataset.tab);
                }
            }
        } catch (error) {
            console.warn('从URL恢复标签状态失败:', error);
        }
    }
}

// 导出初始化函数
function initTabs() {
    document.querySelectorAll('.tabs-container').forEach(container => {
        new Tabs(container);
    });
}

// 自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabs);
    } else {
        initTabs();
    }
}

export { Tabs as default, initTabs };
