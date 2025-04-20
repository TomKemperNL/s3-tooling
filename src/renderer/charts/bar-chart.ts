import { Chart } from "chart.js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ref, createRef } from 'lit/directives/ref.js';

@customElement('bar-chart')
export class BarChart extends LitElement {
    @property({ type: Object })
    data: any = { 
        values: [12, 19, 3, 5, 2, 3], 
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'] };

    canvasRef = createRef();

    static styles = [
        // Add your CSS styles here
    ];

    constructor() {
        super();
        setTimeout(() => {
            this.data = {
                values: [1, 2, 3, 4, 5, 6],
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange']
            };

        }, 2500);
    }

    chart: Chart;

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.chart) {
            this.chart.destroy();
        }
    }

    updated(changedProperties) {
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