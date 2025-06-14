import {APP_CONFIG} from "../app_config";
import {Message, NOTIFICATION} from "../../views/message_box/notification";

const dayjs = require('dayjs')
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

require('./ask_for_cookies.scss')

class CookieString {
    constructor(data) {
        this._cookies = new Map();
        if (!data)
            return;

        const ca = data.split(';');
        for (const c of ca) {
            const s = c.split("=");
            if (s.length === 1)
                continue;
            if (s[1].length === 0)
                continue;
            this.set(s[0][0] === " " ? s[0].substring(1) : s[0], s[1]);
        }
    }

    set(key, value, exp = null) {
        if ((!value === null) && this._cookies[key])
            delete this._cookies.delete(key);
        this._cookies.set(key, {value: value, exp: exp});
    }

    read(key) {
        const cookie = this._cookies.get(key);
        return cookie ? cookie.value : null;
    }

    save() {
        if (document.cookie.length !== 0)
            for (const cookie of document.cookie.split(";"))
                document.cookie = `${cookie}; SameSite=Strict; expires=${new Date(0).toUTCString()}; path=/`;

        for (const [key, value] of this._cookies.entries()) {
            if (value.exp)
                document.cookie = `${key}=${value.value}; SameSite=Strict; expire=${dayjs.unix(value.exp).toDate().toUTCString()}; Max-Age=${value.exp - dayjs().unix()}; path=/`
            else
                document.cookie = `${key}=${value.value}; SameSite=Strict; Max-Age=${86400 * 365 * 10}; path=/`
        }
    }
}

class AppCookies {
    constructor() {
        const cookies = new CookieString(document.cookie);
        this._authtoken = cookies.read("authtoken");
        if (this._authtoken)
            this._authtoken_exp = cookies.read("authtoken-exp");

        this._allow_cookies = Boolean(cookies.read("allow-cookies"));

        if (!this._allow_cookies) {
            const cookies_div = require("./ask_for_cookies.hbs")({}, {
                enable: () => {
                    this._allow_cookies = true;
                    this.save_cookies();
                    cookies_div.remove();
                },
                skip: () => {
                    this._allow_cookies = false;
                    this.save_cookies();
                    cookies_div.remove();
                }
            });
            document.body.append(cookies_div);
        }

        this.save_cookies();
    }

    get_token() {
        return this._authtoken;
    }

    authentication_headers(header) {
        if (!header)
            header = {};
        header['content-authtoken'] = this._authtoken;
        return header;
    }

    /**
     * @param authentication_token {Object}
     */
    login(authentication_token) {
        if (authentication_token && authentication_token.token) {
            this._authtoken = authentication_token.token;
            this._authtoken_exp = authentication_token.expiration_date;
            this.save_cookies();
        } else {
            NOTIFICATION.error(new Message("Invalid authentication token"))
        }
    }

    logout() {
        delete this._authtoken;
        delete this._authtoken_exp;
        this.save_cookies();
        APP_CONFIG.set_connected_user(null);
    }

    save_cookies() {
        const cookies = new CookieString();

        // Don't save if not allowed on current browser
        if (this._allow_cookies)
            cookies.set("allow-cookies", this._allow_cookies);
        else
            return cookies.save();

        if (this._authtoken)
            if (this._authtoken_exp)
                cookies.set("authtoken", this._authtoken, this._authtoken_exp)
            else
                cookies.set("authtoken", this._authtoken, dayjs().unix() + 1000 * 60 * 60 * 24 * 30)
        if (this._authtoken_exp)
            cookies.set("authtoken-exp", this._authtoken_exp);

        cookies.save();
    }
}

const APP_COOKIES = new AppCookies();

export {APP_COOKIES}