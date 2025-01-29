document.addEventListener('DOMContentLoaded', () => {
    const categoryButtons = document.querySelectorAll('.category-btn');
    const hypothesisCards = document.querySelectorAll('.hypothesis-card');
    const searchInput = document.getElementById('search-input');

    function filterByCategory(category) {
        hypothesisCards.forEach(card => {
            card.classList.remove('hidden');

            if (category !== 'all') {
                if (card.getAttribute('data-category') !== category) {
                    card.classList.add('hidden');
                }
            }
        });
    }

    function searchHypotheses() {
        const searchTerm = searchInput.value.toLowerCase();

        hypothesisCards.forEach(card => {
            if (card.classList.contains('hidden')) return;

            const cardText = card.textContent.toLowerCase();
            const matchesSearch = cardText.includes(searchTerm);

            card.style.display = matchesSearch ? 'block' : 'none';
        });
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            button.classList.add('active');
            
            filterByCategory(button.getAttribute('data-category'));
        });
    });

    searchInput.addEventListener('input', searchHypotheses);

    const accentColors = [
        '#3498db',
        '#2ecc71',
        '#e74c3c', 
        '#f39c12',
        '#9b59b6',
    ];

    hypothesisCards.forEach(card => {
        const randomColor = accentColors[Math.floor(Math.random() * accentColors.length)];
        card.style.borderTopColor = randomColor;
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    hypothesisCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    hypothesisCards.forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
        });

        card.addEventListener('mouseleave', (e) => {
            e.currentTarget.style.transform = 'scale(1)';
        });
    });
});