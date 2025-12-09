const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/** @param {boolean} isProduction */
function getOptimization(isProduction) {
  if (!isProduction) return {};

  return {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: { comments: false },
          compress: {
            drop_console: true,
            dead_code: true,
            unused: true
          }
        },
        extractComments: false
      })
    ],
    usedExports: true,
    sideEffects: true
  };
}

/** @type {(env: any, argv: { mode: string }) => import('webpack').Configuration[]} */
module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';

  /** @type {import('webpack').Configuration} */
  const extensionConfig = {
    target: 'node',
    mode: argv.mode || 'none',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      clean: isProduction
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.json'
              }
            }
          ]
        }
      ]
    },
    optimization: getOptimization(isProduction),
    devtool: isProduction ? false : 'nosources-source-map',
    infrastructureLogging: {
      level: 'log'
    }
  };

  /** @type {import('webpack').Configuration} */
  const webviewConfig = {
    target: 'web',
    mode: argv.mode || 'none',
    entry: './src/webview/index.ts',
    output: {
      path: path.resolve(__dirname, 'out/webview'),
      filename: 'webview.js',
      clean: isProduction
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.webview.json'
              }
            }
          ]
        }
      ]
    },
    optimization: {
      ...getOptimization(isProduction),
      splitChunks: false
    },
    devtool: isProduction ? false : 'source-map'
  };

  return [extensionConfig, webviewConfig];
};
