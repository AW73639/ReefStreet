FROM node:20-alpine
WORKDIR /app
COPY package.json server.js index.html ./
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/data TRUST_PROXY=1
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
