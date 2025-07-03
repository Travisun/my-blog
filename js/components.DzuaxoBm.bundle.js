import { r as renderToString } from './components.vendor.markdown.B7Ja-ycJ.js';

/**
 * ArticleLatex - LaTeX 公式渲染器
 * 支持行内公式 $...$ 和块级公式 $$...$$ (包括多行公式)
 * 
 * 特性：
 * 1. 自动处理 Hexo 生成的 HTML 标签（如 <br>）
 * 2. 自动解码 HTML 实体（如 &amp; -> &）
 * 3. 支持多行公式，自动处理换行
 * 4. 智能识别行内公式和块级公式
 * 5. 使用 KaTeX 进行高性能渲染
 * 
 * 处理的 HTML 实体包括：
 * - &amp; -> &  (用于对齐符号 &=)
 * - &lt; -> <
 * - &gt; -> >
 * - &quot; -> "
 * - &#39; -> '
 */
class ArticleLatex {
  constructor() {
    this.initialized = false;
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.initialized) return;
    
    // 初始化事件监听
    this.initMutationObserver();
    
    // 处理当前页面的公式
    this.processExistingFormulas();
    
    this.initialized = true;
  }

  initMutationObserver() {
    // 创建一个观察器来监听DOM变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const articles = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === 1 && node.matches('article[data-section-article]'));
          
          articles.forEach(article => this.processArticle(article));
        }
      });
    });

    // 开始观察文档变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processExistingFormulas() {
    const articles = document.querySelectorAll('article[data-section-article]');
    articles.forEach(article => this.processArticle(article));
  }

  processArticle(article) {
    // 先处理块级公式 $$...$$（包括多行）
    this.processBlockFormulas(article);
    
    // 再处理行内公式 $...$，避免与块级公式冲突
    this.processInlineFormulas(article);
  }

  processInlineFormulas(article) {
    // 获取当前article的HTML内容
    let fullContent = article.innerHTML;
    
    // 使用正则表达式匹配行内公式 $...$
    // 避免匹配 $$...$$（块级公式）使用更兼容的方式
    const inlineFormulaRegex = /\$([^\$\n]+)\$/g;
    const matches = [];
    let match;
    
    // 收集所有匹配的行内公式
    while ((match = inlineFormulaRegex.exec(fullContent)) !== null) {
      const beforeMatch = fullContent.substring(0, match.index);
      fullContent.substring(match.index + match[0].length);
      
      // 检查前后是否有$符号（避免匹配$$...$$中的部分）
      const prevChar = match.index > 0 ? fullContent[match.index - 1] : '';
      const nextChar = match.index + match[0].length < fullContent.length ? 
        fullContent[match.index + match[0].length] : '';
      
      // 检查是否在latex-block div中
      const lastOpenDiv = beforeMatch.lastIndexOf('<div class="latex-block');
      const lastCloseDiv = beforeMatch.lastIndexOf('</div>');
      const inLatexBlock = lastOpenDiv !== -1 && lastCloseDiv < lastOpenDiv;
      
      // 如果不在latex-block中且不是$$...$$的一部分，则添加到待处理列表
      if (!inLatexBlock && prevChar !== '$' && nextChar !== '$') {
        // 提取公式内容并清理HTML标签和实体
        let formula = match[1];
        formula = formula
          .replace(/<[^>]*>/g, '')     // 移除所有HTML标签
          .replace(/&amp;/g, '&')      // 将&amp;转换回&
          .replace(/&lt;/g, '<')       // 处理其他可能的HTML实体
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        
        matches.push({
          fullMatch: match[0],
          formula: formula,
          index: match.index
        });
      }
    }
    
    // 如果找到了行内公式，进行替换
    if (matches.length > 0) {
      // 从后往前替换，避免索引变化影响
      matches.reverse().forEach(({ fullMatch, formula }) => {
        try {
          const rendered = renderToString(formula, {
            displayMode: false,
            throwOnError: false,
            strict: false  // 允许一些非标准的LaTeX语法
          });
          fullContent = fullContent.replace(fullMatch, rendered);
        } catch (error) {
          console.error('ArticleLatex: 行内公式渲染错误:', error);
          console.error('公式内容:', formula);
        }
      });
      
      // 更新article的内容
      article.innerHTML = fullContent;
    }
  }

  processBlockFormulas(article) {
    // 获取整个article的文本内容，保持结构
    let fullContent = article.innerHTML;
    
    // 使用支持多行的正则表达式匹配 $$...$$
    // [\s\S]*? 匹配包括换行符在内的任意字符（非贪婪）
    const blockFormulaRegex = /\$\$([\s\S]*?)\$\$/g;
    const matches = [];
    let match;
    
    // 收集所有匹配的块级公式
    while ((match = blockFormulaRegex.exec(fullContent)) !== null) {
      // 提取公式内容并清理
      let formula = match[1];
      
      // 移除所有HTML标签，特别是<br>标签
      formula = formula
        .replace(/<br\s*\/?>/gi, '\n')  // 将<br>转换为换行符
        .replace(/<[^>]*>/g, '')        // 移除其他HTML标签
        .replace(/&amp;/g, '&')         // 将&amp;转换回&
        .replace(/&lt;/g, '<')          // 处理其他可能的HTML实体
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();                        // 清理首尾空白
      
      matches.push({
        fullMatch: match[0],
        formula: formula,
        index: match.index
      });
    }
    
    // 如果找到了块级公式，进行替换
    if (matches.length > 0) {
      // 从后往前替换，避免索引变化影响
      matches.reverse().forEach(({ fullMatch, formula }) => {
        try {
          const rendered = renderToString(formula, {
            displayMode: true,
            throwOnError: false,
            strict: false  // 允许一些非标准的LaTeX语法
          });
          
          // 为块级公式添加容器
          const replacement = `<div class="latex-block">${rendered}</div>`;
          fullContent = fullContent.replace(fullMatch, replacement);
        } catch (error) {
          console.error('ArticleLatex: 块级公式渲染错误:', error);
          console.error('公式内容:', formula);
        }
      });
      
      // 更新article的内容
      article.innerHTML = fullContent;
    }
  }
}

// 确保只初始化一次
let instance = null;

function initLatex() {
  if (!instance) {
    instance = new ArticleLatex();
  }
  return instance;
}

// 导出初始化函数
const latex = initLatex();

// 为了调试，也导出到全局
if (typeof window !== 'undefined') {
  window.ArticleLatex = latex;
}

export { latex as default };
