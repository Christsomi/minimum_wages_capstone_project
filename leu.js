class DataProcessor {
    constructor() {
        this.processedData = {};
        this.selectedStates = [];
        this.selectedAgeGroup = '16-19';
        this.isLoading = true;

        this.AGE_GROUPS = {
            '16-19': 2,
            '20-24': 3
        };

        this.init();
    }

    async init() {
        try {
            await this.loadAllData();
            this.setupEventListeners();
            this.hideLoading();
            this.renderUI();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize data');
        }
    }

    async loadAllData() {
        let allData = {};

        try {
            for (let year = 2010; year <= 2019; year++) {
                const fileName = `data/data_all_states_LEU_${year}.csv`;
                const response = await fetch(fileName);
                
                if (!response.ok) {
                    throw new Error(`Failed to load data for year ${year}`);
                }

                const text = await response.text();
                const parseResult = await this.parseCSV(text);

                for (const [ageGroup, rowIndex] of Object.entries(this.AGE_GROUPS)) {
                    const yearData = year <= 2014 ? 
                        this.processEarlyYearData(parseResult, year, rowIndex) :
                        this.processLaterYearData(parseResult, year, rowIndex);
                    
                    if (!allData[ageGroup]) allData[ageGroup] = [];
                    allData[ageGroup] = [...allData[ageGroup], ...yearData];
                }
            }

            this.processedData = this.processAgeGroupData(allData);

        } catch (error) {
            console.error('Data loading error:', error);
            throw error;
        }
    }

    parseCSV(text) {
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                complete: results => resolve(results.data),
                error: error => reject(error)
            });
        });
    }

    processEarlyYearData(data, year, ageGroupIndex) {
        const ageGroupRow = data[ageGroupIndex];
        const transformedData = [];

        Object.entries(ageGroupRow).forEach(([key, value]) => {
            if (key !== 'Label (Grouping)') {
                const [state, category] = key.split('!!');
                if (category) {
                    let categoryType = '';
                    if (category.includes('Total')) categoryType = 'Total';
                    else if (category.includes('In labor force')) categoryType = 'Labor Force Participation Rate';
                    else if (category.includes('Employed')) categoryType = 'Employment/Population Ratio';
                    else if (category.includes('Unemployment rate')) categoryType = 'Unemployment rate';

                    transformedData.push({
                        state: state,
                        category: categoryType,
                        value: this.cleanValue(value),
                        year: year
                    });
                }
            }
        });

        return transformedData;
    }

    processLaterYearData(data, year, ageGroupIndex) {
        const ageGroupRow = data[ageGroupIndex];
        const transformedData = [];

        Object.entries(ageGroupRow).forEach(([key, value]) => {
            if (key !== 'Label (Grouping)') {
                const [state, category, estimate] = key.split('!!');
                if (category && estimate === 'Estimate') {
                    transformedData.push({
                        state: state,
                        category: category,
                        value: this.cleanValue(value),
                        year: year
                    });
                }
            }
        });

        return transformedData;
    }

    cleanValue(value) {
        if (typeof value === 'string') {
            return value.includes('%') ? 
                parseFloat(value.replace('%', ''))/100 :
                parseFloat(value.replace(/[^0-9.]/g, ''));
        }
        return value;
    }

    processAgeGroupData(allData) {
        const processed = {};
        for (const ageGroup of Object.keys(this.AGE_GROUPS)) {
            processed[ageGroup] = _.chain(allData[ageGroup])
                .groupBy('state')
                .mapValues(stateRows => 
                    _.chain(stateRows)
                        .groupBy('year')
                        .mapValues(yearRows =>
                            _.chain(yearRows)
                                .keyBy('category')
                                .mapValues('value')
                                .value()
                        )
                        .value()
                )
                .value();
        }
        return processed;
    }

    setupEventListeners() {
        document.querySelectorAll('.age-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.age-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedAgeGroup = e.target.dataset.age;
                this.renderUI();
            });
        });
    }

    renderStateButtons() {
        const states = Object.keys(this.processedData[this.selectedAgeGroup]).sort();
        const container = document.getElementById('state-buttons');
        container.innerHTML = '';

        states.forEach(state => {
            const button = document.createElement('button');
            button.textContent = state;
            button.classList.toggle('active', this.selectedStates.includes(state));
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                if (this.selectedStates.includes(state)) {
                    this.selectedStates = this.selectedStates.filter(s => s !== state);
                } else {
                    this.selectedStates.push(state);
                }
                this.renderTables();
            });
            container.appendChild(button);
        });
    }

    renderTables() {
        const container = document.getElementById('data-container');
        container.innerHTML = '';

        this.selectedStates.forEach(state => {
            const stateData = this.processedData[this.selectedAgeGroup][state];
            const tableDiv = document.createElement('div');
            tableDiv.className = 'data-card';

            const stateDataForGraph = Object.entries(stateData).map(([year, data]) => ({
                year: parseInt(year),
                total: Math.round(data['Total']),
                laborForceRate: (data['Labor Force Participation Rate'] * 100).toFixed(1),
                employmentRatio: (data['Employment/Population Ratio'] * 100).toFixed(1),
                unemploymentRate: (data['Unemployment rate'] * 100).toFixed(1)
            }));

            tableDiv.innerHTML = `
                <h2>${state} (Ages ${this.selectedAgeGroup})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Total</th>
                            <th>Labor Force Rate</th>
                            <th>Employment Ratio</th>
                            <th>Unemployment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(stateData).map(([year, data]) => `
                            <tr>
                                <td>${year}</td>
                                <td>${Math.round(data['Total']).toLocaleString()}</td>
                                <td>${(data['Labor Force Participation Rate'] * 100).toFixed(1)}%</td>
                                <td>${(data['Employment/Population Ratio'] * 100).toFixed(1)}%</td>
                                <td>${(data['Unemployment rate'] * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="table-actions">
                    <button class="graph-btn" 
                            data-state="${state}" 
                            data-age-group="${this.selectedAgeGroup}">
                        See a Graph
                    </button>
                    <button class="download-btn" 
                            data-state="${state}" 
                            data-age-group="${this.selectedAgeGroup}">
                        Download CSV
                    </button>
                </div>
            `;

            const graphButton = tableDiv.querySelector('.graph-btn');
            graphButton.addEventListener('click', () => {
                localStorage.setItem('graphState', JSON.stringify({
                    state: state,
                    ageGroup: this.selectedAgeGroup,
                    data: stateDataForGraph
                }));
                window.location.href = 'graph.html';
            });

            const downloadButton = tableDiv.querySelector('.download-btn');
            downloadButton.addEventListener('click', () => {
                this.downloadStateDataAsCSV(state, stateDataForGraph);
            });

            container.appendChild(tableDiv);
        });
    }

    downloadStateDataAsCSV(state, data) {
        const headers = ['Year', 'Total', 'Labor Force Rate', 'Employment Ratio', 'Unemployment Rate'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.year,
                row.total,
                row.laborForceRate,
                row.employmentRatio,
                row.unemploymentRate
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${state}_labor_stats_${this.selectedAgeGroup}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    renderUI() {
        if (this.isLoading) {
            return;
        }
        this.renderStateButtons();
        this.renderTables();
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        this.isLoading = false;
    }

    showError(message) {
        const container = document.getElementById('data-container');
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DataProcessor();
});