document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('checkbox');
    const uploadButton = document.getElementById('upload-button');
    const filePicker = document.getElementById('file-picker');
    const uploadArea = document.getElementById('upload-area');
    const editorContainer = document.getElementById('editor-container');
    const pdfViewer = document.getElementById('pdf-viewer');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumSpan = document.getElementById('page-num');
    const addTextBtn = document.getElementById('add-text-btn');
    const textControls = document.getElementById('text-controls');
    const saveBtn = document.getElementById('save-btn');
    const drawBtn = document.getElementById('draw-btn');
    const drawControls = document.getElementById('draw-controls');
    const highlightBtn = document.getElementById('highlight-btn');
    const highlightControls = document.getElementById('highlight-controls');
    const { PDFDocument } = PDFLib;

    let pdfDoc = null;
    let pdfjsLib = window['pdfjs-dist/build/pdf'];
    let pdfjsDoc = null;
    let currentPage = 1;
    let currentMode = null; // null, 'text', or 'draw'

    // Theme switcher
    themeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });

    // Upload button
    uploadButton.addEventListener('click', () => {
        filePicker.click();
    });

    // File picker
    filePicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            handlePdfFile(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary-color)';
    });

    // Page navigation
    prevPageBtn.addEventListener('click', () => {
        if (currentPage <= 1) return;
        currentPage--;
        renderPage(currentPage);
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage >= pdfjsDoc.numPages) return;
        currentPage++;
        renderPage(currentPage);
    });

    addTextBtn.addEventListener('click', () => {
        textControls.classList.toggle('hidden');
        drawControls.classList.add('hidden');
        highlightControls.classList.add('hidden');
        currentMode = textControls.classList.contains('hidden') ? null : 'text';
    });

    drawBtn.addEventListener('click', () => {
        drawControls.classList.toggle('hidden');
        textControls.classList.add('hidden');
        highlightControls.classList.add('hidden');
        currentMode = drawControls.classList.contains('hidden') ? null : 'draw';
    });

    highlightBtn.addEventListener('click', () => {
        highlightControls.classList.toggle('hidden');
        textControls.classList.add('hidden');
        drawControls.classList.add('hidden');
        currentMode = highlightControls.classList.contains('hidden') ? null : 'highlight';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ccc';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            handlePdfFile(file);
        }
    });

    async function handlePdfFile(file) {
        const arrayBuffer = await file.arrayBuffer();

        // Load with pdf-lib for editing
        pdfDoc = await PDFDocument.load(arrayBuffer);

        // Load with pdf.js for rendering
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdfjsDoc = await loadingTask.promise;

        uploadArea.style.display = 'none';
        editorContainer.style.display = 'block';

        renderPage(currentPage);
    }

    async function renderPage(pageNumber) {
        const page = await pdfjsDoc.getPage(pageNumber);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        const pageContainer = document.getElementById('page-container');
        pageContainer.innerHTML = '';

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);

        await page.render(renderContext).promise;

        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayerBuilder({
            textLayerDiv: textLayerDiv,
            pageIndex: page.pageIndex,
            viewport: viewport
        });
        textLayer.setTextContent(textContent);
        textLayer.render();

        updatePageControls();
    }

    function updatePageControls() {
        pageNumSpan.textContent = `Page ${currentPage} of ${pdfjsDoc.numPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= pdfjsDoc.numPages;
    }

    const pageContainer = document.getElementById('page-container');

    pageContainer.addEventListener('click', (e) => {
        if (currentMode !== 'text') return;

        const rect = pageContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        addDraggableText(x, y);
    });

    function addDraggableText(x, y) {
        const textDiv = document.createElement('div');
        textDiv.style.position = 'absolute';
        textDiv.style.left = `${x}px`;
        textDiv.style.top = `${y}px`;
        textDiv.style.border = '1px solid black';
        textDiv.style.padding = '5px';
        textDiv.classList.add('draggable-text');

        const textArea = document.createElement('textarea');
        textArea.style.width = '100%';
        textArea.style.height = '100%';
        textDiv.appendChild(textArea);

        pageContainer.appendChild(textDiv);

        interact(textDiv)
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                autoScroll: true,
                listeners: {
                    move(event) {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move(event) {
                        let { x, y } = event.target.dataset;

                        x = (parseFloat(x) || 0);
                        y = (parseFloat(y) || 0);

                        Object.assign(event.target.style, {
                            width: `${event.rect.width}px`,
                            height: `${event.rect.height}px`,
                        });

                        Object.assign(event.target.dataset, { x, y });
                    }
                }
            });
    }

    document.getElementById('add-text-to-pdf-btn').addEventListener('click', async () => {
        const textDiv = document.querySelector('.draggable-text');
        if (!textDiv) return;

        const text = textDiv.querySelector('textarea').value;

        const rect = textDiv.getBoundingClientRect();
        const viewerRect = pdfViewer.getBoundingClientRect();
        const scale = 1.5;

        const x = (rect.left - viewerRect.left) / scale;
        const y = (rect.top - viewerRect.top) / scale;

        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];

        const { rgb, StandardFonts } = PDFLib;

        const font = await pdfDoc.embedFont(document.getElementById('font-select').value);
        const color = document.getElementById('font-color-input').value;
        const size = parseInt(document.getElementById('font-size-input').value);

        page.drawText(text, {
            x: x,
            y: page.getHeight() - y - size, // Y is from bottom in pdf-lib
            font,
            size,
            color: rgb(
                parseInt(color.slice(1, 3), 16) / 255,
                parseInt(color.slice(3, 5), 16) / 255,
                parseInt(color.slice(5, 7), 16) / 255
            ),
        });

        const pdfBytes = await pdfDoc.save();
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        pdfjsDoc = await loadingTask.promise;

        renderPage(currentPage);
        pageContainer.removeChild(textDiv);
    });

    saveBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited.pdf';
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    let isDrawing = false;
    let currentPath = [];

    pageContainer.addEventListener('mousedown', (e) => {
        if (currentMode !== 'draw') return;
        isDrawing = true;
        const canvas = pageContainer.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        currentPath.push({ x, y });
    });

    pageContainer.addEventListener('mousemove', (e) => {
        if (!isDrawing || currentMode !== 'draw') return;

        const canvas = pageContainer.querySelector('canvas');
        const context = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const prevX = currentPath[currentPath.length - 1].x;
        const prevY = currentPath[currentPath.length - 1].y;

        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.strokeStyle = document.getElementById('draw-color-input').value;
        context.lineWidth = document.getElementById('draw-thickness-input').value;
        context.stroke();

        currentPath.push({ x, y });
    });

    pageContainer.addEventListener('mouseup', async (e) => {
        if (currentMode === 'draw' && isDrawing) {
            isDrawing = false;

            const scale = 1.5;
            const pageHeight = pdfDoc.getPages()[currentPage - 1].getHeight();
            const pathData = currentPath.map((p, i) => {
                const x = p.x / scale;
                const y = pageHeight - (p.y / scale);
                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            }).join(' ');

            currentPath = [];

            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { rgb } = PDFLib;
            const color = document.getElementById('draw-color-input').value;
            const thickness = parseInt(document.getElementById('draw-thickness-input').value);

            page.drawSvgPath(pathData, {
                borderColor: rgb(
                    parseInt(color.slice(1, 3), 16) / 255,
                    parseInt(color.slice(3, 5), 16) / 255,
                    parseInt(color.slice(5, 7), 16) / 255
                ),
                borderWidth: thickness,
            });

            const pdfBytes = await pdfDoc.save();
            const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
            pdfjsDoc = await loadingTask.promise;

            renderPage(currentPage);
        } else if (currentMode === 'highlight') {
            const selection = window.getSelection();
            if (selection.rangeCount === 0 || selection.isCollapsed) return;

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const pageContainerRect = pageContainer.getBoundingClientRect();
            const scale = 1.5;

            const x = (rect.left - pageContainerRect.left) / scale;
            const y = (rect.top - pageContainerRect.top) / scale;
            const width = rect.width / scale;
            const height = rect.height / scale;

            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { rgb, cmyk } = PDFLib;
            const color = document.getElementById('highlight-color-input').value;

            page.drawRectangle({
                x,
                y: page.getHeight() - y - height,
                width,
                height,
                color: rgb(
                    parseInt(color.slice(1, 3), 16) / 255,
                    parseInt(color.slice(3, 5), 16) / 255,
                    parseInt(color.slice(5, 7), 16) / 255
                ),
                opacity: 0.5,
            });

            const pdfBytes = await pdfDoc.save();
            const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
            pdfjsDoc = await loadingTask.promise;

            renderPage(currentPage);

            selection.removeAllRanges();
        }
    });

});
