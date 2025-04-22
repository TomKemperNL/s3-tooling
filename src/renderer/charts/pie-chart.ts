import { Chart } from "chart.js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ref, createRef } from 'lit/directives/ref.js';

@customElement('pie-chart')
export class PieChart extends LitElement {
    @property({ type: Object })
    data: any = { 
        values: [], 
        labels: [] };

    canvasRef = createRef();

    static styles = [
        // Add your CSS styles here
    ];

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

    updated(changedProperties) {
        if (changedProperties.has('data')) {
            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(<any>this.canvasRef.value, {
                type: 'pie',
                data: {
                    labels: this.data.labels,
                    datasets: [{
                        label: 'Lines by author (current revision)',
                        data: this.data.values,
                        borderWidth: 1
                    }]
                }
               
            });
        }
    }

    render() {
        return html`
            <h1>PIE></h1>
            <canvas ${ref(this.canvasRef)}></canvas>
        `;
    }
}