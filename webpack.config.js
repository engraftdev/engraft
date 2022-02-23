const { resolve } = require('path');
const webpack = require("webpack");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    entry: [ './src/index.tsx' ],
    output: {
        filename: 'js/app.js',
        path: resolve(__dirname, 'public'),
    },
    infrastructureLogging: {
        level: 'none',
    },
    devtool: 'cheap-module-source-map',
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
        fallback: {
            fs: false,
            path: false,
            crypto: false
        },
    },
    devServer: {
        port: '3000',
        hot: true,
        static: './public',
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
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
                        options: {
                            plugins: [require.resolve('react-refresh/babel')],
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ['to-string-loader', 'css-loader'],
            },
        ]
    },
    plugins: [
        new SpeedMeasurePlugin(),
        new ForkTsCheckerWebpackPlugin({ typescript: { configFile: 'tsconfig.json' } }),
        isDevelopment && new ReactRefreshWebpackPlugin({
            overlay: false
        }),
    ].filter(Boolean),
};