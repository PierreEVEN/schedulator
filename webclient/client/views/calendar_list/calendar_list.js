require('./calendar_list.scss')
const {fetch_api} = require("../../utilities/request");
const {EncString} = require("../../utilities/encstring");
const {NOTIFICATION, Message} = require("../message_box/notification");
const {MODAL} = require("../../utilities/modal/modal");

function time_to_ms(time_str) {
    const [hours, minutes] = time_str.split(':');
    return (parseInt(hours) * 60 + parseInt(minutes)) * 60000;
}

class CalendarList extends HTMLElement {
    constructor() {
        super();

    }

    async connectedCallback() {
        const res = await fetch_api('planning/my_plannings/', 'GET').catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible de récuperer mes agendas"));
        });
        const widgets = require('./calendar_list.hbs')({widget:res}, {
            create: () => {
                const create_div = require('./new_calendar.hbs')({}, {
                    create: async (event) => {
                        event.preventDefault();

                        console.log(time_to_ms(create_div.elements.time_precision.value))

                        const data = {
                            title: EncString.from_client(create_div.elements.title.value),
                            start: new Date(create_div.elements.start.value).getTime(),
                            end: new Date(create_div.elements.end.value).getTime(),
                            time_precision: time_to_ms(create_div.elements.time_precision.value),
                            start_daily_hour: time_to_ms(create_div.elements.start_daily_hour.value),
                            end_daily_hour: time_to_ms(create_div.elements.end_daily_hour.value)
                        };
                        console.log(data);

                        await fetch_api('planning/create/', 'POST',data ).catch(error => {
                            NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                        }).then(() => {
                            //MODAL.close();
                        });
                    }
                })
                const today = new Date();
                create_div.elements.start.value = today.toISOString().split('T')[0];
                today.setMonth(today.getMonth() + 1);
                create_div.elements.end.value = today.toISOString().split('T')[0];

                MODAL.open(create_div)

            }
        });
        for (const widget of widgets)
            this.append(widget);
    }
}
customElements.define("calendar-list", CalendarList);