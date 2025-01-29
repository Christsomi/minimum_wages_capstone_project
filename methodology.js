document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(tabId) {
        tabs.forEach(tab => tab.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedPane = document.getElementById(tabId);
        
        if (selectedTab && selectedPane) {
            selectedTab.classList.add('active');
            selectedPane.classList.add('active');
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
            history.pushState(null, null, `#${tabId}`);
        });
    });

    if (location.hash) {
        const tabId = location.hash.substring(1);
        switchTab(tabId);
    }

    const formatEquation = (text) => {
        const replacements = {
            'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 
            'epsilon': 'ε', 'theta': 'θ', 'lambda': 'λ', 'mu': 'μ',
            'sigma': 'σ', 'tau': 'τ', 'omega': 'ω',
            
            '->': '→', '>=': '≥', '<=': '≤', '!=': '≠',
            '*': '×', 'sum': 'Σ', 'prod': 'Π', 'inf': '∞',
            
            'sqrt': '√', 'int': '∫', 'partial': '∂'
        };

        let formattedText = text;

        formattedText = formattedText.replace(/([a-zA-Z0-9])_([a-zA-Z0-9]+)/g, '$1<sub>$2</sub>');
        formattedText = formattedText.replace(/\^([a-zA-Z0-9]+)/g, '<sup>$1</sup>');

        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(key, 'g');
            formattedText = formattedText.replace(regex, value);
        });

        formattedText = formattedText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, 
            '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>');

        formattedText = formattedText.replace(/\(/g, '<span class="parenthesis">(</span>');
        formattedText = formattedText.replace(/\)/g, '<span class="parenthesis">)</span>');

        return formattedText;
    };

    document.querySelectorAll('.equation').forEach(equation => {
        const originalText = equation.innerHTML.trim();
        equation.innerHTML = formatEquation(originalText);

        if (equation.hasAttribute('data-number')) {
            const number = equation.getAttribute('data-number');
            const numberSpan = document.createElement('span');
            numberSpan.className = 'equation-number';
            numberSpan.textContent = `(${number})`;
            equation.appendChild(numberSpan);
        }

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.innerHTML = 'Copy';
        
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(originalText.trim())
                .then(() => {
                    copyButton.innerHTML = 'Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = 'Copy';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text:', err);
                });
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'equation-wrapper';
        equation.parentNode.insertBefore(wrapper, equation);
        wrapper.appendChild(equation);
        wrapper.appendChild(copyButton);
    });

    const menuButton = document.createElement('button');
    menuButton.className = 'menu-toggle';
    menuButton.innerHTML = 'Menu';
    const tabsContainer = document.querySelector('.tabs');

    if (window.innerWidth < 768) {
        tabsContainer.parentNode.insertBefore(menuButton, tabsContainer);
        menuButton.addEventListener('click', () => {
            tabsContainer.classList.toggle('show');
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth < 768) {
            if (!document.querySelector('.menu-toggle')) {
                tabsContainer.parentNode.insertBefore(menuButton, tabsContainer);
            }
        } else {
            const menuButton = document.querySelector('.menu-toggle');
            if (menuButton) {
                menuButton.remove();
                tabsContainer.classList.remove('show');
            }
        }
    });
});