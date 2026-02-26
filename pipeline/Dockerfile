FROM apache/airflow:2.8.4-python3.11

# Install additional Python dependencies on top of the base Airflow image.
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir --user -r /requirements.txt
