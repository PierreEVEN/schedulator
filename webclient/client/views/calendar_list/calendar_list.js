require('./calendar_list.scss')
const {fetch_api} = require("../../utilities/request");
const {EncString} = require("../../utilities/encstring");
const {NOTIFICATION, Message} = require("../message_box/notification");
const {MODAL} = require("../../utilities/modal/modal");
const {APP_CONFIG} = require("../../utilities/app_config");
const {Calendar} = require("../../utilities/calendar");

function time_to_ms(time_str) {
    const [hours, minutes] = time_str.split(':');
    return (parseInt(hours) * 60 + parseInt(minutes)) * 60000;
}

class CalendarList extends HTMLElement {
    constructor() {
        super();

    }

    async connectedCallback() {
        const res = await fetch_api('calendar/my_calendars/', 'GET').catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible de récuperer mes calendriers"));
            throw new Error(error);
        });
        const widget = require('./calendar_list.hbs')({}, {
            create: () => {
                const create_div = require('./new_calendar.hbs')({}, {
                    create: async (event) => {
                        event.preventDefault();
                        const data = {
                            title: EncString.from_client(create_div.hb_elements.title.value),
                            start: new Date(create_div.hb_elements.start.value).getTime(),
                            end: new Date(create_div.hb_elements.end.value).getTime(),
                            time_precision: time_to_ms(create_div.hb_elements.time_precision.value),
                            start_daily_hour: time_to_ms(create_div.hb_elements.start_daily_hour.value),
                            end_daily_hour: time_to_ms(create_div.hb_elements.end_daily_hour.value),
                            require_account: create_div.hb_elements.require_account.checked,
                            default_presence: Number(create_div.hb_elements.default_presence.value)
                        };
                        const res = await fetch_api('calendar/create/', 'POST', data).catch(error => {
                            NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                            throw new Error(error);
                        });
                        MODAL.close();
                        this._add_item(Calendar.new(res));
                    }
                })
                const today = new Date();
                create_div.hb_elements.start.value = today.toISOString().split('T')[0];
                today.setMonth(today.getMonth() + 1);
                create_div.hb_elements.end.value = today.toISOString().split('T')[0];

                MODAL.open(create_div)
            }
        });

        this._list_container = widget;
        for (const item of res)
            this._add_item(Calendar.new(item));
        this.append(widget);
    }

    _add_item(calendar) {

        const row = require('./calendar_list_item.hbs')({title: calendar.title.plain()}, {
            open: async () => {
                APP_CONFIG.set_display_calendar(await Calendar.get(calendar.key))
            },
            delete: async () => {
                await fetch_api('calendar/delete/', 'POST', {calendar_key: calendar.key.encoded()}).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de supprimer le calendrier"));
                    throw new Error(error);
                });
                row.remove()
            }
        })

        this._list_container.hb_elements.calendar_list.append(row)
    }
}

customElements.define("calendar-list", CalendarList);