require('./presence_slider.scss')

class CalenderPresenceSlider extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.value = -10;
        if (this.hasAttribute('value'))
            this.value = Number(this.getAttribute('value'));
    }

    connectedCallback() {
        const elements = require('./presence_slider.hbs')({value: this.value}, {
            onchange: (event) => {
                this.value = event.target.value;
            }
        });
        for (const element of elements)
            this.append(element);
    }
}

customElements.define("calendar-presence-slider", CalenderPresenceSlider);
