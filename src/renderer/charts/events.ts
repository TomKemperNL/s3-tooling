export class ChartRenderedEvent extends Event {
    static eventType = 'chart-rendered';
    constructor() {
        super(ChartRenderedEvent.eventType, {
            bubbles: true,
            composed: true
        });
    }
}