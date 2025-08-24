FROM node:22-alpine
RUN apk update
RUN apk add git
RUN git config --global --add safe.directory '*'

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN npm install
RUN npm run build
EXPOSE 3000

CMD ["npm", "run", "start:web"]
