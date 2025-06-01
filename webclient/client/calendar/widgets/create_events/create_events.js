require('./create_events.scss')
require('../presence_slider/presence_slider')
const {APP_CONFIG} = require("../../../utilities/app_config");

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
        const create_events = require('./create_events.hbs')({default_presence: APP_CONFIG.display_calendar().default_presence}, {
            submit: async (event) => {
                event.preventDefault();
                for (const selection of app_parent.selector().get_selections()) {
                    const sel = app_parent.selector().get(selection);

                    app_parent



                }



                await app_parent.selector().clear();
            }
        });

        const locale = navigator.language || navigator.userLanguage;
        const options = {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        };

        let open = true;

        for (const selection of app_parent.selector().get_selections()) {
            const data = app_parent.selector().get(selection);
            const start = data.start.getFullYear() +
                '-' + String(data.start.getMonth() + 1).padStart(2, '0') +
                '-' + String(data.start.getDate()).padStart(2, '0') +
                'T' + String(data.start.getHours()).padStart(2, '0') +
                ':' + String(data.start.getMinutes()).padStart(2, '0');
            const end = data.end.getFullYear() +
                '-' + String(data.end.getMonth() + 1).padStart(2, '0') +
                '-' + String(data.end.getDate()).padStart(2, '0') +
                'T' + String(data.end.getHours()).padStart(2, '0') +
                ':' + String(data.end.getMinutes()).padStart(2, '0');
            create_events.hb_elements['event_list'].append(require('./single_event.hbs')({
                title: data.start.toLocaleDateString(locale, options) + " - " +  data.end.toLocaleDateString(locale, options),
                start: start,
                end: end,
                open: open
            }, {}));
            open = false;
        }
        this.append(create_events);
    }
}

customElements.define("calendar-create-event-modal", CalendarCreateEventModal);