require('./create_events.scss')
require('../presence_slider/presence_slider')
const {APP_CONFIG} = require("../../../utilities/app_config");
const {EncString} = require("../../../utilities/encstring");
const {date_to_local_time} = require("../../../utilities/time_utils");
const {fetch_api} = require("../../../utilities/request");
const {NOTIFICATION, Message} = require("../../../views/message_box/notification");
const {Event} = require("../../../utilities/event");

class CalendarCreateEventModal extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {Map<number, String>}
         */
        this.title_override = new Map();
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
                const body = [];
                for (const selection of app_parent.selector().get_selections()) {
                    const sel = app_parent.selector().get(selection);
                    body.push({
                        calendar: APP_CONFIG.display_calendar().id.toString(),
                        title: EncString.from_client(this.title_override.get(selection) || ""),
                        owner: (await app_parent.get_connected_user()).id.toString(),
                        start: sel.start.getTime(),
                        end: sel.end.getTime(),
                        source: EncString.from_client("Manual_Placement"),
                        presence: Number(create_events.hb_elements.presence.value)
                    });
                }

                const res = await fetch_api('event/create', 'POST', body).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de créer les évenements"));
                    throw new Error(error);
                });
                for (const event of res) {
                    app_parent.event_source().register_event(Event.new(event))
                }

                await app_parent.selector().clear();
                app_parent.close_modal();
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
            const widget = require('./single_event.hbs')({
                title: data.start.toLocaleDateString(locale, options) + " - " + data.end.toLocaleDateString(locale, options),
                start: data.start,
                end: data.end,
                open: open
            }, {
                set_title: (event) => {
                    this.title_override.set(selection, event.target.value);
                },
                set_start: async (event) => {
                    await app_parent.selector().update_selection_start(selection, new Date(event.target.value));
                    widget.hb_elements.end.value = data.end;
                },
                set_end: async (event) => {
                    await app_parent.selector().update_selection_end(selection, new Date(event.target.value));
                    widget.hb_elements.start.value = data.start;
                }
            });
            create_events.hb_elements['event_list'].append(widget);
            open = false;
        }
        this.append(create_events);
    }
}

customElements.define("calendar-create-event-modal", CalendarCreateEventModal);