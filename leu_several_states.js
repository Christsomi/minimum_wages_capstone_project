class MultiStateComparison {
    constructor() {
        this.processedData = {};
        this.selectedStates = [];
        this.selectedVariable = null;
        this.selectedAgeGroup = '16-19'; 
        this.isLoading = true;
        this.currentView = 'table';
        this.chart = null;
        this.maxStatesForGraph = 10;

        this.variableMap = {
            'Total Population': 'Total',
            'Labor Force Rate': 'Labor Force Participation Rate',
            'Employment Ratio': 'Employment/Population Ratio',
            'Unemployment Rate': 'Unemployment rate'
        };

        this.colors = [
            '#2563eb', '#dc2626', '#059669', '#d97706', 
            '#7c3aed', '#db2777', '#2dd4bf', '#84cc16',
            '#6366f1', '#ea580c'
        ];

        this.states = [
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
            'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
            'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
            'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
            'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
            'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
            'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
            'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
            'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
            'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ];

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.renderStateButtons();
            this.hideLoading();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize data');
        }
    }

    getDataFolder(ageGroup) {
        return ageGroup === '16-19' ? 'each_state_leu' : 'each_state_leu_20_24';
    }

    async loadStateData(state) {
        const cacheKey = `${state}_${this.selectedAgeGroup}`;
        if (this.processedData[cacheKey]?.[this.selectedVariable]) {
            return this.processedData[cacheKey][this.selectedVariable];
        }

        try {
            const stateFileName = state.toLowerCase().replace(/\s+/g, '_');
            const folder = this.getDataFolder(this.selectedAgeGroup);
            const response = await fetch(`${folder}/${stateFileName}.csv`);
            
            if (!response.ok) {
                throw new Error(`Failed to load data for ${state}`);
            }

            const text = await response.text();
            const parseResult = await this.parseCSV(text);
            
            if (!this.processedData[cacheKey]) {
                this.processedData[cacheKey] = {};
            }

            const yearData = {};
            parseResult.data.forEach(row => {
                if (row.year && !isNaN(row.year)) {
                    yearData[row.year] = row[this.variableMap[this.selectedVariable]];
                }
            });

            this.processedData[cacheKey][this.selectedVariable] = yearData;
            return yearData;

        } catch (error) {
            console.error(`Error loading data for ${state}:`, error);
            throw error;
        }
    }

    parseCSV(text) {
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: results => resolve(results),
                error: error => reject(error)
            });
        });
    }

    async loadSelectedStatesData() {
        const loadPromises = this.selectedStates.map(state => 
            this.loadStateData(state));
        await Promise.all(loadPromises);
    }

    setupEventListeners() {
        document.querySelectorAll('.age-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.age-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedAgeGroup = e.target.dataset.age;
                this.processedData = {}; 
                await this.renderUI();
            });
        });

        document.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.var-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedVariable = e.target.dataset.var;
                this.processedData = {};
                await this.renderUI();
            });
        });

        document.getElementById('show-table-btn').addEventListener('click', async (e) => {
            document.querySelectorAll('.view-btn').forEach(b => 
                b.classList.remove('active'));
            e.target.classList.add('active');
            this.currentView = 'table';
            await this.renderUI();
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
        });

        document.getElementById('download-csv-btn').addEventListener('click', () => 
            this.downloadDataAsCSV());
        
        document.getElementById('download-png-btn').addEventListener('click', () => 
            this.downloadGraphAsPNG());
    }

    renderStateButtons() {
        const container = document.getElementById('state-buttons');
        container.innerHTML = '';

        this.states.forEach(state => {
            const button = document.createElement('button');
            button.textContent = state;
            button.classList.toggle('active', this.selectedStates.includes(state));
            
            if (!this.selectedVariable) {
                button.style.opacity = '0.7';
                button.style.cursor = 'not-allowed';
            }

            button.addEventListener('click', async () => {
                if (!this.selectedVariable) {
                    this.showError('Please select a variable first');
                    return;
                }
                
                button.classList.toggle('active');
                if (this.selectedStates.includes(state)) {
                    this.selectedStates = this.selectedStates.filter(s => s !== state);
                } else {
                    this.selectedStates.push(state);
                }
                await this.renderUI();
            });
            container.appendChild(button);
        });
    }

    async renderTable() {
        const container = document.getElementById('data-container');
        const graphContainer = document.getElementById('graph-container');
        const downloadPngBtn = document.getElementById('download-png-btn');
        
        container.style.display = 'block';
        graphContainer.style.display = 'none';
        downloadPngBtn.style.display = 'none';

        if (!this.selectedVariable) {
            container.innerHTML = '<div class="data-card">Please select a variable to compare</div>';
            return;
        }

        if (this.selectedStates.length === 0) {
            container.innerHTML = '<div class="data-card">Please select at least one state to compare</div>';
            return;
        }

        await this.loadSelectedStatesData();

        const table = document.createElement('div');
        table.className = 'data-card';
        
        let tableHTML = `
            <h2>${this.selectedVariable} Comparison (Ages ${this.selectedAgeGroup})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Year</th>
                        ${this.selectedStates.map(state => 
                            `<th>${state}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

        for (let year = 2010; year <= 2019; year++) {
            tableHTML += `<tr>
                <td>${year}</td>
                ${this.selectedStates.map(state => {
                    const cacheKey = `${state}_${this.selectedAgeGroup}`;
                    const value = this.processedData[cacheKey][this.selectedVariable][year];
                    return `<td>${this.formatValue(value)}</td>`;
                }).join('')}
            </tr>`;
        }

        tableHTML += '</tbody></table>';
        table.innerHTML = tableHTML;
        container.innerHTML = '';
        container.appendChild(table);
    }

    async renderGraph() {
        if (!this.selectedVariable) {
            this.showError('Please select a variable to compare');
            return;
        }

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

        await this.loadSelectedStatesData();

        const container = document.getElementById('data-container');
        const graphContainer = document.getElementById('graph-container');
        const downloadPngBtn = document.getElementById('download-png-btn');
        
        container.style.display = 'none';
        graphContainer.style.display = 'block';
        downloadPngBtn.style.display = 'inline-block';

        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('comparison-chart').getContext('2d');
        
        const datasets = this.selectedStates.map((state, index) => {
            const cacheKey = `${state}_${this.selectedAgeGroup}`;
            return {
                label: state,
                data: Array.from({length: 10}, (_, i) => {
                    const year = 2010 + i;
                    return this.processedData[cacheKey][this.selectedVariable][year];
                }),
                borderColor: this.colors[index],
                tension: 0.1
            };
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 10}, (_, i) => 2010 + i),
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
                plugins: {
                    title: {
                        display: true,
                        text: `${this.selectedVariable} Comparison (Ages ${this.selectedAgeGroup})`,
                        font: {
                            size: 16
                        },
                        padding: 20
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (this.selectedVariable === 'Total Population') {
                                        label += Math.round(context.parsed.y).toLocaleString();
                                    } else {
                                        label += context.parsed.y.toFixed(2) + '%';
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: this.getYAxisLabel(),
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            callback: (value) => {
                                if (this.selectedVariable === 'Total Population') {
                                    return Math.round(value).toLocaleString();
                                } else {
                                    return value.toFixed(2) + '%';
                                }
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                }
            }
        });
    }

    formatValue(value) {
        if (this.selectedVariable === 'Total Population') {
            return Math.round(value).toLocaleString();
        } else {
            return value.toFixed(2) + '%';
        }
    }

    getYAxisLabel() {
        switch (this.selectedVariable) {
            case 'Total Population':
                return 'Population';
            case 'Labor Force Rate':
                return 'Labor Force Participation Rate (%)';
            case 'Employment Ratio':
                return 'Employment/Population Ratio (%)';
            case 'Unemployment Rate':
                return 'Unemployment Rate (%)';
            default:
                return 'Value';
        }
    }

    async downloadDataAsCSV() {
        if (!this.selectedVariable) {
            this.showError('Please select a variable to download');
            return;
        }

        if (this.selectedStates.length === 0) {
            this.showError('Please select at least one state to download data');
            return;
        }

        await this.loadSelectedStatesData();

        const headers = ['Year', ...this.selectedStates];
        
        const csvContent = [
            headers.join(','),
            ...Array.from({length: 10}, (_, i) => {
                const year = 2010 + i;
                return [
                    year,
                    ...this.selectedStates.map(state => {
                        const cacheKey = `${state}_${this.selectedAgeGroup}`;
                        return this.processedData[cacheKey][this.selectedVariable][year];
                    })
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 
            `${this.selectedVariable}_${this.selectedAgeGroup}_comparison.csv`);
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
        link.download = `${this.selectedVariable}_${this.selectedAgeGroup}_comparison.png`;
        link.href = this.chart.canvas.toDataURL('image/png');
        link.click();
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

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('error-message');
        errorElement.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MultiStateComparison();
});