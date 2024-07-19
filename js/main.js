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

// Simple form submission (you'll need to implement the backend)
document.addEventListener('submit', function(e) {
    if (e.target.id === 'contact-form') {
        e.preventDefault();
        alert('Obrigado por entrar em contato! Esta é uma demonstração, então o formulário não será enviado.');
    }
});