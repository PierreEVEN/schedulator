require('./clock.scss')

class CalendarClock extends HTMLElement {
    constructor() {
        super();
        if (this.start === undefined)
            this.start = this.hasAttribute('start') ? Number(this.getAttribute('start')) : 0;
        if (this.spacing === undefined)
            this.spacing = this.hasAttribute('spacing') ? Number(this.getAttribute('spacing')) : 1;
        if (this.max === undefined)
            this.max = this.hasAttribute('max') ? Number(this.getAttribute('max')) : 12;
        this.radius = 40;
        if (this.has_inner === undefined)
            this.has_inner = this.hasAttribute('has_inner');
        this.inner_start = this.hasAttribute('inner_start') ? Number(this.getAttribute('inner_start')) : 12;
        if (this.inner_spacing === undefined)
            this.inner_spacing = this.hasAttribute('inner_spacing') ? Number(this.getAttribute('inner_spacing')) : 1;
        if (this.inner_max === undefined)
            this.inner_max = this.hasAttribute('inner_max') ? Number(this.getAttribute('inner_max')) : 24;
        this.inner_radius = 27.5;
        this._inner_mode = false;
        document.addEventListener('pointermove', (event) => {
            if (this._drag) {
                this._on_pointer_move(event.clientX, event.clientY);
            }
        });
        this.onpointerdown = (event) => {
            this._drag = true;
            if (this._needle) {
                this._link.style.transitionDuration = '0s';
                this._needle.style.transitionDuration = '0s';
                this._indicator.style.transitionDuration = '0';
            }
            this._on_pointer_move(event.clientX, event.clientY);
        }
        document.addEventListener('pointerup', () => {
            this._drag = false;
            if (this._needle) {
                this._link.style.transitionDuration = '0.2s';
                this._needle.style.transitionDuration = '0.2s';
                this._indicator.style.transitionDuration = '0.2s';
                this._display_value = this.value;
                this._update_needle();
            }
        });

    }

    connectedCallback() {
        if (this.value === undefined)
            this._set_value(0, true);
        this.rebuild_clock();
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._set_value(value, true)
    }

    _set_value(value, force = false) {
        this._value = value;
        if (force)
            this._display_value = value;

        if (this._last_highlight)
            this._last_highlight.style.color = 'white';
        this._last_highlight = null;

        if (this._inner_mode && this._inner_value_divs.has(value)) {
            this._last_highlight = this._inner_value_divs.get(value);
        } else if (!this._inner_mode && this._value_divs.has(value)) {
            this._last_highlight = this._value_divs.get(value);
        }

        if (this._last_highlight)
            this._last_highlight.style.color = 'black';
        this._update_needle();
        if (this.onchange)
            this.onchange({target: this})
    }

    _on_pointer_move(x, y) {
        const bounds = this.getBoundingClientRect();
        const center_x = (bounds.right + bounds.left) / 2;
        const center_y = (bounds.bottom + bounds.top) / 2;
        const dx = Math.abs(x - center_x);
        const dy = Math.abs(y - center_y);
        this._inner_mode = this.has_inner && Math.sqrt(dx * dx + dy * dy) < bounds.width * (this.radius + this.inner_radius) / 200;

        const angle = Math.atan2(-x + center_x, y - center_y) + Math.PI;
        if (this._inner_mode) {
            const unscaled_value = angle / Math.PI * 0.5 * (this.inner_max - this.inner_start);
            this._display_value = unscaled_value % (this.inner_max - this.inner_start) + this.inner_start;
            this._set_value(Math.round(unscaled_value) % (this.inner_max - this.inner_start) + this.inner_start);
        } else {
            const unscaled_value = angle / Math.PI * 0.5 * (this.max - this.start);
            this._display_value = unscaled_value % (this.max - this.start) + this.start;
            this._set_value(Math.round(unscaled_value) % (this.max - this.start) + this.start);
        }
    }

    _update_needle() {
        if (this._needle) {
            if (this._inner_mode) {
                this._needle.style.rotate = `${(this._display_value - this.inner_start) / (this.inner_max - this.inner_start) * Math.PI * 2}rad`;
                this._link.style.top = `${50 - this.inner_radius}%`;
                this._indicator.style.top = `${50 - this.inner_radius}%`;
            } else {
                this._needle.style.rotate = `${(this._display_value - this.start) / (this.max - this.start) * Math.PI * 2}rad`;
                this._link.style.top = `${50 - this.radius}%`;
                this._indicator.style.top = `${50 - this.radius}%`;
            }
        }
    }

    rebuild_clock() {
        if (!this.isConnected)
            return;
        this.innerHTML = '';
        this._needle = document.createElement('div');
        this._needle.classList.add('calendar-clock-needle');
        this._indicator = document.createElement('div');
        this._indicator.classList.add('calendar-clock-indicator');
        this._link = document.createElement('div');
        this._link.classList.add('calendar-clock-link');
        this._link.style.bottom = '50%';
        const center = document.createElement('div');
        center.classList.add('calendar-clock-center');
        this._needle.append(this._indicator);
        this._needle.append(this._link);
        this._needle.append(center);
        this.append(this._needle);

        this._value_divs = new Map();
        this._inner_value_divs = new Map();

        for (let i = this.start; i < this.max; i += this.spacing) {
            const angle = (i - this.start) / (this.max - this.start) * Math.PI * 2;
            let val = document.createElement('p');
            val.style.left = `${Math.sin(angle) * this.radius + 50}%`
            val.style.top = `${-Math.cos(angle) * this.radius + 50}%`
            val.innerText = i;
            this._value_divs.set(i, val);
            this.append(val);
        }

        if (this.has_inner)
            for (let i = this.inner_start; i < this.inner_max; i += this.inner_spacing) {
                const angle = (i - this.inner_start) / (this.inner_max - this.inner_start) * Math.PI * 2;
                let val = document.createElement('p');
                val.style.left = `${Math.sin(angle) * this.inner_radius + 50}%`
                val.style.top = `${-Math.cos(angle) * this.inner_radius + 50}%`
                val.innerText = i;
                this._inner_value_divs.set(i, val);
                this.append(val);
            }

        this._update_needle();
    }
}

customElements.define("calendar-clock", CalendarClock);