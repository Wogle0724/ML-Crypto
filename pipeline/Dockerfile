FROM apache/airflow:2.10.5-python3.12

# Install additional Python dependencies on top of the base Airflow image.
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt
