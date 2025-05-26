import Ical from "ical.js";
import {EncString} from "../encstring";
import {Event} from "../event";

/**
 * @param file {File}
 * @param end_date {Date}
 * @returns {Promise<Event[]>}
 */
async function import_ics(file, end_date) {
    const raw_data = await new Promise((resolve, reject) => {
        if (!file)
            return reject("File not found")

        const reader = new FileReader();
        reader.onload = function (e) {
            const fileContent = e.target.result;
            resolve({data: fileContent, filename: file.name});
        };
        reader.onerror = function (e) {
            reject("Error reading ics file : " + e);
        };
        reader.readAsText(file);
    });
    const res = Ical.parse(raw_data.data);

    const events = [];

    for (const event of res[2]) {
        const kind = event[0];
        if (kind === 'vevent') {
            /**
             * @type {Date}
             */
            let start = null;
            let end = null;
            let title = null;
            let recur = null;
            let exclude_dates = new Set();
            for (const prop of event[1]) {
                if (prop[0] === 'dtstart' && (prop[2] === "date-time" || prop[2] === 'date'))
                    start = new Date(prop[3])
                else if (prop[0] === 'dtend' && prop[2] === "date-time" || prop[2] === 'date')
                    end = new Date(prop[3])
                else if (prop[0] === 'summary' && prop[2] === "text")
                    title = EncString.from_client(prop[3])
                else if (prop[0] === 'rrule') {
                    if (prop[2] === 'recur') {
                        recur = prop[3];
                    } else
                        console.warn('Unhandled rrule type : ', event);
                } else if (prop[0] === 'exdate') {
                    if (prop[2] === 'date-time') {
                        exclude_dates.add(new Date(prop[3]).getTime());
                    } else
                        console.warn('Unhandled exdate value type : ', event);
                }
            }

            if (!start)
                console.warn('Invalid start : ', event)
            if (!end)
                console.warn('Invalid end : ', event)
            if (!title)
                console.warn('Invalid title : ', event)
            if (!start || !end || !title)
                continue;


            const register_event_helper = (date, duration) => {
                events.push({
                    title: title,
                    start: date,
                    end: date + duration,
                    source: `import@${raw_data.filename}`
                });
            }

            const duration = end.getTime() - start.getTime();
            if (!recur) {
                register_event_helper(start.getTime(), duration)
            } else {
                const interval = recur.interval || 1;
                const until = recur.until ? new Date(recur.until) : end_date;
                let count = recur.count || Number.MAX_SAFE_INTEGER;

                if (recur.freq === 'WEEKLY') {
                    do {
                        start.setDate(start.getDate() + 7 * interval);
                        if (!exclude_dates.has(start.getTime()))
                            register_event_helper(start.getTime(), duration);
                    } while (start < until && --count > 0)
                } else if (recur.freq === 'MONTHLY') {
                    do {
                        start.setMonth(start.getMonth() + interval);
                        if (!exclude_dates.has(start.getTime()))
                            register_event_helper(start.getTime(), duration);
                    } while (start < until && --count > 0)
                } else if (recur.freq === 'YEARLY') {
                    do {
                        start.setUTCFullYear(start.getUTCFullYear() + interval);
                        if (!exclude_dates.has(start.getTime()))
                            register_event_helper(start.getTime(), duration);
                    } while (start < until && --count > 0)
                } else if (recur.freq === 'DAILY') {
                    do {
                        start.setUTCFullYear(start.getUTCFullYear() + interval);
                        if (!exclude_dates.has(start.getTime()))
                            register_event_helper(start.getTime(), duration);
                    } while (start < until && --count > 0)
                } else {
                    console.warn(`Unhandled recurrence frequency : ${recur}`);
                    if (!exclude_dates.has(start.getTime()))
                        register_event_helper(start.getTime(), duration);
                }
            }
        }
    }
    return events;
}

export {import_ics}