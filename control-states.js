class MinimumWageAnalysis {
    constructor() {
        this.wageData = null;
        this.chart = null;
        this.currentView = 'all';
        this.currentPeriod = 'full';
        
        this.stateCategories = {
            treatment: [
                'California', 'Massachusetts', 'New_York', 'Washington',
                'Oregon', 'Colorado', 'Arizona', 'Maine', 'Rhode_Island'
            ],
            control: [
                'Texas', 'Georgia', 'Indiana', 'Iowa', 'Kansas', 
                'North_Carolina', 'South_Carolina', 'Tennessee', 'Virginia'
            ],
            excluded: [
                'Hawaii', 'Alaska', 'Nevada', 'Montana', 'Wyoming',
                'Idaho', 'North_Dakota', 'South_Dakota'
            ]
        };

        this.colors = {
            treatment: 'rgba(37, 99, 235, 0.8)',
            control: 'rgba(5, 150, 105, 0.8)',
            excluded: 'rgba(220, 38, 38, 0.8)'
        };

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.updateStateCounts();
            this.renderWageTrends();
            this.renderStateGrid();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize data');
        }
    }

    async loadData() {
        try {
            const response = await window.fs.readFile('merged_minimum_wages.csv');
            const text = new TextDecoder().decode(response);
            
            const parsedData = await new Promise((resolve) => {
                Papa.parse(text, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results) => resolve(results.data)
                });
            });

            this.wageData = parsedData;
        } catch (error) {
            console.error('Data loading error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.querySelectorAll('[data-view]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.updateVisualization();
            });
        });

        document.querySelectorAll('[data-period]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.updateVisualization();
            });
        });
    }

    updateVisualization() {
        this.renderWageTrends();
        this.renderStateGrid();
    }

    updateStateCounts() {
        document.getElementById('treatment-count').textContent = this.stateCategories.treatment.length;
        document.getElementById('control-count').textContent = this.stateCategories.control.length;
        document.getElementById('excluded-count').textContent = this.stateCategories.excluded.length;
    }

    getStateCategory(state) {
        if (this.stateCategories.treatment.includes(state)) return 'treatment';
        if (this.stateCategories.control.includes(state)) return 'control';
        if (this.stateCategories.excluded.includes(state)) return 'excluded';
        return 'other';
    }

    prepareChartData() {
        if (!this.wageData || this.wageData.length === 0) return null;

        const years = this.wageData.map(d => d.Year);
        const datasets = [];

        let statesToShow = [];
        if (this.currentView === 'all') {
            statesToShow = [...this.stateCategories.treatment, ...this.stateCategories.control, ...this.stateCategories.excluded];
        } else {
            statesToShow = this.stateCategories[this.currentView] || [];
        }

        let yearRange;
        switch (this.currentPeriod) {
            case 'pre':
                yearRange = years.filter(y => y <= 2014);
                break;
            case 'post':
                yearRange = years.filter(y => y >= 2015);
                break;
            default:
                yearRange = years;
        }

        statesToShow.forEach(state => {
            const stateData = this.wageData
                .filter(d => yearRange.includes(d.Year))
                .map(d => ({
                    x: d.Year,
                    y: d[state]
                }));

            const category = this.getStateCategory(state);
            
            datasets.push({
                label: state.replace(/_/g, ' '),
                data: stateData,
                borderColor: this.colors[category],
                backgroundColor: this.colors[category],
                tension: 0.3
            });
        });

        return {
            labels: yearRange,
            datasets: datasets
        };
    }

    renderWageTrends() {
        const ctx = document.getElementById('wage-trends').getContext('2d');
        const chartData = this.prepareChartData();

        if (!chartData) return;

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'Minimum Wage Trends by State',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Minimum Wage ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    renderStateGrid() {
        const container = document.getElementById('state-grid');
        container.innerHTML = '';

        let statesToShow = [];
        if (this.currentView === 'all') {
            statesToShow = [...this.stateCategories.treatment, ...this.stateCategories.control, ...this.stateCategories.excluded];
        } else {
            statesToShow = this.stateCategories[this.currentView] || [];
        }

        statesToShow.forEach(state => {
            const stateData = this.getStateData(state);
            const category = this.getStateCategory(state);
            
            const card = document.createElement('div');
            card.className = `state-card ${category}`;
            
            const wageChange = this.calculateWageChange(state);
            
            card.innerHTML = `
                <h3>${state.replace(/_/g, ' ')}</h3>
                <div class="state-details">
                    <p>Category: ${category.charAt(0).toUpperCase() + category.slice(1)}</p>
                    <p>Initial Wage: $${stateData.initial.toFixed(2)}</p>
                    <p>Final Wage: $${stateData.final.toFixed(2)}</p>
                    <p>Change: ${wageChange >= 0 ? '+' : ''}${wageChange.toFixed(1)}%</p>
                </div>
            `;

            container.appendChild(card);
        });
    }

    getStateData(state) {
        const stateWages = this.wageData.map(d => d[state]);
        return {
            initial: stateWages[0],
            final: stateWages[stateWages.length - 1]
        };
    }

    calculateWageChange(state) {
        const data = this.getStateData(state);
        return ((data.final - data.initial) / data.initial) * 100;
    }

    showError(message) {
        const container = document.querySelector('.visualization-container');
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MinimumWageAnalysis();
});