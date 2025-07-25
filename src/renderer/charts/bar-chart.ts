import { Chart } from "chart.js";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ref, createRef } from 'lit/directives/ref.js';

@customElement('bar-chart')
export class BarChart extends LitElement {
    @property({ type: Object })
    data: any = { 
        values: [], 
        labels: [] };

    canvasRef = createRef();

    constructor() {
        super();      
    }

    chart: Chart;

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.chart) {
            this.chart.destroy();
        }
    }

    updated(changedProperties: PropertyValues) {        
        if (changedProperties.has('data')) {
            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(<any>this.canvasRef.value, {
                type: 'bar',
                data: {
                    labels: this.data.labels,
                    datasets: [{
                        label: 'Test',
                        data: this.data.values,
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    render() {
        return html`
            <canvas ${ref(this.canvasRef)}></canvas>
        `;
    }
}