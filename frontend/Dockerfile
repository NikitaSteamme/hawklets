# Build stage
FROM node:18-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
RUN yarn build

# Serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY docker/nginx/hawklets.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
