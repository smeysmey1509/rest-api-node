FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 5103

CMD ["node", "dist/services/catalog-service/src/server.js"]
