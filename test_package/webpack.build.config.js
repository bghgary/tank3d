const path = require("path");
const { DefinePlugin } = require("webpack");
const ChildProcess = require("child_process");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const package = require('./package.json');
const version = `${package.version}.${ChildProcess.execSync('git rev-list HEAD --count')}`;

module.exports = {
  entry: "./src/index.js",
  mode: "production",
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
