const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: {
        index: './client/app.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public/dist'),
    },
    module: {
        rules: [
            {
                test: /\.(hbs)$/,
                include: path.resolve(__dirname, 'client'),
                use: path.resolve('handlebars_custom_loader.js')
            },
            {
                test: /\.(scss)$/,
                include: path.resolve(__dirname, 'client'),
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    {
                        loader: "sass-loader",
                        options: {
                            implementation: require("sass"),
                            sassOptions: {
                                silenceDeprecations: ['mixed-decls', 'color-functions', 'global-builtin', 'import', 'legacy-js-api'],
                            }
                        },
                    },
                ],
            },
            {
                test: /\.(css)$/,
                include: path.resolve(__dirname, 'node_modules', 'prismjs'),
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader"
                ],
            }
        ],
    },
};