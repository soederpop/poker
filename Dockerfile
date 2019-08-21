FROM node:12 
ENV PORT 3000
EXPOSE 3000
WORKDIR /app
COPY package.json /app/package.json
RUN yarn install
COPY scripts /app/scripts
COPY server /app/server
COPY src /app/src
COPY public /app/public
COPY .babelrc /app/.babelrc
COPY .babel-preset.js /app/.babel-preset.js
COPY runtime.js /app/runtime.js
COPY webpack.config.js /app/webpack.config.js
RUN yarn build
CMD yarn start
