
class CalendarCreateEventModal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add('calendar-modal');
        this.append(require('./create_events.hbs')({}, {}));
    }
}

customElements.define("calendar-create-event-modal", CalendarCreateEventModal);