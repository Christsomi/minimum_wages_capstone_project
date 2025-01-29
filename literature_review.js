document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const papers = document.querySelectorAll('.paper-card');
    let activeFilters = new Set(['all']);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    papers.forEach(paper => {
        paper.style.opacity = '0';
        paper.style.transform = 'translateY(20px)';
        paper.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(paper);
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const impact = button.dataset.impact;
            
            filterButtons.forEach(btn => {
                if (btn === button) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            papers.forEach(paper => {
                if (impact === 'all' || paper.dataset.impact === impact) {
                    paper.style.display = 'block';
                    paper.style.opacity = '0';
                    paper.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        paper.style.opacity = '1';
                        paper.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    paper.style.display = 'none';
                }
            });
        });
    });

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search papers...';
    searchInput.classList.add('search-input');
    document.querySelector('.filter-section').appendChild(searchInput);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        papers.forEach(paper => {
            const title = paper.querySelector('.paper-title').textContent.toLowerCase();
            const authors = paper.querySelector('.paper-authors').textContent.toLowerCase();
            const summary = paper.querySelector('.paper-summary').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || 
                authors.includes(searchTerm) || 
                summary.includes(searchTerm)) {
                paper.style.display = 'block';
            } else {
                paper.style.display = 'none';
            }
        });
    });
});
