document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('nav a');
    let playgroundLoaded = false;

    function loadPage(page) {
        fetch(`pages/${page}.html`)
            .then(response => response.text())
            .then(html => {
                content.innerHTML = html;
                if (page === 'python-playground' && !playgroundLoaded) {
                    loadPlayground();
                }
            })
            .catch(error => {
                console.error('Error loading page:', error);
                content.innerHTML = '<p>Error loading page.</p>';
            });
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    async function loadPlayground() {
        try {
            await loadScript('https://cdn.jsdelivr.net/pyodide/v0.22.1/full/pyodide.js');
            await loadScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js');
            await loadScript('js/python-editor.js');
            initPythonEditor(); // Chama a função initPythonEditor após carregar os scripts
            playgroundLoaded = true;
        } catch (error) {
            console.error('Failed to load Playground scripts:', error);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });

    // Load home page by default
    loadPage('home');
});
