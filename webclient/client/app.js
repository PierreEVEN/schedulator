import './utilities/handlebars_helpers';
import './views/user_header/user_header'
import {GLOBAL_EVENTS} from "./utilities/event_manager";
import {APP_CONFIG} from "./utilities/app_config";
import './views/calendar_list/calendar_list';
import {EventPool} from "./calendar/event_pool";
import {fetch_api} from "./utilities/request";
import {Message, NOTIFICATION} from "./views/message_box/notification";
import {Event} from "./utilities/event";
import {EncString} from "./utilities/encstring";

require('./app.scss');
require('./calendar/calendar_app');

/**
 * @type {CalendarApp}
 */
let CURRENT_WIDGET = null;

function try_update_display_user(connected_user) {
    if (CURRENT_WIDGET)
        CURRENT_WIDGET.remove();
    CURRENT_WIDGET = null;

    if (connected_user) {
        CURRENT_WIDGET = document.createElement('calendar-list');
    } else {
    }
    if (CURRENT_WIDGET) {
        const container = document.getElementById('page-content');
        container.append(CURRENT_WIDGET);
    }
}

/**
 * @param calendar {Calendar}
 */
function try_update_display_calendar(calendar) {
    if (calendar) {

        if (CURRENT_WIDGET)
            CURRENT_WIDGET.remove();


        fetch_api('event/from-calendar/', 'POST', calendar.id.toString()).catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible d'obtenir les événements"));
            throw new Error(error);
        }).then(res => {
            const events = new EventPool();
            for (const event of res)
                events.register_event(Event.new(event));

            const container = document.getElementById('page-content');
            CURRENT_WIDGET = document.createElement('calendar-app');
            CURRENT_WIDGET.set_event_source(events);
            container.append(CURRENT_WIDGET);
        });
    } else {
        try_update_display_user(APP_CONFIG.connected_user());
    }
}

GLOBAL_EVENTS.add('on_connected_user_changed', (payload) => {
    if (!APP_CONFIG.display_calendar())
        try_update_display_user(payload.new);
});

GLOBAL_EVENTS.add('on_display_calendar_changed', (payload) => {
    try_update_display_calendar(payload.new);
});

try_update_display_calendar(APP_CONFIG.display_calendar());

document.getElementById('global-title').onclick = (event) => {
    event.preventDefault();
    APP_CONFIG.set_display_calendar(null);
}


let GLOBAL_EVENT_CREATOR = null;
async function spawn_add_event() {
    if (GLOBAL_EVENT_CREATOR)
        GLOBAL_EVENT_CREATOR.remove();
    GLOBAL_EVENT_CREATOR = null;

    if (!this._calendar)
        return;

    let left = this.mouse_x;
    let top = this.mouse_y;

    // Retrieve or create user from account
    const user = await this.get_connected_user();

    let sel_start = this.selection[0].cell_time_start;
    sel_start = sel_start.getFullYear() +
        '-' + String(sel_start.getMonth() + 1).padStart(2, '0') +
        '-' + String(sel_start.getDate()).padStart(2, '0') +
        'T' + String(sel_start.getHours()).padStart(2, '0') +
        ':' + String(sel_start.getMinutes()).padStart(2, '0');
    let sel_end = this.selection[0].cell_time_end;
    sel_end = sel_end.getFullYear() +
        '-' + String(sel_end.getMonth() + 1).padStart(2, '0') +
        '-' + String(sel_end.getDate()).padStart(2, '0') +
        'T' + String(sel_end.getHours()).padStart(2, '0') +
        ':' + String(sel_end.getMinutes()).padStart(2, '0');

    GLOBAL_EVENT_CREATOR = require('./create_event.hbs')({
        start: sel_start,
        end: sel_end
    }, {
        close: (event) => {
            event.preventDefault();
            GLOBAL_EVENT_CREATOR.remove();
            GLOBAL_EVENT_CREATOR = null;
        },
        submit: async (event) => {
            event.preventDefault();

            const body = [];
            for (const item of this.selection) {
                body.push({
                    calendar: this._calendar.id.toString(),
                    title: EncString.from_client(GLOBAL_EVENT_CREATOR.elements.name.value),
                    owner: user.id.toString(),
                    start: new Date(GLOBAL_EVENT_CREATOR.elements.start.value).getTime(),
                    end: new Date(GLOBAL_EVENT_CREATOR.elements.end.value).getTime(),
                    source: EncString.from_client("Manual placement"),
                    presence: Number(GLOBAL_EVENT_CREATOR.elements.presence.value)
                });
            }
            const res = await fetch_api('event/create/', 'POST', body).catch(error => {
                NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                throw new Error(error);
            });
            for (const event of res) {
                this._event_source.register_event(Event.new(event))
            }

            GLOBAL_EVENT_CREATOR.remove();
            GLOBAL_EVENT_CREATOR = null;

            this.selection = [];
        }
    })
    this.append(GLOBAL_EVENT_CREATOR);

    const popupWidth = GLOBAL_EVENT_CREATOR.offsetWidth;
    const popupHeight = GLOBAL_EVENT_CREATOR.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (left + popupWidth > screenWidth) {
        left = screenWidth - popupWidth;
    }
    if (top + popupHeight > screenHeight) {
        top = screenHeight - popupHeight;
    }

    GLOBAL_EVENT_CREATOR.style.left = left + 'px'
    GLOBAL_EVENT_CREATOR.style.top = top + 'px'
}