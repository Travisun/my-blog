/**
 * Flow Chart Component
 * 识别和渲染 markdown 中的流程图、脑图等图表
 * 使用 mermaid.js 库实现
 */

class FlowChartRenderer {
    constructor() {
        this.mermaidLoaded = false;
        this.isRendering = false; // 防止重复渲染的锁
        this.themeChangeTimeout = null; // 主题变化防抖计时器
        this.zoomIndicatorTimeout = null; // 缩放指示器隐藏计时器
        this.lastThemeState = null; // 记录上次主题状态
        this.init();
    }

    /**
     * 初始化组件
     */
    async init() {
        await this.loadMermaid();
        this.setupMermaid();
        this.renderCharts();
        this.observeChanges();
    }

    /**
     * 动态加载 mermaid.js 库
     */
    async loadMermaid() {
        if (this.mermaidLoaded || window.mermaid) {
            this.mermaidLoaded = true;
            return;
        }

        try {
            // 动态导入 mermaid
            const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
            window.mermaid = mermaid;
            this.mermaidLoaded = true;
        } catch (error) {
            console.error('Failed to load mermaid.js:', error);
            // 降级到 script 标签加载
            await this.loadMermaidScript();
        }
    }

    /**
     * 降级加载方式
     */
    loadMermaidScript() {
        return new Promise((resolve, reject) => {
            if (window.mermaid) {
                this.mermaidLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.async = true;
            script.onload = () => {
                this.mermaidLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 配置 mermaid
     */
    setupMermaid() {
        if (!window.mermaid) return;

        const isDarkMode = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;

        window.mermaid.initialize({
            startOnLoad: false,
            theme: isDarkMode ? 'dark' : 'default',
            themeVariables: {
                primaryColor: '#3b82f6',
                primaryTextColor: isDarkMode ? '#f3f4f6' : '#1f2937',
                primaryBorderColor: '#6b7280',
                lineColor: '#6b7280',
                sectionBkgColor: isDarkMode ? '#374151' : '#f9fafb',
                altSectionBkgColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                gridColor: '#e5e7eb',
                secondaryColor: '#e5e7eb',
                tertiaryColor: isDarkMode ? '#1f2937' : '#ffffff'
            },
            flowchart: {
                htmlLabels: true,
                curve: 'basis',
                padding: 20,
                // 优化边标签显示
                useMaxWidth: false,
                nodeSpacing: 50,
                rankSpacing: 50,
                // 改善文本渲染
                fontSize: 14,
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                // 边标签位置相关配置
                diagramPadding: 8,
            },
            mindmap: {
                padding: 20,
                maxNodeSizeX: 200,
                maxNodeSizeY: 100
            },
            timeline: {
                padding: 20
            },
            gitgraph: {
                padding: 20
            }
        });
    }

    /**
     * 渲染所有图表
     */
    async renderCharts() {
        if (!this.mermaidLoaded || !window.mermaid) return;

        // 查找所有可能包含 mermaid 图表的代码块
        const codeBlocks = this.findMermaidBlocks();
        
        // 防止重复渲染：添加渲染锁
        if (this.isRendering) return;
        
        this.isRendering = true;
        
        try {
            for (let i = 0; i < codeBlocks.length; i++) {
                await this.renderSingleChart(codeBlocks[i], i);
            }
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * 查找所有 mermaid 代码块
     */
    findMermaidBlocks() {
        const blocks = [];
        
        // 查找 <pre><code class="language-mermaid"> 格式
        const preCodeBlocks = document.querySelectorAll('pre code.language-mermaid, pre code.mermaid, code.language-mermaid');
        preCodeBlocks.forEach(block => {
            if (!block.dataset.processed) {
                blocks.push(block);
            }
        });

        // 查找 ```mermaid 格式（某些 markdown 解析器可能生成不同的结构）
        const mermaidBlocks = document.querySelectorAll('[data-language="mermaid"], .language-mermaid');
        mermaidBlocks.forEach(block => {
            if (!block.dataset.processed && !blocks.includes(block)) {
                blocks.push(block);
            }
        });

        return blocks;
    }

    /**
     * 渲染单个图表
     */
    async renderSingleChart(codeBlock, index) {
        try {
            // 验证 codeBlock 是否仍在 DOM 中
            if (!codeBlock || !document.contains(codeBlock)) {
                console.warn('Code block not found in DOM, skipping render');
                return;
            }

            // 检查是否已经渲染过
            if (codeBlock.dataset.processed === 'true') return;

            const mermaidCode = codeBlock.textContent || codeBlock.innerText;
            if (!mermaidCode || !mermaidCode.trim()) {
                console.warn('Empty mermaid code, skipping render');
                return;
            }

            const chartId = `mermaid-chart-${Date.now()}-${index}`;
            
            // 提前标记为已处理，防止重复渲染
            codeBlock.dataset.processed = 'true';
            
            // 创建图表容器
            const chartContainer = document.createElement('div');
            chartContainer.className = 'mermaid-chart-container';
            chartContainer.setAttribute('data-component-flow-chart', '');
            
            const chartDiv = document.createElement('div');
            chartDiv.id = chartId;
            chartDiv.className = 'mermaid-chart';
            
            // 创建缩放容器
            const zoomContainer = document.createElement('div');
            zoomContainer.className = 'mermaid-chart-zoom-container';
            
            // 创建缩放指示器
            const zoomIndicator = document.createElement('div');
            zoomIndicator.className = 'mermaid-zoom-indicator';
            zoomIndicator.textContent = '100%';
            
            // 创建控制工具栏
            const controlsDiv = this.createZoomControls(chartId);
            
            // 组装结构
            chartDiv.appendChild(zoomContainer);
            chartContainer.appendChild(chartDiv);
            chartContainer.appendChild(zoomIndicator);
            chartContainer.appendChild(controlsDiv);

            // 渲染图表
            const { svg } = await window.mermaid.render(chartId + '-svg', mermaidCode);
            
            // 将SVG添加到缩放容器中
            zoomContainer.innerHTML = svg;
            
            // 优化SVG渲染，防止抖动
            this.optimizeSvgRendering(chartDiv);
            
            // 验证边标签位置
            this.verifyEdgeLabelPositions(zoomContainer);
            
            // 设置初始缩放
            this.setupZoomControls(chartContainer, zoomContainer, zoomIndicator);

            // 安全地替换原始代码块
            this.replaceElementSafely(codeBlock, chartContainer);

            // 延迟验证边标签位置，确保SVG完全渲染
            setTimeout(() => {
                this.verifyEdgeLabelPositions(zoomContainer);
            }, 200);

        } catch (error) {
            console.error('Error rendering mermaid chart:', error);
            
            // 如果渲染失败，重置处理标记
            if (codeBlock && codeBlock.dataset) {
                codeBlock.dataset.processed = 'false';
            }
            
            // 安全地显示错误信息
            this.showErrorSafely(codeBlock, error);
        }
    }

    /**
     * 创建缩放控制工具栏
     */
    createZoomControls(chartId) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'mermaid-zoom-controls';
        
        controlsDiv.innerHTML = `
            <button type="button" data-action="zoom-in" title="放大">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                </svg>
            </button>
            <button type="button" data-action="zoom-out" title="缩小">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </button>
            <button type="button" data-action="fit-to-view" title="适应视图" class="mermaid-reset-view">
                A
            </button>
            <button type="button" data-action="reset" title="重置视图" class="mermaid-reset-view">
                R
            </button>
        `;
        
        return controlsDiv;
    }

    /**
     * 设置缩放控制功能
     */
    setupZoomControls(container, zoomContainer, indicator) {
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        const minScale = 0.2;
        const maxScale = 5;
        const scaleStep = 0.2;
        
        // 更新变换
        const updateTransform = () => {
            zoomContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            indicator.textContent = `${Math.round(scale * 100)}%`;
            
            // 显示缩放指示器
            container.classList.add('zooming');
            clearTimeout(this.zoomIndicatorTimeout);
            this.zoomIndicatorTimeout = setTimeout(() => {
                container.classList.remove('zooming');
            }, 1000);
        };
        
        // 获取SVG尺寸
        const getSvgDimensions = () => {
            const svg = zoomContainer.querySelector('svg');
            if (!svg) return { width: 0, height: 0 };
            
            try {
                // 优先使用viewBox（可能已经被调整过包含边标签）
                const viewBox = svg.getAttribute('viewBox');
                if (viewBox) {
                    const [x, y, width, height] = viewBox.split(' ').map(Number);
                    if (width && height) {
                        return { width, height };
                    }
                }
                
                // 使用完整的边界框作为后备方案（包含所有元素）
                const allElements = svg.querySelectorAll('*');
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                allElements.forEach(element => {
                    try {
                        const bbox = element.getBBox();
                        if (bbox.width > 0 && bbox.height > 0) {
                            minX = Math.min(minX, bbox.x);
                            minY = Math.min(minY, bbox.y);
                            maxX = Math.max(maxX, bbox.x + bbox.width);
                            maxY = Math.max(maxY, bbox.y + bbox.height);
                        }
                    } catch (e) {
                        // 忽略无法获取bbox的元素
                    }
                });
                
                if (minX !== Infinity && maxX !== -Infinity) {
                    const width = maxX - minX + 40; // 添加一些边距
                    const height = maxY - minY + 40;
                    return { width, height };
                }
                
                // 最后使用客户端尺寸
                return {
                    width: svg.clientWidth || svg.scrollWidth || 400,
                    height: svg.clientHeight || svg.scrollHeight || 300
                };
            } catch (error) {
                console.warn('Failed to get SVG dimensions:', error);
                // 返回默认尺寸
                return { width: 400, height: 300 };
            }
        };
        
        // 适应视图
        const fitToView = () => {
            const containerRect = container.getBoundingClientRect();
            const svgDims = getSvgDimensions();
            
            if (svgDims.width === 0 || svgDims.height === 0) return;
            
            const containerWidth = containerRect.width - 32; // 减去padding
            const containerHeight = containerRect.height - 32;
            
            // 计算基础缩放比例
            const scaleX = containerWidth / svgDims.width;
            const scaleY = containerHeight / svgDims.height;
            const baseScale = Math.min(scaleX, scaleY);
            
            // 根据图表复杂度调整缩放策略
            const svg = zoomContainer.querySelector('svg');
            const nodeCount = svg ? svg.querySelectorAll('.node').length : 0;
            const edgeCount = svg ? svg.querySelectorAll('.edgePath').length : 0;
            
            // 智能缩放策略
            let targetScale;
            if (nodeCount <= 3 && edgeCount <= 3) {
                // 简单图表：使用较小的缩放比例，避免过大
                targetScale = Math.min(baseScale, 0.6);
            } else if (nodeCount <= 8 && edgeCount <= 10) {
                // 中等复杂度：使用适中的缩放比例
                targetScale = Math.min(baseScale, 0.8);
            } else {
                // 复杂图表：使用完全适应的缩放比例
                targetScale = Math.min(baseScale, 1.0);
            }
            
            // 确保最小可读性
            scale = Math.max(targetScale, 0.3);
            
            // 居中显示
            translateX = 0;
            translateY = 0;
            updateTransform();
            
            console.log(`Auto-fitted chart: nodes=${nodeCount}, edges=${edgeCount}, scale=${scale.toFixed(2)}`);
        };
        
        // 重置视图
        const resetView = () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
        };
        
        // 缩放到指定位置
        const zoomTo = (newScale, centerX = 0, centerY = 0) => {
            const oldScale = scale;
            scale = Math.max(minScale, Math.min(maxScale, newScale));
            
            // 计算缩放中心偏移
            const scaleDiff = scale - oldScale;
            translateX -= centerX * scaleDiff;
            translateY -= centerY * scaleDiff;
            
            updateTransform();
        };
        
        // 鼠标滚轮缩放
        zoomContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = container.getBoundingClientRect();
            const centerX = e.clientX - rect.left - rect.width / 2;
            const centerY = e.clientY - rect.top - rect.height / 2;
            
            const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
            zoomTo(scale + delta, centerX, centerY);
        });
        
        // 拖拽功能
        zoomContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只处理左键
            
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            zoomContainer.classList.add('dragging');
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            translateX += deltaX;
            translateY += deltaY;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            updateTransform();
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                zoomContainer.classList.remove('dragging');
            }
        });
        
        // 工具栏按钮事件
        const controls = container.querySelector('.mermaid-zoom-controls');
        controls.addEventListener('click', (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (!action) return;
            
            switch (action) {
                case 'zoom-in':
                    zoomTo(scale + scaleStep);
                    break;
                case 'zoom-out':
                    zoomTo(scale - scaleStep);
                    break;
                case 'fit-to-view':
                    fitToView();
                    break;
                case 'reset':
                    resetView();
                    break;
            }
        });
        
        // 初始适应视图
        setTimeout(() => {
            fitToView();
        }, 100);
        
        // 存储控制函数以便外部调用
        container._zoomControls = {
            fitToView,
            resetView,
            zoomTo: (newScale) => zoomTo(newScale)
        };
        
        // 添加重试机制，确保在SVG完全渲染后再次适应
        setTimeout(() => {
            const svgDims = getSvgDimensions();
            if (svgDims.width > 0 && svgDims.height > 0) {
                fitToView();
            }
        }, 300);
    }

    /**
     * 优化SVG渲染，防止节点抖动
     */
    optimizeSvgRendering(chartDiv) {
        const zoomContainer = chartDiv.querySelector('.mermaid-chart-zoom-container');
        const svg = zoomContainer ? zoomContainer.querySelector('svg') : chartDiv.querySelector('svg');
        if (!svg) return;

        // 首先调整viewBox包含所有边标签
        this.adjustViewBoxForEdgeLabels(svg);

        // 设置固定的preserveAspectRatio，确保稳定渲染
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.display = 'block';
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        
        // 为缩放设置合适的初始大小
        if (zoomContainer) {
            // 移除任何固定的宽高，让缩放系统控制
            svg.style.width = 'auto';
            svg.style.height = 'auto';
        }
        
        // 为所有节点添加稳定的样式
        const nodes = svg.querySelectorAll('.node');
        nodes.forEach(node => {
            node.style.pointerEvents = 'all';
            node.style.cursor = 'pointer';
            // 确保节点有稳定的变换原点
            node.style.transformOrigin = 'center';
            node.style.transformBox = 'fill-box';
        });

        // 为边添加稳定的样式
        const edges = svg.querySelectorAll('.edgePath');
        edges.forEach(edge => {
            edge.style.pointerEvents = 'stroke';
        });

        // 优化边标签显示
        const edgeLabels = svg.querySelectorAll('.edgeLabel');
        edgeLabels.forEach(label => {
            // 检测文本长度，为长文本添加特殊处理
            const text = label.textContent || '';
            if (text.length > 10) {
                label.classList.add('long-text');
            }
            
            // 确保标签有合适的显示层级和稳定的样式，但不影响定位
            label.style.pointerEvents = 'all';
            label.style.cursor = 'default';
            label.style.overflow = 'visible';
            label.style.transformOrigin = 'center center';
            label.style.contain = 'style'; // 只包含样式，不包含布局
            label.style.willChange = 'auto';
            
            // 为标签添加适当的内边距，但保持原始定位
            if (label.tagName.toLowerCase() === 'foreignobject') {
                // 处理foreignObject类型的标签
                const div = label.querySelector('div');
                if (div) {
                    div.style.padding = '4px 8px';
                    div.style.borderRadius = '6px';
                    div.style.fontSize = '13px';
                    div.style.lineHeight = '1.4';
                    div.style.whiteSpace = 'nowrap';
                    div.style.overflow = 'visible';
                    div.style.transformOrigin = 'center center';
                    div.style.contain = 'style';
                    div.style.willChange = 'auto';
                    // 移除可能影响定位的样式设置
                    // div.style.position = 'relative';
                    // div.style.display = 'inline-block';
                }
            }
        });

        // 确保所有文本元素都有合适的字体设置
        const textElements = svg.querySelectorAll('text');
        textElements.forEach(text => {
            // 改善文本的抗锯齿效果
            text.style.textRendering = 'optimizeLegibility';
            text.style.fontSmooth = 'always';
            text.style.webkitFontSmoothing = 'antialiased';
        });
        
        console.log('SVG rendering optimized with zoom support and edge label adjustment');
    }

    /**
     * 调整SVG的viewBox来包含所有边标签
     */
    adjustViewBoxForEdgeLabels(svg) {
        try {
            // 首先检查是否已经有合适的viewBox
            const existingViewBox = svg.getAttribute('viewBox');
            let shouldAdjust = false;
            
            // 获取所有边标签的边界
            const edgeLabels = svg.querySelectorAll('.edgeLabel, foreignObject');
            if (edgeLabels.length === 0) return;
            
            // 计算当前SVG内容的边界（不包括边标签）
            const mainContent = svg.querySelectorAll('.node, .edgePath');
            let mainMinX = Infinity, mainMinY = Infinity, mainMaxX = -Infinity, mainMaxY = -Infinity;
            
            mainContent.forEach(element => {
                try {
                    const bbox = element.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        mainMinX = Math.min(mainMinX, bbox.x);
                        mainMinY = Math.min(mainMinY, bbox.y);
                        mainMaxX = Math.max(mainMaxX, bbox.x + bbox.width);
                        mainMaxY = Math.max(mainMaxY, bbox.y + bbox.height);
                    }
                } catch (e) {
                    // 忽略无法获取bbox的元素
                }
            });
            
            // 计算包含边标签的完整边界
            let fullMinX = mainMinX, fullMinY = mainMinY, fullMaxX = mainMaxX, fullMaxY = mainMaxY;
            
            edgeLabels.forEach(label => {
                try {
                    const bbox = label.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        fullMinX = Math.min(fullMinX, bbox.x);
                        fullMinY = Math.min(fullMinY, bbox.y);
                        fullMaxX = Math.max(fullMaxX, bbox.x + bbox.width);
                        fullMaxY = Math.max(fullMaxY, bbox.y + bbox.height);
                        
                        // 检查边标签是否超出主内容边界
                        if (bbox.x < mainMinX || bbox.y < mainMinY || 
                            bbox.x + bbox.width > mainMaxX || bbox.y + bbox.height > mainMaxY) {
                            shouldAdjust = true;
                        }
                    }
                } catch (e) {
                    // 忽略无法获取bbox的元素
                }
            });
            
            // 只有当边标签确实超出边界时才调整viewBox
            if (shouldAdjust && fullMinX !== Infinity) {
                // 计算最小的必要调整
                const padding = 10; // 减少padding避免过度调整
                const width = fullMaxX - fullMinX + (padding * 2);
                const height = fullMaxY - fullMinY + (padding * 2);
                const x = fullMinX - padding;
                const y = fullMinY - padding;
                
                // 检查是否需要更新viewBox
                if (existingViewBox) {
                    const [existingX, existingY, existingWidth, existingHeight] = existingViewBox.split(' ').map(Number);
                    
                    // 只有当新的边界明显超出现有viewBox时才更新
                    if (x < existingX - 5 || y < existingY - 5 || 
                        x + width > existingX + existingWidth + 5 || 
                        y + height > existingY + existingHeight + 5) {
                        
                        const newViewBox = `${x} ${y} ${width} ${height}`;
                        svg.setAttribute('viewBox', newViewBox);
                    }
                } else {
                    // 没有现有viewBox，设置新的
                    const newViewBox = `${x} ${y} ${width} ${height}`;
                    svg.setAttribute('viewBox', newViewBox);
                }
            }
            
        } catch (error) {
            console.warn('Failed to adjust viewBox for edge labels:', error);
        }
    }

    /**
     * 安全地替换元素，避免空指针异常
     */
    replaceElementSafely(codeBlock, newElement) {
        if (!codeBlock || !document.contains(codeBlock)) {
            console.warn('Code block not in DOM, cannot replace');
            return false;
        }

        // 寻找合适的父容器
        let targetElement = codeBlock.closest('pre');
        if (!targetElement) {
            // 如果没有 pre 容器，尝试查找其他可能的容器
            targetElement = codeBlock.closest('div.highlight') || 
                          codeBlock.closest('div.code-block') ||
                          codeBlock.parentElement;
        }

        if (!targetElement) {
            console.warn('No suitable parent element found for code block');
            return false;
        }

        const parentNode = targetElement.parentNode;
        if (!parentNode) {
            console.warn('Parent element has no parent node');
            return false;
        }

        try {
            parentNode.replaceChild(newElement, targetElement);
            return true;
        } catch (error) {
            console.error('Failed to replace element:', error);
            // 降级方案：在元素后插入新元素，隐藏原元素
            try {
                targetElement.style.display = 'none';
                parentNode.insertBefore(newElement, targetElement.nextSibling);
                return true;
            } catch (fallbackError) {
                console.error('Fallback replacement also failed:', fallbackError);
                return false;
            }
        }
    }

    /**
     * 安全地显示错误信息
     */
    showErrorSafely(codeBlock, error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mermaid-error';
        errorDiv.setAttribute('data-component-flow-chart', '');
        errorDiv.innerHTML = `
            <div class="error-message">
                <strong>图表渲染错误:</strong>
                <pre>${error.message || '未知错误'}</pre>
            </div>
        `;

        const success = this.replaceElementSafely(codeBlock, errorDiv);
        if (!success) {
            // 如果替换失败，尝试在 body 末尾添加错误信息
            console.error('Failed to show error in place, adding to body');
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '10px';
            errorDiv.style.right = '10px';
            errorDiv.style.zIndex = '9999';
            errorDiv.style.background = '#fee';
            errorDiv.style.padding = '10px';
            errorDiv.style.border = '1px solid #f00';
            document.body.appendChild(errorDiv);
            
            // 5秒后自动移除
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }

    /**
     * 监听内容变化，处理动态加载的内容
     */
    observeChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldRerender = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasMermaid = node.querySelector && (
                                node.querySelector('code.language-mermaid') ||
                                node.querySelector('code.mermaid') ||
                                node.querySelector('[data-language="mermaid"]')
                            );
                            if (hasMermaid) {
                                shouldRerender = true;
                            }
                        }
                    });
                }
            });

            if (shouldRerender) {
                setTimeout(() => this.renderCharts(), 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 主题切换时重新渲染
     */
    onThemeChange() {
        if (this.themeChangeTimeout) {
            clearTimeout(this.themeChangeTimeout);
        }
        
        this.themeChangeTimeout = setTimeout(() => {
            if (!this.shouldRerender()) return;
            
            this.setupMermaid();
            this.updateExistingCharts();
        }, 300);
    }

    /**
     * 判断是否需要重新渲染
     */
    shouldRerender() {
        // 检查是否有图表存在
        const existingCharts = document.querySelectorAll('[data-component-flow-chart]');
        if (existingCharts.length === 0) {
            return false;
        }
        
        // 检查当前主题状态
        const isDarkMode = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 如果主题状态没有变化，不需要重新渲染
        if (this.lastThemeState === isDarkMode) {
            return false;
        }
        
        this.lastThemeState = isDarkMode;
        return true;
    }

    /**
     * 更新现有图表的主题，而不是完全重新渲染
     */
    updateExistingCharts() {
        const existingCharts = document.querySelectorAll('[data-component-flow-chart] svg');
        
        if (existingCharts.length === 0) {
            return;
        }
        
        const isDarkMode = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 只更新图表的视觉样式，不重新渲染整个图表
        existingCharts.forEach(svg => {
            this.updateChartTheme(svg, isDarkMode);
        });
    }

    /**
     * 更新单个图表的主题样式
     */
    updateChartTheme(svg, isDarkMode) {
        if (!svg) return;
        
        // 更新节点颜色
        const nodes = svg.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon');
        nodes.forEach(node => {
            if (isDarkMode) {
                node.setAttribute('stroke', '#6b7280');
                node.setAttribute('fill', '#374151');
            } else {
                node.setAttribute('stroke', '#9ca3af');
                node.setAttribute('fill', '#f9fafb');
            }
        });
        
        // 更新文字颜色
        const labels = svg.querySelectorAll('.nodeLabel, .node .label');
        labels.forEach(label => {
            if (isDarkMode) {
                label.setAttribute('fill', '#e5e7eb');
            } else {
                label.setAttribute('fill', '#1f2937');
            }
        });
        
        // 更新连接线颜色
        const edges = svg.querySelectorAll('.edgePath path');
        edges.forEach(edge => {
            if (isDarkMode) {
                edge.setAttribute('stroke', '#9ca3af');
            } else {
                edge.setAttribute('stroke', '#6b7280');
            }
        });
        
        // 更新箭头颜色
        const arrows = svg.querySelectorAll('.arrowheadPath');
        arrows.forEach(arrow => {
            if (isDarkMode) {
                arrow.setAttribute('fill', '#9ca3af');
            } else {
                arrow.setAttribute('fill', '#6b7280');
            }
        });
    }

    /**
     * 验证边标签位置
     */
    verifyEdgeLabelPositions(zoomContainer) {
        const svg = zoomContainer.querySelector('svg');
        if (!svg) return;

        const edgeLabels = svg.querySelectorAll('.edgeLabel');
        svg.querySelectorAll('foreignObject');
        svg.querySelectorAll('.edgeLabel text, foreignObject text');
        
        // 检查每个边标签的内容和位置
        edgeLabels.forEach((label) => {
            const text = label.textContent || '';
            const bbox = label.getBBox ? label.getBBox() : null;
            const rect = label.getBoundingClientRect();
            
            if (!bbox || rect.width === 0 || rect.height === 0) {
                console.warn('Edge label has invalid dimensions:', text);
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const flowChartRenderer = new FlowChartRenderer();
    
    // 监听主题变化
    const themeObserver = new MutationObserver(() => {
        flowChartRenderer.onThemeChange();
    });
    
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });

    // 将实例暴露到全局，方便调试和外部调用
    window.flowChartRenderer = flowChartRenderer;
});

// 支持手动触发渲染
window.renderFlowCharts = () => {
    if (window.flowChartRenderer) {
        window.flowChartRenderer.renderCharts();
    }
};
