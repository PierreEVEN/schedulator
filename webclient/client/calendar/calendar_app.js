
require('./calendar_app.scss');

class CalendarApp extends HTMLElement {
    constructor() {
        super();

        this.mode = 'weed;'

        this.daily_start = 60 * 60 * 1000 * 6; // 6h
        this.daily_end = 60 * 60 * 1000 * 20; // 20h
        this.end = Date.now();
        this.start = new Date().setMonth(new Date(this.end).getMonth() - 3);
        this.spacing = 30 * 60 * 1000; // 30 minutes

        this.classList.add('calendar-app');

        if (this.hasAttribute('daily-start')) {
            this.daily_start = this.getAttribute('daily-start')
        }
        if (this.hasAttribute('daily-end')) {
            this.daily_end = this.getAttribute('daily-end')
        }
        if (this.hasAttribute('start')) {
            this.start = this.getAttribute('start')
        }
        if (this.hasAttribute('end')) {
            this.end = this.getAttribute('end')
        }
        if (this.hasAttribute('spacing')) {
            this.spacing = this.getAttribute('spacing')
        }
        let calendar = require('./calendar_app.hbs')();
        this.append(calendar)
    }
}

customElements.define("calendar-app", CalendarApp);


export {CalendarApp}