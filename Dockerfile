FROM node:22-trixie-slim

ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHON_EXECUTABLE=/opt/venv/bin/python

RUN apt-get update \
    && apt-get install --no-install-recommends -y libgomp1 python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -c "import sys; assert sys.version_info >= (3, 12), sys.version"

WORKDIR /app

COPY ML/requirements-inference.txt /app/ML/requirements-inference.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r /app/ML/requirements-inference.txt

COPY backend/package.json backend/package-lock.json /app/backend/
RUN npm ci --omit=dev --prefix /app/backend

COPY backend /app/backend
COPY ML/config.py /app/ML/config.py
COPY ML/models /app/ML/models
COPY ML/src /app/ML/src
COPY ML/recommendation /app/ML/recommendation

RUN /opt/venv/bin/python -c "import joblib; joblib.load('/app/ML/models/model_package_v1.joblib'); joblib.load('/app/ML/models/preprocessor.joblib')"

WORKDIR /app/backend
EXPOSE 10000

USER node

CMD ["node", "index.js"]
