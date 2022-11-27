const { resolve } = require('path');
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const isDevelopment = process.env.NODE_ENV !== 'production';
const disableMinification = true;

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
                    type: 'commonjs2',
                },
            },
        } : {}),

        ...(name === 'lib2' ? {
            entry: ['./src/lib.tsx'],
            output: {
                filename: 'build/liveCompose2.js',
                path: __dirname,
                library: {
                    type: 'commonjs2',
                },
            },
            externals: [nodeExternals()],
            // externalsType: 'module',
        } : {}),

        infrastructureLogging: {
            level: 'none',
        },
        devtool: isDevelopment ? 'eval-cheap-module-source-map' : false,
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            alias: {
                src: resolve(__dirname, 'src'),  // 'absolute' paths
            },
        },
        devServer: {
            port: 'auto',
            hot: true,
            static: './public',
            client: {
                overlay: {
                    errors: true,
                    warnings: false,
                },
            },
            onListening: function (devServer) {
                const port = devServer.server.address().port;
                console.log('Listening on port:', port, `- http://localhost:${port}/`);
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
        optimization: {
            minimize: !disableMinification,
        },
    }
}


module.exports = [ makeConfig('app'), makeConfig('lib'), makeConfig('lib2') ];
