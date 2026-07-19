# Lucy AI — DB bridge image: minimal Python SQLite service (stdlib only).
FROM python:3.12-alpine

WORKDIR /app
COPY app.py ./

# SQLite lives on a mounted volume at /data.
ENV DB_PATH=/data/lucy.db \
    PORT=8799

EXPOSE 8799
CMD ["python3", "app.py"]
