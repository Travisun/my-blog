import { H as HighlightJS } from './components.vendor.BfGsPTkj.js';

class CodeHighlighter {
  constructor() {
    this.initialized = false;
    // 定义需要跳过高亮处理的语言列表
    this.skipLanguages = ['mermaid', 'flowchart', 'diagram'];
    this.copyButtonHTML = `
      <button class="hljs-copy-btn" title="复制代码">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="m5 15-1-1v-6a2 2 0 0 1 2-2h6l1 1"></path>
        </svg>
      </button>
    `;
    
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.initialized) return;
    
    // 配置 highlight.js
    HighlightJS.configure({
      ignoreUnescapedHTML: true,
      throwUnescapedHTML: false
    });
    
    // 处理现有代码块
    this.processExistingCodeBlocks();
    
    // 初始化事件监听
    this.initEventListeners();
    
    // 观察DOM变化，处理动态添加的代码块
    this.observeDOM();
    
    this.initialized = true;
  }

  processExistingCodeBlocks() {
    // 查找所有需要高亮的代码块
    const codeBlocks = document.querySelectorAll('pre code, code[class*="language-"], pre[class*="language-"]');
    
    codeBlocks.forEach(block => {
      this.highlightCodeBlock(block);
    });
  }

  /**
   * 检查是否应该跳过某种语言的高亮处理
   * @param {string} language - 语言名称
   * @returns {boolean} - 是否应该跳过
   */
  shouldSkipHighlight(language) {
    if (!language) return false;
    
    // 将语言名称转为小写进行比较
    const normalizedLanguage = language.toLowerCase();
    return this.skipLanguages.includes(normalizedLanguage);
  }

  /**
   * 为跳过的代码块添加标记
   * @param {Element} element - 代码块元素
   * @param {string} language - 语言类型
   */
  markSkippedCodeBlock(element, language) {
    let codeElement = element;
    let preElement = element.closest('pre');
    
    // 如果是 pre 标签，查找内部的 code 标签
    if (element.tagName.toLowerCase() === 'pre') {
      const codeChild = element.querySelector('code');
      if (codeChild) {
        codeElement = codeChild;
        preElement = element;
      }
    }
    
    // 添加跳过标记，避免重复处理
    codeElement.classList.add('hljs-skipped', `language-${language}`);
    if (preElement) {
      preElement.classList.add('hljs-skipped', `language-${language}`);
    }
    
    console.log(`跳过 ${language} 代码块的高亮处理`);
  }

  highlightCodeBlock(element) {
    // 避免重复处理
    if (element.classList.contains('hljs-processed') || element.classList.contains('hljs-skipped')) {
      return;
    }
    
    let codeElement = element;
    let preElement = element.closest('pre');
    
    // 如果是 pre 标签，查找内部的 code 标签
    if (element.tagName.toLowerCase() === 'pre') {
      const codeChild = element.querySelector('code');
      if (codeChild) {
        codeElement = codeChild;
        preElement = element;
      }
    }
    
    // 获取语言类型
    const language = this.getLanguage(codeElement) || this.getLanguage(preElement);
    
    // 检查是否应该跳过此语言的高亮处理
    if (this.shouldSkipHighlight(language)) {
      this.markSkippedCodeBlock(element, language);
      return;
    }
    
    // 获取原始代码内容
    const code = codeElement.textContent || codeElement.innerText;
    
    // 进行语法高亮
    let highlightedCode;
    if (language) {
      try {
        highlightedCode = HighlightJS.highlight(code, { language }).value;
      } catch (e) {
        // 如果指定语言失败，尝试自动检测
        highlightedCode = HighlightJS.highlightAuto(code).value;
      }
    } else {
      highlightedCode = HighlightJS.highlightAuto(code).value;
    }
    
    // 创建高亮后的代码块容器
    const highlightContainer = this.createHighlightContainer(highlightedCode, code, language);
    
    // 替换原有的代码块
    if (preElement) {
      preElement.parentNode.replaceChild(highlightContainer, preElement);
    } else {
      // 对于单独的 code 标签，需要特殊处理
      const wrapper = document.createElement('div');
      wrapper.className = 'hljs-inline-wrapper';
      codeElement.innerHTML = highlightedCode;
      codeElement.classList.add('hljs', 'hljs-processed');
      if (language) {
        codeElement.classList.add(`language-${language}`);
      }
    }
  }

  getLanguage(element) {
    if (!element) return null;
    
    // 从 class 属性中提取语言
    const classList = Array.from(element.classList);
    
    for (const className of classList) {
      if (className.startsWith('language-')) {
        return className.replace('language-', '');
      }
      if (className.startsWith('lang-')) {
        return className.replace('lang-', '');
      }
    }
    
    return null;
  }

  createHighlightContainer(highlightedCode, originalCode, language) {
    const container = document.createElement('div');
    container.className = 'hljs-container';
    
    // 确保originalCode不为空
    const codeToStore = originalCode || '';
    
    // 创建头部工具栏
    const header = document.createElement('div');
    header.className = 'hljs-header';
    
    // 语言标签
    const languageLabel = document.createElement('span');
    languageLabel.className = 'hljs-language';
    languageLabel.textContent = language || 'text';
    header.appendChild(languageLabel);
    
    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'hljs-copy-btn';
    copyButton.innerHTML = this.copyButtonHTML;
    copyButton.title = '复制代码';
    // 确保存储的代码内容不为空
    copyButton.setAttribute('data-code', codeToStore);
    // 作为备用，也将代码存储在dataset中
    copyButton.dataset.originalCode = codeToStore;
    header.appendChild(copyButton);
    
    container.appendChild(header);
    
    // 创建代码区域
    const codeArea = document.createElement('div');
    codeArea.className = 'hljs-code-area';
    
    // 创建行号容器
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'hljs-line-numbers';
    
    // 创建代码容器
    const codeContainer = document.createElement('pre');
    codeContainer.className = 'hljs-code';
    
    const codeElement = document.createElement('code');
    codeElement.className = 'hljs hljs-processed';
    if (language) {
      codeElement.classList.add(`language-${language}`);
    }
    codeElement.innerHTML = highlightedCode;
    
    codeContainer.appendChild(codeElement);
    
    // 生成行号
    const lines = originalCode.split('\n');
    for (let i = 1; i <= lines.length; i++) {
      const lineNumber = document.createElement('span');
      lineNumber.className = 'hljs-line-number';
      lineNumber.textContent = i;
      lineNumbers.appendChild(lineNumber);
    }
    
    codeArea.appendChild(lineNumbers);
    codeArea.appendChild(codeContainer);
    container.appendChild(codeArea);
    
    return container;
  }

  initEventListeners() {
    // 使用事件委托处理复制按钮点击
    document.body.addEventListener('click', (event) => {
      if (event.target.closest('.hljs-copy-btn')) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.target.closest('.hljs-copy-btn');
        // 尝试多种方式获取代码内容
        let code = button.getAttribute('data-code') || button.dataset.originalCode;
        
        // 如果还是没有，尝试从同级的代码容器中获取
        if (!code || !code.trim()) {
          const container = button.closest('.hljs-container');
          if (container) {
            const codeElement = container.querySelector('.hljs-code code');
            if (codeElement) {
              code = codeElement.textContent || codeElement.innerText;
            }
          }
        }
        
        // 调试信息
        console.log('复制的代码内容:', code);
        
        if (code && code.trim()) {
          this.copyToClipboard(code, button);
        } else {
          console.error('复制失败：代码内容为空');
          this.showCopyError(button);
        }
      }
    });
  }

  async copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopySuccess(button);
    } catch (err) {
      // 降级到传统方法
      this.fallbackCopyToClipboard(text, button);
    }
  }

  fallbackCopyToClipboard(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showCopySuccess(button);
    } catch (err) {
      console.error('复制失败:', err);
      this.showCopyError(button);
    }
    
    document.body.removeChild(textArea);
  }

  showCopySuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"></polyline>
      </svg>
    `;
    button.classList.add('copied');
    button.title = '已复制！';
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
      button.title = '复制代码';
    }, 2000);
  }

  showCopyError(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
    button.classList.add('copy-error');
    button.title = '复制失败';
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copy-error');
      button.title = '复制代码';
    }, 2000);
  }

  observeDOM() {
    // 观察DOM变化，自动处理新添加的代码块
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 查找新添加的代码块
            const codeBlocks = node.querySelectorAll ? 
              node.querySelectorAll('pre code, code[class*="language-"], pre[class*="language-"]') : [];
            
            codeBlocks.forEach(block => {
              this.highlightCodeBlock(block);
            });
            
            // 检查节点本身是否是代码块
            if (node.matches && node.matches('pre code, code[class*="language-"], pre[class*="language-"]')) {
              this.highlightCodeBlock(node);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// 确保只初始化一次
let instance = null;

function initHighlighter() {
  if (!instance) {
    instance = new CodeHighlighter();
  }
  return instance;
}

// 导出初始化函数
const highlighter = initHighlighter();

// 为了调试，也导出到全局
if (typeof window !== 'undefined') {
  window.CodeHighlighter = highlighter;
}

export { highlighter as default };
