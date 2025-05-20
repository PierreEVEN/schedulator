const hbs = require("handlebars");
const fs = require("fs");
const {parse} = require("path");

function loader_function(source) {
    const opts = {}

    const ast = hbs.parse(source, opts);
    const template = hbs.precompile(ast);
    let data_text = fs.readFileSync("./handlebars_loader_function.js").toString()
        .replaceAll("'{{template}}'", template.toString())
    const slug = template ? data_text : `module.exports = function() { return null; };`;

    this.async()(null, slug);
}

module.exports = loader_function;