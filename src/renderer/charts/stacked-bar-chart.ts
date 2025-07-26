import { Chart } from "chart.js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ref, createRef } from 'lit/directives/ref.js';

@customElement('stacked-bar-chart')
export class StackedBarChart extends LitElement {
    @property({ type: Object })
    datasets: any[] = [];

    @property({ type: Array })
    labels: string[] = [];

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
        if (changedProperties.has('datasets') || changedProperties.has('labels')) {
            if (this.chart) {
                this.chart.destroy();
            }
            this.chart = new Chart(<any>this.canvasRef.value, {
                type: 'bar',
                data: {
                    labels: this.labels,
                    datasets: this.datasets
                },
                options: {
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true,
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

    static styles = css`
        :host {
            display: block;
        }
    `
}