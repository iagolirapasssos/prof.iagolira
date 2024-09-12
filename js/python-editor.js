let pyodide;
let editor;
let editorInitialized = false;
let retryCount = 0;
const maxRetries = 50; // Número máximo de tentativas

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

        // Simular função input em Python usando prompt do JavaScript
        code = code.replace(/input\s*\(\s*['"]([^'"]*)['"]\s*\)/g, "js_prompt('$1')");

        // Capturar stdout e stderr
        pyodide.runPython(`
            import sys
            import io
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()
        `);

        // Adicionar a função js_prompt em Python
        pyodide.runPython(`
            from js import prompt
            def js_prompt(message):
                return prompt(message)
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
                value: `# Código de exemplo para criar um gráfico com Matplotlib e exibir uma equação com LaTeX na legenda
import matplotlib.pyplot as plt
import numpy as np

# Dados de exemplo
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y, label=r'$y = \sin(x)$')

# Adicionando legenda com LaTeX
plt.legend()

# Título e rótulos dos eixos
plt.title('Gráfico de exemplo')
plt.xlabel('x')
plt.ylabel('y')

# Exibir gráfico
plt.show()
`,
                language: 'python',
                theme: 'vs-dark',
                minimap: { enabled: false }
            });

            const runButton = document.getElementById('run-code');
            if (runButton) {
                runButton.addEventListener('click', runPython);
            }

            const fullscreenButton = document.getElementById('toggle-fullscreen');
            const closeButton = document.getElementById('close-fullscreen');
            const closeOutputButton = document.getElementById('close-output');
            const saveButton = document.getElementById('save-code');
            const importButton = document.getElementById('import-code-button');
            const importInput = document.getElementById('import-code');

            if (fullscreenButton) {
                fullscreenButton.addEventListener('click', toggleFullScreen);
            }

            if (closeButton) {
                closeButton.addEventListener('click', toggleFullScreen);
            }

                        if (closeOutputButton) {
                closeOutputButton.addEventListener('click', function() {
                    const outputWindow = document.getElementById('output-window');
                    if (outputWindow) {
                        outputWindow.style.display = 'none';
                    }
                });
            }

            if (saveButton) {
                saveButton.addEventListener('click', function() {
                    const code = editor.getValue();
                    const blob = new Blob([code], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'code.py';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }

            if (importButton) {
                importButton.addEventListener('click', function() {
                    importInput.click();
                });
            }

            if (importInput) {
                importInput.addEventListener('change', function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const code = e.target.result;
                            editor.setValue(code);
                        };
                        reader.readAsText(file);
                    }
                });
            }

            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && editorContainer.classList.contains('fullscreen')) {
                    toggleFullScreen();
                }
            });

            editorInitialized = true;
            console.log('Editor initialized successfully');
        }
    });
}

function toggleFullScreen() {
    const editorContainer = document.getElementById('editor-container');
    const buttonsContainer = document.getElementById('buttons-container');
    const closeButton = document.getElementById('close-fullscreen');

    if (editorContainer.classList.contains('fullscreen')) {
        editorContainer.classList.remove('fullscreen');
        buttonsContainer.classList.remove('fullscreen');
        closeButton.classList.remove('fullscreen');
    } else {
        editorContainer.classList.add('fullscreen');
        buttonsContainer.classList.add('fullscreen');
        closeButton.classList.add('fullscreen');
    }
}

function checkAndInitEditor() {
    console.log('Checking for editor container...');
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer && !editorInitialized) {
        console.log('Editor container found:', !!editorContainer);
        console.log('Editor initialized:', editorInitialized);
        console.log('Initializing editor...');
        initPythonEditor();
    } else if (retryCount < maxRetries) {
        retryCount++;
        console.log('Editor container not found or already initialized. Retrying in 100ms...');
        setTimeout(checkAndInitEditor, 100);
    } else {
        console.error('Editor container not found after maximum retries. Initialization aborted.');
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
