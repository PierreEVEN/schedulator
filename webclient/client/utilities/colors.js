
function valueToColor(value, min = -10, max = 10) {
    const clamped = Math.max(min, Math.min(max, value));
    const percent = (clamped - min) / (max - min);
    const hue = percent * 120;
    return `hsl(${hue}, 50%, 70%)`;
}

function numberToColorHSL(n, total = 10) {
    const hue = ((n + 97.58) * (398787.4713 / total)) % 360;
    return `hsl(${hue}, 60%, 40%)`;
}

export {valueToColor, numberToColorHSL}