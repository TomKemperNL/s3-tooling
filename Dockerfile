FROM node:22-alpine
RUN apk update
RUN apk add git
RUN apk add openssh
RUN git config --global --add safe.directory '*'
COPY ./container/ssh-keys/id_* /root/.ssh/

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN npm install
RUN npm run build
EXPOSE 3000

CMD ["npm", "run", "start:web"]
