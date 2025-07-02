/**
 * QuickNav 组件 - ESM版本
 * 提供快速导航功能，包括页面滚动和文章导航
 */

// 私有常量
const SCROLL_TARGETS = {
    home: () => window.location.href = '/',
    title: () => document.querySelector('[data-section-article]'),
    comment: () => document.querySelector('[data-section-comment]')
};

const NAV_SELECTORS = {
    prev: '.prev-post a',
    next: '.next-post a'
};

class QuickNav {
    constructor(options = {}) {
        this.options = {
            selector: '[data-component-quick-nav]',
            scrollBehavior: 'smooth',
            ...options
        };

        this.nav = document.querySelector(this.options.selector);
        if (!this.nav) {
            console.warn('QuickNav: 未找到导航容器');
            return;
        }

        this.init();
    }

    init() {
        this.setupAccessibility();
        this.bindEvents();
    }

    setupAccessibility() {
        // 添加 ARIA 属性
        this.nav.setAttribute('role', 'navigation');
        this.nav.setAttribute('aria-label', '快速导航');

        // 设置按钮的可访问性属性
        const buttons = this.nav.querySelectorAll('.quick-nav-btn');
        buttons.forEach(button => {
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            
            // 添加键盘支持
            if (!button.hasAttribute('aria-label')) {
                const label = button.dataset.scrollTo || button.dataset.nav;
                button.setAttribute('aria-label', `导航到${label}`);
            }
        });
    }

    bindEvents() {
        // 点击事件
        this.nav.addEventListener('click', this.handleClick.bind(this));

        // 键盘事件
        this.nav.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    handleClick(e) {
        const button = e.target.closest('.quick-nav-btn');
        if (!button) return;

        const scrollTo = button.dataset.scrollTo;
        const nav = button.dataset.nav;

        if (scrollTo) {
            this.handleScroll(scrollTo);
        } else if (nav) {
            this.handleNavigation(nav);
        }
    }

    handleKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        const button = e.target.closest('.quick-nav-btn');
        if (!button) return;

        e.preventDefault();
        button.click();
    }

    handleScroll(target) {
        try {
            const getTarget = SCROLL_TARGETS[target];
            if (!getTarget) {
                console.warn(`QuickNav: 未知的滚动目标: ${target}`);
                return;
            }

            const element = getTarget();
            
            if (target === 'home') return; // home 已经在 SCROLL_TARGETS 中处理

            if (!element) {
                console.warn(`QuickNav: 未找到目标元素: ${target}`);
                return;
            }

            element.scrollIntoView({ 
                behavior: this.options.scrollBehavior,
                block: 'start'
            });

            // 触发自定义事件
            this.nav.dispatchEvent(new CustomEvent('quickNavScroll', {
                detail: { target, element },
                bubbles: true
            }));
        } catch (error) {
            console.error('QuickNav: 滚动处理错误:', error);
        }
    }

    handleNavigation(direction) {
        try {
            const selector = NAV_SELECTORS[direction];
            if (!selector) {
                console.warn(`QuickNav: 未知的导航方向: ${direction}`);
                return;
            }

            const link = document.querySelector(selector);
            if (!link) {
                console.warn(`QuickNav: 未找到${direction}导航链接`);
                return;
            }

            link.click();

            // 触发自定义事件
            this.nav.dispatchEvent(new CustomEvent('quickNavNavigate', {
                detail: { direction, link },
                bubbles: true
            }));
        } catch (error) {
            console.error('QuickNav: 导航处理错误:', error);
        }
    }
}

// 导出初始化函数
function initQuickNav(options = {}) {
    return new QuickNav(options);
}

// 自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initQuickNav());
    } else {
        initQuickNav();
    }
}

export { QuickNav as default, initQuickNav };
