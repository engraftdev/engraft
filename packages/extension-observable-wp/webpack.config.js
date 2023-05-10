const path = require('path');
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: {
        content_script: './src/content_script.js',
        injected_script: './src/injected_script.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "public" },
            ],
        })
    ]
};