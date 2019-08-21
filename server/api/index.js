import { Server } from "@skypager/helpers-server";
import bodyParser from "body-parser";
import feathers from '@feathersjs/feathers' 
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'


export default class AppServer extends Server {
  createServer(options = {}, context = {}) {
    const app = super.createServer({ ...this.options, ...options, createServer: () =>  express(feathers())}, { ...this.context, ...context })
    app.configure(socketio())
    return app
  }

  /**
   * Right now we hard-code which endpoints the AppServer mounts,
   * however we could make this more dynamic to turn endpoints on or off
   * depending on what options are passed, what process.env variables are, etc.
   */
  static endpoints(options = {}, { runtime } = {}) {
    return runtime.fsx
      .readdirSync(runtime.resolve(__dirname, "endpoints"))
      .map(endpoint => endpoint.replace(/\.js$/, ""));
  }

  /**
   * We disable the default history configuration setup done by @skypager/helpers-server,
   * since we will be using the authenticated pages endpoints to serve our HTML conditionally
   * based on the user's cookies.
   */
  get history() {
    return !this.options.hot
  }

  /**
   * Enable CORS support
   */
  get cors() {
    return true;
  }

  /**
   * Serve any css, js, images, or fonts as static files
   */
  get serveStatic() {
    return this.runtime.resolve('lib')
  }

  appWillMount(app, options = this.options) {
    app.use(bodyParser.json());
  }

  /**
   * @private
   * @see @skypager/helpers-server for information about Server class lifecycle hooks
  
   * This is a lifecycle hook called by the @skypager/helpers-server Server class,
   * it gets called after the endpoint routes have been loaded, and before the
   * history api and static file middlewares are added.
   */
  async appDidMount(app) {
    await this.runtime.fileDb.load()

    if (this.runtime.isDevelopment) {
      setupDevelopment.call(this, app)
    }
    return app
  }
}

function setupDevelopment(app, options = {}) {
  const { runtime } = this
  const webpack = require("webpack");
  const devMiddleware = require("webpack-dev-middleware");
  const hotMiddleware = require("webpack-hot-middleware");
  const config = require("@skypager/webpack/config/webpack.config")(
    "development"
  );

  Object.assign(config, {
    entry: {
      app: [runtime.resolve("src", "launch.js")],
    },
    node: {
      process: "mock"
    },
    externals: [
      {
        react: "global React",
        "react-dom": "global ReactDOM",
        "react-router-dom": "global ReactRouterDOM",
        "semantic-ui-react": "global semanticUIReact",
        "prop-types": "global PropTypes",
        "@skypager/web": "global skypager"
      }
    ]
  }) 

  this.setupDevelopmentMiddlewares({
    ...options,
    webpack,
    config,
    devMiddleware,
    hotMiddleware,
    hot: !!(options.hot || this.options.hot)
  });

  return app;
}

function _setupDevelopment(app) {
  const { runtime } = this;
  const { hot } = this.options;
  const webpack = require("webpack");
  const merge = require("webpack-merge");
  const devMiddleware = require("webpack-dev-middleware");
  const hotMiddleware = require("webpack-hot-middleware");
  const config = merge(
    require("@skypager/webpack/config/webpack.config")("development"),
    {
      node: {
        process: "mock"
      },
      externals: [
        {
          react: "global React",
          "react-dom": "global ReactDOM",
          "react-router-dom": "global ReactRouterDOM",
          "semantic-ui-react": "global semanticUIReact",
          "prop-types": "global PropTypes",
          "@skypager/web": "global skypager"
        }
      ]
    }
  );

  config.entry[1] =
    "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000";

  const compiler = webpack(config);
  const middleware = devMiddleware(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath
  });

  app.use(middleware);

  if (hot !== false) {
    app.use(
      hotMiddleware(compiler, {
        path: "/__webpack_hmr"
      })
    );
  }

  app.get("/*", (req, res) => {
    middleware.fileSystem.readFile(
      runtime.pathUtils.resolve(compiler.outputPath, "index.html"),
      (err, file) => {
        if (err) {
          res.sendStatus(404);
        } else {
          res.send(file.toString());
        }
      }
    );
  });

  return app;
}