const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  output: {
    path: path.resolve(__dirname, "../docs"),
    filename: "bundle.js"
  },
  plugins: [
    new HtmlWebpackPlugin({ title: "tank3d.io" }),
  ],
};
