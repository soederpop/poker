export default function channels(app) {
  app.on("connection", connection => {
    app.channel("anonymous").join(connection);
  });

  app.publish((data, hook) => {
    return app.channel("anonymous");
  });

}