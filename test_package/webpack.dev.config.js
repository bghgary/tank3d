const { DefinePlugin } = require("webpack");
const ChildProcess = require("child_process");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const package = require('./package.json');
const version = `${package.version}.${ChildProcess.execSync('git rev-list HEAD --count')}`;

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  devServer: {
    open: true,
    watchFiles: ["./src/**/*", "../app_package/lib/**/*"],
  },
  output: {
    filename: "bundle.js",
  },
  plugins: [
    new DefinePlugin({
      DEV_BUILD: true,
      VERSION: JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({ title: "tank3d" }),
  ],
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      }
    ],
  },
};
