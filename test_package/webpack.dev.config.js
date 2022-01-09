const HtmlWebpackPlugin = require("html-webpack-plugin");
const { DefinePlugin } = require("webpack");

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
