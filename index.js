const navToggle = document.getElementById('nav-toggle');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const expandButtons = document.querySelectorAll('.expand-button');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navToggle.checked = false;
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        contentSections.forEach(section => section.classList.remove('active'));
        const sectionId = item.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
    });
});

expandButtons.forEach(button => {
    button.addEventListener('click', () => {
        const content = button.nextElementSibling;
        const isExpanded = content.style.display === 'block';
        
        button.classList.toggle('active');
        content.style.display = isExpanded ? 'none' : 'block';
    });
});

navItems[0].click();