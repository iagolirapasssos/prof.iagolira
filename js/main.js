document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('nav a');

    function loadPage(page) {
        fetch(`pages/${page}.html`)
            .then(response => response.text())
            .then(html => {
                content.innerHTML = html;
                if (page === 'python-playground') {
                    initPythonEditor();
                }
            })
            .catch(error => {
                console.error('Error loading page:', error);
                content.innerHTML = '<p>Error loading page.</p>';
            });
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
