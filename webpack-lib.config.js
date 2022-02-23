const { resolve } = require('path');
const webpack = require("webpack");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: [ './src/lib.tsx' ],
    output: {
        path: resolve(__dirname, '../theremin/'),
        filename: 'imageProcessingTool.js',
        library: {
            name: 'imageProcessingTool',
            type: 'var',
            export: 'default',
        },
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
        fallback: {
            fs: false,
            path: false,
            crypto: false
        },
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: require.resolve('babel-loader'),
                    },
                ],
            },
            {
                test: /\.css$/,
                // use: ['style-loader', 'css-loader'],
                use: ['to-string-loader', 'css-loader'],
            },
        ]
    },
    plugins: [
        new SpeedMeasurePlugin(),
        new ForkTsCheckerWebpackPlugin({ typescript: { configFile: 'tsconfig.json' } }),
    ],
};