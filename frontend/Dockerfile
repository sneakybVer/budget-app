# Build context must be the repo root (set in docker-compose.yml)
# The dist/ is pre-built by GitHub Actions and committed to the repo.
FROM nginx:alpine

COPY frontend/dist/ /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
