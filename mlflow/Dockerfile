FROM python:3.11-slim

RUN pip install --no-cache-dir mlflow==2.14.1

# Artifact store lives on a Docker volume mounted at /mlflow/artifacts
VOLUME ["/mlflow/artifacts"]

EXPOSE 5000

CMD ["mlflow", "server", \
     "--host", "0.0.0.0", \
     "--port", "5000", \
     "--backend-store-uri", "file:///mlflow/artifacts", \
     "--default-artifact-root", "file:///mlflow/artifacts"]
