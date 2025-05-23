import './utilities/handlebars_helpers';
import './views/user_header/user_header'
import {GLOBAL_EVENTS} from "./utilities/event_manager";
import {APP_CONFIG} from "./utilities/app_config";
import './views/calendar_list/calendar_list';

require('./app.scss');
require('./calendar/calendar_app');


let CURRENT_WIDGET = null;

function try_update_display_user(connected_user) {
    if (CURRENT_WIDGET)
        CURRENT_WIDGET.remove();
    CURRENT_WIDGET = document.createElement('calendar-list');

    if (connected_user) {

    } else {

    }
    const container = document.getElementById('page-content');
    container.append(CURRENT_WIDGET);
}


function try_update_display_planning(planning) {
    if (planning) {

        if (CURRENT_WIDGET)
            CURRENT_WIDGET.remove();

        CURRENT_WIDGET = document.createElement('calendar-app');
        CURRENT_WIDGET.set_planning(planning);
        const container = document.getElementById('page-content');
        container.append(CURRENT_WIDGET);
    } else {
        try_update_display_user(APP_CONFIG.connected_user());
    }
}

GLOBAL_EVENTS.add('on_connected_user_changed', (payload) => {
    if (!APP_CONFIG.display_planning())
        try_update_display_user(payload.new);
});

GLOBAL_EVENTS.add('on_display_planning_changed', (payload) => {
    try_update_display_planning(payload.new);
});

try_update_display_planning(APP_CONFIG.display_planning());

document.getElementById('global-title').onclick = (event) => {
    console.log('ah')
    event.preventDefault();
    APP_CONFIG.set_display_planning(null);
}