let pyodide;
let editor;
let editorInitialized = false;

async function loadPyodideAndPlugins() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(["matplotlib", "numpy"]);
    await pyodide.runPythonAsync(`
        import matplotlib.pyplot as plt
        import io, base64
        plt.switch_backend('agg')
    `);
}

let pyodideReadyPromise = loadPyodideAndPlugins();

async function runPython() {
    if (!editor) {
        console.error('Editor not initialized');
        return;
    }
    await pyodideReadyPromise;
    try {
        let code = editor.getValue();
        
        // Capturar stdout e stderr
        pyodide.runPython(`
            import sys
            import io
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()
        `);
        
        // Executar o código do usuário
        await pyodide.runPythonAsync(code);
        
        // Capturar a saída
        let stdout = pyodide.runPython("sys.stdout.getvalue()");
        let stderr = pyodide.runPython("sys.stderr.getvalue()");
        
        // Verificar se há um gráfico
        let plt_data = pyodide.runPython(`
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            base64.b64encode(buf.getvalue()).decode('utf-8')
        `);
        
        // Limpar o plot atual para o próximo uso
        pyodide.runPython("plt.clf()");
        
        // Restaurar stdout e stderr
        pyodide.runPython("sys.stdout = sys.__stdout__")
        pyodide.runPython("sys.stderr = sys.__stderr__")
        
        showOutput(stdout, stderr, plt_data);
    } catch (err) {
        showOutput('', err.toString(), null);
    }
}

function showOutput(stdout, stderr, plt_data) {
    const outputWindow = document.getElementById("output-window");
    const output = document.getElementById("output");
    if (output && outputWindow) {
        let html = '';
        if (stdout) {
            html += `<pre style="color: white;">${escapeHtml(stdout)}</pre>`;
        }
        if (stderr) {
            html += `<pre style="color: #ff6b6b;">${escapeHtml(stderr)}</pre>`;
        }
        if (plt_data) {
            html += `<img src="data:image/png;base64,${plt_data}" alt="Plot" style="max-width: 100%;">`;
        }
        output.innerHTML = html;
        outputWindow.style.display = "block";
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function initPythonEditor() {
    if (editorInitialized) {
        console.log('Editor already initialized');
        return;
    }

    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) {
        console.error('Editor container not found');
        return;
    }

    // Remove any existing child nodes
    while (editorContainer.firstChild) {
        editorContainer.removeChild(editorContainer.firstChild);
    }

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        if (!editorInitialized) {
            editor = monaco.editor.create(editorContainer, {
                value: '# Seu código Python aqui\nprint("Olá, mundo!")',
                language: 'python',
                theme: 'vs-dark',
                minimap: { enabled: false }
            });

            const runButton = document.getElementById('run-code');
            if (runButton) {
                runButton.addEventListener('click', runPython);
            }

            const closeButton = document.getElementById('close-output');
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    const outputWindow = document.getElementById('output-window');
                    if (outputWindow) {
                        outputWindow.style.display = 'none';
                    }
                });
            }

            editorInitialized = true;
            console.log('Editor initialized successfully');
        }
    });
}

function checkAndInitEditor() {
    console.log('Checking for editor container...');
    const editorContainer = document.getElementById('editor-container');
    console.log('Editor container found:', !!editorContainer);
    console.log('Editor initialized:', editorInitialized);
    if (editorContainer && !editorInitialized) {
        console.log('Initializing editor...');
        initPythonEditor();
    } else if (!editorInitialized) {
        console.log('Retrying in 100ms...');
        setTimeout(checkAndInitEditor, 100);
    }
}

// Use MutationObserver to detect when the editor container is added to the DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer && !editorInitialized) {
                observer.disconnect();
                initPythonEditor();
            }
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Also check on DOMContentLoaded, just in case
document.addEventListener("DOMContentLoaded", checkAndInitEditor);