require('./context_menu.scss');

class CalendarContextMenuOption {
    /**
     * @param title {String}
     * @param description {String}
     */
    constructor(title, description) {
        /**
         * @type {String}
         */
        this.title = title;
        /**
         * @type {String}
         */
        this.description = description;
    }

    /**
     * @param cb {function}
     * @returns {CalendarContextMenuOption}
     */
    onclick(cb) {
        this._on_click = cb;
        return this;
    }
}

class CalendarContextMenu extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {CalendarContextMenuOption[]}
         * @private
         */
        this._options = [];

        this._spawn_time = Date.now();


        const listener = (event) => {
            if (Date.now() - this._spawn_time < 200)
                return;
            if (!event.target.closest('calendar-context-menu')) {
                let container = document.getElementById('calendar-context-menu-container');
                if (container)
                    container.innerHTML = '';
                document.removeEventListener('contextmenu', listener)
                document.removeEventListener('pointerdown', listener)
            }
        };

        document.addEventListener('contextmenu', listener)
        document.addEventListener('pointerdown', listener)
    }

    connectedCallback() {
        this._rebuild();
    }

    /**
     * @param option {CalendarContextMenuOption}
     * @return {CalendarContextMenu}
     */
    add_option(option) {
        this._options.push(option);
        this._rebuild();
        return this;
    }

    spawn(event) {
        this._pos_x = event.clientX;
        this._pos_y = event.clientY;

        let container = document.getElementById('calendar-context-menu-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'calendar-context-menu-container';
            document.body.append(container);
        }
        container.innerHTML = '';
        container.appendChild(this);

        event.preventDefault();

        if (this.isConnected)
            this._rebuild();
    }

    _rebuild() {
        if (!this.isConnected)
            return;

        this.innerHTML = '';

        for (const option of this._options) {
            const div = document.createElement('button');
            div.innerText = option.title;
            div.onclick = (event) => {
                if (option._on_click) {
                    option._on_click(event);
                    this.remove();
                }
            }
            this.appendChild(div)
        }

        const bounds = this.getBoundingClientRect();

        this.style.left = `${Math.min(this._pos_x, window.innerWidth - bounds.width)}px`;
        this.style.top = `${this._pos_y}px`;
    }
}


export {CalendarContextMenuOption}

customElements.define("calendar-context-menu", CalendarContextMenu);