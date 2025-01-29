class GraphRenderer {
    constructor() {
        this.graphData = null;
        this.state = null;
        this.ageGroup = null;
        this.selectedVariables = ['total'];
        this.chart = null;

        this.colors = [
            'rgb(75, 192, 192)',
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(153, 102, 255)',
        ];

        this.init();
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        console.error(message);
    }

    init() {
        const storedGraphData = localStorage.getItem('graphState');
        if (!storedGraphData) {
            this.showError('No graph data found');
            return;
        }

        try {
            const { state, ageGroup, data } = JSON.parse(storedGraphData);
            
            this.graphData = data;
            this.state = state;
            this.ageGroup = ageGroup;

            this.setupEventListeners();
            this.renderGraph();
        } catch (error) {
            this.showError(`Error parsing graph data: ${error.message}`);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.graph-var-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const variable = e.target.dataset.var;
                
                e.target.classList.toggle('active');
                
                if (this.selectedVariables.includes(variable)) {
                    this.selectedVariables = this.selectedVariables.filter(v => v !== variable);
                } else {
                    this.selectedVariables.push(variable);
                }

                if (this.selectedVariables.length === 0) {
                    this.selectedVariables = ['total'];
                    document.querySelector('.graph-var-btn[data-var="total"]').classList.add('active');
                }

                this.renderGraph();
            });
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'leu.html';
        });

        document.getElementById('download-csv-btn').addEventListener('click', () => {
            this.downloadGraphDataAsCSV();
        });

        document.getElementById('download-png-btn').addEventListener('click', () => {
            this.downloadGraphAsPNG();
        });
    }

    renderGraph() {
        const graphTitle = document.getElementById('graph-title');
        graphTitle.textContent = `${this.state} Labor Statistics (Ages ${this.ageGroup})`;

        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('labor-chart').getContext('2d');
        
        const datasets = this.selectedVariables.map((variable, index) => ({
            label: this.getLabelForVariable(variable),
            data: this.graphData.map(item => item[variable]),
            borderColor: this.colors[index % this.colors.length],
            tension: 0.1
        }));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.graphData.map(item => item.year),
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: false,
                        text: `${this.state} Labor Statistics (Ages ${this.ageGroup})`
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Values'
                        }
                    }
                }
            }
        });
    }

    getLabelForVariable(variable) {
        const labels = {
            'total': 'Total Population',
            'laborForceRate': 'Labor Force Rate (%)',
            'employmentRatio': 'Employment Ratio (%)',
            'unemploymentRate': 'Unemployment Rate (%)'
        };
        return labels[variable] || 'Value';
    }

    downloadGraphDataAsCSV() {
        const headers = ['Year', ...this.selectedVariables.map(this.getLabelForVariable)];
        const csvContent = [
            headers.join(','),
            ...this.graphData.map(row => 
                [row.year, ...this.selectedVariables.map(variable => row[variable])].join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${this.state}_labor_stats_${this.ageGroup}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadGraphAsPNG() {
        const canvas = document.getElementById('labor-chart');
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.drawImage(canvas, 0, 0);
        
        const link = document.createElement('a');
        link.download = `${this.state}_labor_stats_${this.ageGroup}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GraphRenderer();
});