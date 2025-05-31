class CalendarCreateEventModal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add('calendar-modal');
        /**
         * @type {CalendarApp}
         */
        const app_parent = this.closest('calendar-app');
        console.assert(app_parent, "This widget doesn't belong to a calendar-app")
        const create_events = require('./create_events.hbs')({}, {});

        console.log(create_events.elements)
        for (const selection of app_parent.selector().get_selections()) {
            create_events.elements.event_list.append(require('./single_event.hbs')({}, {}));
        }


        this.append();

    }
}

customElements.define("calendar-create-event-modal", CalendarCreateEventModal);