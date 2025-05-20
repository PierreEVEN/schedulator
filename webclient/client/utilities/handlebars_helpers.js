import Handlebars from "handlebars";

/* ################## HELPER {CTX} ################## */
Handlebars.registerHelper("ctx", function (options) {
    if (!this['__handlebar_ctx_id'])
        return console.error('This template was not instanced with a context');
    return new Handlebars.SafeString("console.assert(document.__handlebar_custom_loader.__registered_ctx[" + this['__handlebar_ctx_id'] + "], 'no context provided for : " + options + " on object :', this, '\\n Available contexts :', document.__handlebar_custom_loader.__registered_ctx); document.__handlebar_custom_loader.__registered_ctx[" + this['__handlebar_ctx_id'] + "]." + options);
});

/* ################## HELPER {OBJECT} ################## */
Handlebars.registerHelper("object", function (options) {
    if (!this['__registered_objects_container_id'])
       return console.error('This template was not instanced with an object container id');

    let name = '__object_id_' + this.__registered_objects_container_id + "_" + options + "__";
    document.__handlebar_custom_loader.__registered_objects_container[this.__registered_objects_container_id].set(options, name);
    return new Handlebars.SafeString('__custom-id="' + name + '"');
});

/* ################## HELPER {MARKDOWN} ################## */
Handlebars.registerHelper("markdown", function (options) {
    const converter = new (require('showdown')).Converter();
    return new Handlebars.SafeString(converter.makeHtml(options.toString()));
});
