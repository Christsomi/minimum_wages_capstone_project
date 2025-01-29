class MinimumWageComparison {
    constructor() {
        this.controlStates = [
            "Indiana", "Iowa", "Kansas", "North Dakota", "Wisconsin", 
            "New Hampshire", "Pennsylvania", "Virginia", "Kentucky", 
            "North Carolina", "Oklahoma", "Texas", "Alabama", "Louisiana", 
            "Mississippi", "Tennessee", "South Carolina", "Idaho", 
            "New Mexico", "Utah"
        ];

        this.data = null;
        this.states = [];
        this.selectedStates = [];
        this.isLoading = true;
        this.currentView = 'table';
        this.chart = null;
        this.maxStatesForGraph = 10;
        this.errorTimeout = null;
        
        this.colors = [
            '#2563eb', '#dc2626', '#059669', '#d97706', 
            '#7c3aed', '#db2777', '#2dd4bf', '#84cc16',
            '#6366f1', '#ea580c'
        ];

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.renderStateButtons();
            this.renderUI();
            this.hideLoading();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize data. Please try refreshing the page.');
        }
    }

    async loadData() {
        try {
            const response = await fetch('minimum_wages/merged_minimum_wages.csv');
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const text = await response.text();
            
            this.data = await this.parseCSV(text);
            
            this.states = Object.keys(this.data[0])
                .filter(key => key !== 'Year')
                .map(state => state.replace(/_/g, ' '))
                .sort();
                
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    parseCSV(text) {
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: results => resolve(results.data),
                error: error => reject(error)
            });
        });
    }

    setupEventListeners() {
        document.getElementById('select-all-btn').addEventListener('click', () => {
            if (this.currentView === 'graph') {
                this.selectedStates = [...this.states.slice(0, this.maxStatesForGraph)];
                this.showError(`Limited to ${this.maxStatesForGraph} states in graph view`);
            } else {
                this.selectedStates = [...this.states];
            }
            this.renderStateButtons();
            this.renderUI();
        });

        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.selectedStates = [];
            this.renderStateButtons();
            this.renderUI();
        });

        document.getElementById('show-table-btn').addEventListener('click', async (e) => {
            document.querySelectorAll('.view-btn').forEach(b => 
                b.classList.remove('active'));
            e.target.classList.add('active');
            this.currentView = 'table';
            await this.renderUI();
            document.getElementById('download-png-btn').style.display = 'none';
        });

        document.getElementById('show-graph-btn').addEventListener('click', async (e) => {
            if (this.selectedStates.length > this.maxStatesForGraph) {
                this.showError(`Please select no more than ${this.maxStatesForGraph} states for graph view`);
                return;
            }
            document.querySelectorAll('.view-btn').forEach(b => 
                b.classList.remove('active'));
            e.target.classList.add('active');
            this.currentView = 'graph';
            await this.renderUI();
            document.getElementById('download-png-btn').style.display = 'inline-block';
        });

        document.getElementById('download-csv-btn').addEventListener('click', () => 
            this.downloadDataAsCSV());
        
        document.getElementById('download-png-btn').addEventListener('click', () => 
            this.downloadGraphAsPNG());

        document.getElementById('back-btn').addEventListener('click', () => 
            window.location.href = 'index.html');
    }

    renderStateButtons() {
        const container = document.getElementById('state-buttons');
        container.innerHTML = '';

        this.states.forEach(state => {
            const button = document.createElement('button');
            button.textContent = state;
            button.classList.toggle('active', this.selectedStates.includes(state));
            
            button.addEventListener('click', () => {
                if (!this.selectedStates.includes(state)) {
                    if (this.currentView === 'graph' && this.selectedStates.length >= this.maxStatesForGraph) {
                        this.showError(`Maximum ${this.maxStatesForGraph} states allowed in graph view`);
                        return;
                    }
                    this.selectedStates.push(state);
                } else {
                    this.selectedStates = this.selectedStates.filter(s => s !== state);
                }
                button.classList.toggle('active');
                this.renderUI();
            });
            container.appendChild(button);
        });
    }

    async renderTable() {
        const container = document.getElementById('data-container');
        const graphContainer = document.getElementById('graph-container');
        
        container.style.display = 'block';
        graphContainer.style.display = 'none';

        if (this.selectedStates.length === 0) {
            container.innerHTML = '<div class="data-card">Please select at least one state to compare</div>';
            return;
        }

        const table = document.createElement('div');
        table.className = 'data-card';
        
        let tableHTML = `
            <h2>Minimum Wage Comparison</h2>
            <table>
                <thead>
                    <tr>
                        <th>Year</th>
                        ${this.selectedStates.map(state => 
                            `<th>${state}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

        this.data.forEach(row => {
            tableHTML += `<tr>
                <td>${row.Year}</td>
                ${this.selectedStates.map(state => {
                    const dataKey = state.replace(/\s+/g, '_');
                    const isControlState = this.controlStates.includes(state);
                    const blueStyle = isControlState ? 'style="background-color: #e6f2ff;"' : '';
                    return `<td ${blueStyle}>$${row[dataKey].toFixed(2)}</td>`;
                }).join('')}
            </tr>`;
        });

        tableHTML += '</tbody></table>';
        table.innerHTML = tableHTML;
        container.innerHTML = '';
        container.appendChild(table);
    }

    async renderGraph() {
        if (this.selectedStates.length === 0) {
            this.showError('Please select at least one state to compare');
            return;
        }

        if (this.selectedStates.length > this.maxStatesForGraph) {
            this.showError(`Please select no more than ${this.maxStatesForGraph} states for graph view`);
            this.currentView = 'table';
            document.getElementById('show-table-btn').classList.add('active');
            document.getElementById('show-graph-btn').classList.remove('active');
            await this.renderTable();
            return;
        }

        const container = document.getElementById('data-container');
        const graphContainer = document.getElementById('graph-container');
        
        container.style.display = 'none';
        graphContainer.style.display = 'block';

        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('comparison-chart').getContext('2d');
        
        const datasets = this.selectedStates.map((state, index) => ({
            label: state,
            data: this.data.map(row => row[state.replace(/\s+/g, '_')]),
            borderColor: this.colors[index % this.colors.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6
        }));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.map(row => row.Year),
                datasets: datasets
            },
            plugins: [{
                id: 'custom_canvas_background_color',
                beforeDraw: (chart) => {
                    const ctx = chart.canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Minimum Wage Comparison (2010-2019)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#1f2937',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Minimum Wage ($)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: value => '$' + value.toFixed(2),
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: '#e5e7eb'
                        }
                    }
                }
            }
        });
    }

    async downloadDataAsCSV() {
        if (this.selectedStates.length === 0) {
            this.showError('Please select at least one state to download data');
            return;
        }

        const headers = ['Year', ...this.selectedStates];
        
        const csvContent = [
            headers.join(','),
            ...this.data.map(row => [
                row.Year,
                ...this.selectedStates.map(state => 
                    row[state.replace(/\s+/g, '_')])
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'minimum_wage_comparison.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    downloadGraphAsPNG() {
        if (!this.chart) {
            this.showError('No graph available to download');
            return;
        }

        const link = document.createElement('a');
        link.download = 'minimum_wage_comparison.png';
        link.href = this.chart.canvas.toDataURL('image/png', 1.0);
        link.click();
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            errorElement.style.display = 'none';
            setTimeout(() => {
                this.displayError(errorElement, message);
            }, 100);
        } else {
            this.displayError(errorElement, message);
        }
    }

    displayError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        this.errorTimeout = setTimeout(() => {
            errorElement.style.display = 'none';
            this.errorTimeout = null;
        }, 5000);
    }

    hideError() {
        const errorElement = document.getElementById('error-message');
        errorElement.style.display = 'none';
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
    }

    async renderUI() {
        if (this.isLoading) {
            return;
        }
        
        this.hideError();
        
        if (this.currentView === 'table') {
            await this.renderTable();
        } else {
            await this.renderGraph();
        }
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        this.isLoading = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MinimumWageComparison();
});