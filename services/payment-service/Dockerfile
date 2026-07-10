FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 5106

CMD ["node", "dist/services/payment-service/src/server.js"]
