const path = require("path");
const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
    }),
    new HtmlWebpackPlugin({ title: "tank3d" }),
  ],
};
