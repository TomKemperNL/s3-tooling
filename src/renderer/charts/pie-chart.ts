import { Chart } from "chart.js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ref, createRef } from 'lit/directives/ref.js';
import { ChartRenderedEvent } from "./events";

@customElement('pie-chart')
export class PieChart extends LitElement {
    @property({ type: Array })
    values: any = [];
    @property({ type: Array })
    labels: string[] = [];
    @property({ type: Array })
    colors: string[] = [];

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
        if (changedProperties.has('labels') || changedProperties.has('values') || changedProperties.has('colors')) {
            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(<any>this.canvasRef.value, {
                type: 'pie',
                data: {
                    labels: this.labels,
                    datasets: [{
                        label: 'Lines by author (current revision)',
                        data: this.values,
                        borderWidth: 1,
                        backgroundColor: this.colors,
                    }]
                },
                options: {
                    animation: {
                        onComplete: (c) => {
                            this.dispatchEvent(new ChartRenderedEvent())
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
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
            position: relative;
        }
    `
}