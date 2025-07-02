import { P as PhotoSwipe, a as PhotoSwipeUI_Default } from './components.vendor.BfGsPTkj.js';

class ArticleLightbox {
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
    
    // 创建 PhotoSwipe DOM
    this.pswpElement = this.createPhotoSwipeDOM();
    
    // 初始化事件监听
    this.initEventListeners();
    
    // 处理当前页面的图片
    this.processExistingImages();
    
    this.initialized = true;
  }

  processExistingImages() {
    const articles = document.querySelectorAll('article[data-section-article]');
    
    articles.forEach(article => {
      const images = article.querySelectorAll('img');
      
      // 为每个图片添加加载事件监听
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', () => {});
        }
      });
    });
  }

  createPhotoSwipeDOM() {
    // 检查是否已存在
    const existing = document.querySelector('.pswp');
    if (existing) {
      return existing;
    }

    const pswpHTML = `
      <div class="pswp" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="pswp__bg"></div>
        <div class="pswp__scroll-wrap">
          <div class="pswp__container">
            <div class="pswp__item"></div>
            <div class="pswp__item"></div>
            <div class="pswp__item"></div>
          </div>
          <div class="pswp__ui pswp__ui--hidden">
            <div class="pswp__top-bar">
              <div class="pswp__counter"></div>
              <button class="pswp__button pswp__button--close" title="关闭 (Esc)"></button>
              <button class="pswp__button pswp__button--fs" title="全屏"></button>
              <button class="pswp__button pswp__button--zoom" title="放大/缩小"></button>
              <div class="pswp__preloader">
                <div class="pswp__preloader__icn">
                  <div class="pswp__preloader__cut">
                    <div class="pswp__preloader__donut"></div>
                  </div>
                </div>
              </div>
            </div>
            <button class="pswp__button pswp__button--arrow--left" title="上一张"></button>
            <button class="pswp__button pswp__button--arrow--right" title="下一张"></button>
            <div class="pswp__caption">
              <div class="pswp__caption__center"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const pswpFragment = document.createRange().createContextualFragment(pswpHTML);
    document.body.appendChild(pswpFragment);
    return document.querySelector('.pswp');
  }

  initEventListeners() {
    // 使用事件委托来处理点击事件
    document.body.addEventListener('click', (event) => {
      const img = event.target.closest('article[data-section-article] img');
      if (img) {
        event.preventDefault();
        event.stopPropagation();
        const article = img.closest('article[data-section-article]');
        if (article) {
          this.openPhotoSwipe(img, article);
        }
      }
    }, false);
  }

  getImageItems(article) {
    const images = Array.from(article.querySelectorAll('img'));
    
    return images.map(img => {
      // 获取实际图片尺寸
      const width = img.naturalWidth || img.width || 1200;
      const height = img.naturalHeight || img.height || 800;

      return {
        src: img.src,
        w: width,
        h: height,
        title: img.alt || '', // 使用 alt 作为标题
        msrc: img.src // 缩略图源
      };
    });
  }

  openPhotoSwipe(clickedImage, article) {
    const items = this.getImageItems(article);
    const options = {
      index: items.findIndex(item => item.src === clickedImage.src),
      bgOpacity: 0.9,
      showHideOpacity: true,
      history: false,
      shareEl: false,
      closeOnScroll: false,
      clickToCloseNonZoomable: false,
      maxSpreadZoom: 3,
      getDoubleTapZoom: (isMouseClick, item) => isMouseClick ? 2 : 1.5,
      pinchToClose: true,
      errorMsg: '<div class="pswp__error-msg">图片加载失败</div>',
      // 添加动画效果
      showAnimationDuration: 333,
      hideAnimationDuration: 333,
      // 改进的缩放行为
      zoomEl: true,
      mouseUsed: true,
      tapToClose: true,
      tapToToggleControls: true
    };

    const gallery = new PhotoSwipe(
      this.pswpElement,
      PhotoSwipeUI_Default,
      items,
      options
    );

    // 监听图片加载完成事件，更新实际尺寸
    gallery.listen('imageLoadComplete', (index, item) => {
      const img = new Image();
      img.src = item.src;
      img.onload = () => {
        item.w = img.naturalWidth;
        item.h = img.naturalHeight;
        gallery.updateSize(true);
      };
    });

    // 添加错误处理
    gallery.listen('imageLoadError', (index, item) => {
      console.error('ArticleLightbox: 图片加载失败:', item.src);
      item.w = 800;
      item.h = 600;
      item.title = '图片加载失败';
    });

    gallery.init();
  }
}

// 确保只初始化一次
let instance = null;

function initLightbox() {
  if (!instance) {
    instance = new ArticleLightbox();
  }
  return instance;
}

// 导出初始化函数
const lightbox = initLightbox();

// 为了调试，也导出到全局
if (typeof window !== 'undefined') {
  window.ArticleLightbox = lightbox;
}

export { lightbox as default };
