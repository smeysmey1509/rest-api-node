FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 5101

CMD ["node", "dist/services/auth-service/src/server.js"]
