# Use official Node.js image
FROM node:18-alpine

WORKDIR /app
COPY . .

EXPOSE 8080

CMD ["npm", "start"]
