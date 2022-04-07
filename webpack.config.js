const { resolve } = require('path');
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

function makeConfig(name) {
    return {
        name,
        mode: isDevelopment ? 'development' : 'production',

        ...(name === 'app' ? {
            entry: ['./src/index.tsx'],
            output: {
                filename: 'js/app.js',
                path: resolve(__dirname, 'public'),
            },
        } : {}),

        ...(name === 'lib' ? {
            entry: ['./src/lib.tsx'],
            output: {
                filename: 'build/liveCompose.js',
                path: __dirname,
                library: {
                    type: 'module',
                },
            },
            experiments: {
                outputModule: true
            },
            // externalsType: 'module',
            // externals: {
            //     react: 'react',
            //     "react-dom": "react-dom",
            // }
        } : {}),

        infrastructureLogging: {
            level: 'none',
        },
        devtool: isDevelopment ? 'eval-cheap-module-source-map' : false,
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".json"],
            alias: {  // BS for datavoyager
                'font-awesome-sass-loader$': false,
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
                                plugins: [isDevelopment && require.resolve('react-refresh/babel')].filter(Boolean),
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
    }
}


module.exports = [ makeConfig('app'), makeConfig('lib') ];
