const path = require("path");
const { DefinePlugin } = require("webpack");
const ChildProcess = require("child_process");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const package = require('../package.json');
const version = `${package.version}.${ChildProcess.execSync('git rev-list HEAD --count')}`.trim();
console.log(`Building v${version}`);

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, "../docs"),
    filename: "bundle.js",
  },
  plugins: [
    new DefinePlugin({
      DEV_BUILD: false,
      VERSION: JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({ title: "tank3d" }),
  ],
};
