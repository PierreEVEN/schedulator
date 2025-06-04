import './checkslider.scss'

class CalendarCheckSlider extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        this.append(checkbox);
        this.append(document.createElement('div'))
    }
}

customElements.define("calendar-check-slider", CalendarCheckSlider);