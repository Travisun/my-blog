/**
 * GitHub Projects 组件 - ESM版本
 * 展示用户的 GitHub 项目列表
 */

// 私有常量
const TEMPLATES = {
    PROJECT: 'github-project-template',
    EMPTY: 'github-empty-projects-template',
    NO_USERNAME: 'github-no-username-template'
};

const TIME_UNITS = {
    DAY: 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

const API_ENDPOINTS = {
    USER_REPOS: (username) => `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`
};

class GitHubProjects {
    constructor(options = {}) {
        this.options = {
            containerSelector: '[data-github-projects]',
            projectsSelector: '[data-projects-container]',
            ...options
        };

        this.container = document.querySelector(this.options.containerSelector);
        if (!this.container) {
            console.warn('GitHubProjects: 未找到容器元素');
            return;
        }

        this.projectsContainer = this.container.querySelector(this.options.projectsSelector);
        this.templates = this.initTemplates();
        this.username = this.container.dataset.username;

        this.init();
    }

    initTemplates() {
        const templates = {};
        for (const [key, id] of Object.entries(TEMPLATES)) {
            const template = document.getElementById(id);
            if (!template) {
                console.warn(`GitHubProjects: 未找到模板 ${id}`);
            }
            templates[key] = template;
        }
        return templates;
    }

    async init() {
        try {
            this.setupAccessibility();

            if (!this.username?.trim()) {
                this.showNoUsername();
                return;
            }

            // 显示加载状态
            this.showLoading();

            const projects = await this.fetchProjects();
            if (projects.length === 0) {
                this.showEmptyState();
            } else {
                this.renderProjects(projects);
            }

            // 触发初始化完成事件
            this.container.dispatchEvent(new CustomEvent('githubProjectsLoaded', {
                detail: { projects },
                bubbles: true
            }));
        } catch (error) {
            console.error('GitHubProjects: 初始化错误:', error);
            this.showError(error);
        }
    }

    setupAccessibility() {
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'GitHub 项目列表');
        this.projectsContainer.setAttribute('role', 'list');
    }

    showLoading() {
        this.projectsContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-600 dark:text-gray-400" role="status">
                <svg class="inline w-8 h-8 animate-spin" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="sr-only">正在加载项目...</span>
            </div>
        `;
    }

    async fetchProjects() {
        try {
            const response = await fetch(API_ENDPOINTS.USER_REPOS(this.username));
            if (!response.ok) {
                if (response.status === 404) {
                    this.showNoUsername();
                    return [];
                }
                throw new Error(`API请求失败: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('GitHubProjects: 获取项目失败:', error);
            throw error;
        }
    }

    showEmptyState() {
        if (!this.templates.EMPTY) return;
        this.projectsContainer.innerHTML = '';
        const emptyState = this.templates.EMPTY.content.cloneNode(true);
        this.projectsContainer.appendChild(emptyState);
    }

    showNoUsername() {
        if (!this.templates.NO_USERNAME) return;
        this.projectsContainer.innerHTML = '';
        const noUsername = this.templates.NO_USERNAME.content.cloneNode(true);
        this.projectsContainer.appendChild(noUsername);
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            if (diff < TIME_UNITS.DAY) {
                return '今天';
            } else if (diff < TIME_UNITS.DAY * 2) {
                return '昨天';
            } else if (diff < TIME_UNITS.MONTH) {
                return `${Math.floor(diff / TIME_UNITS.DAY)}天前`;
            } else if (diff < TIME_UNITS.YEAR) {
                return `${Math.floor(diff / TIME_UNITS.MONTH)}个月前`;
            }
            
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    renderProjects(projects) {
        if (!this.templates.PROJECT) return;
        
        this.projectsContainer.innerHTML = '';
        
        projects.forEach((project, index) => {
            const card = this.templates.PROJECT.content.cloneNode(true);
            
            // 设置可访问性属性
            const projectEl = card.querySelector('.project-card');
            if (projectEl) {
                projectEl.setAttribute('role', 'listitem');
                projectEl.setAttribute('aria-posinset', index + 1);
                projectEl.setAttribute('aria-setsize', projects.length);
            }

            // 设置项目名称和链接
            const nameLink = card.querySelector('.project-name-link');
            const nameEl = card.querySelector('.project-name');
            if (nameLink && nameEl) {
                nameEl.textContent = project.name;
                nameLink.href = project.html_url;
                nameLink.title = `在 GitHub 上查看 ${project.name}`;
                nameLink.setAttribute('aria-label', `查看项目 ${project.name}`);
            }

            // 设置描述
            const descEl = card.querySelector('.project-description');
            if (descEl) {
                const description = project.description || '暂无描述';
                descEl.textContent = description;
                descEl.title = description;
            }

            // 设置语言
            const langEl = card.querySelector('.project-language');
            if (langEl) {
                const language = project.language || '其他';
                langEl.textContent = language;
                langEl.dataset.lang = language;
                langEl.setAttribute('aria-label', `项目语言: ${language}`);
            }
            
            // 设置更新时间
            const dateEl = card.querySelector('.project-date');
            if (dateEl) {
                const formattedDate = this.formatDate(project.updated_at);
                dateEl.textContent = formattedDate;
                dateEl.setAttribute('title', `最后更新: ${formattedDate}`);
                dateEl.setAttribute('datetime', project.updated_at);
            }
            
            // 设置统计信息
            const starsEl = card.querySelector('.project-stars');
            const forksEl = card.querySelector('.project-forks');
            if (starsEl) {
                const stars = this.formatNumber(project.stargazers_count);
                starsEl.textContent = stars;
                starsEl.setAttribute('aria-label', `${stars} 个星标`);
            }
            if (forksEl) {
                const forks = this.formatNumber(project.forks_count);
                forksEl.textContent = forks;
                forksEl.setAttribute('aria-label', `${forks} 个分支`);
            }

            this.projectsContainer.appendChild(card);
        });

        // 触发渲染完成事件
        this.container.dispatchEvent(new CustomEvent('githubProjectsRendered', {
            detail: { projects },
            bubbles: true
        }));
    }

    formatNumber(num) {
        try {
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k';
            }
            return num.toString();
        } catch {
            return '0';
        }
    }

    showError(error) {
        const message = error?.response?.status === 403 
            ? 'API 请求次数超限，请稍后再试。' 
            : '加载 GitHub 项目失败，请稍后重试。';

        this.projectsContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-600 dark:text-red-400" role="alert">
                ${message}
            </div>
        `;
    }
}

// 导出初始化函数
function initGitHubProjects(options = {}) {
    return new GitHubProjects(options);
}

// 自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initGitHubProjects());
    } else {
        initGitHubProjects();
    }
}

export { GitHubProjects as default, initGitHubProjects };
