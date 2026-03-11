const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: dev ? "source-map" : false,
    entry: {
      taskpane: "./src/taskpane/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].bundle.js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        "@engine": path.resolve(__dirname, "src/engine"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@types": path.resolve(__dirname, "src/types"),
        "@git": path.resolve(__dirname, "src/git"),
      },
      fallback: {
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer/"),
        process: require.resolve("process/browser"),
        crypto: false,
        fs: false,
        path: false,
        os: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                ["@babel/preset-react", { runtime: "automatic" }],
                "@babel/preset-typescript",
              ],
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: "process/browser",
      }),
      new HtmlWebpackPlugin({
        template: "./src/taskpane/index.html",
        filename: "taskpane.html",
        chunks: ["taskpane"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets", to: "assets", noErrorOnMissing: true },
          { from: "manifest.xml", to: "manifest.xml" },
        ],
      }),
    ],
  };

  // 文件写入中间件：接收 POST /api/write-file，写入本地磁盘
  const fileWriteMiddleware = (middlewares, devServer) => {
    devServer.app.get("/api/read-file", (req, res) => {
      const dir = req.query.directory;
      const fileName = req.query.fileName;
      if (!dir || !fileName) {
        res.status(400).json({ error: "missing directory or fileName" });
        return;
      }
      const filePath = path.join(dir, fileName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "file not found" });
        return;
      }
      res.sendFile(filePath);
    });

    devServer.app.post("/api/write-file", (req, res) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const dir = body.directory;
          const fileName = body.fileName;
          const data = Buffer.from(body.data, "base64");

          if (!dir || !fileName) {
            res.status(400).json({ error: "missing directory or fileName" });
            return;
          }

          // 创建目录（递归）
          fs.mkdirSync(dir, { recursive: true });
          const filePath = path.join(dir, fileName);
          fs.writeFileSync(filePath, data);
          console.log(`[FileWriter] ${filePath} (${data.length} bytes)`);
          res.json({ ok: true, path: filePath });
        } catch (err) {
          console.error("[FileWriter] Error:", err.message);
          res.status(500).json({ error: err.message });
        }
      });
    });
    return middlewares;
  };

  if (dev) {
    try {
      const certs = await devCerts.getHttpsServerOptions();
      config.devServer = {
        port: 3000,
        server: {
          type: "https",
          options: {
            key: certs.key,
            cert: certs.cert,
            ca: certs.ca,
          },
        },
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        allowedHosts: "all",
        setupMiddlewares: fileWriteMiddleware,
      };
    } catch {
      config.devServer = {
        port: 3000,
        server: "https",
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        allowedHosts: "all",
        setupMiddlewares: fileWriteMiddleware,
      };
    }
  }

  return config;
};
