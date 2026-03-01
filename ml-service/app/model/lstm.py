"""
ml-service/app/model/lstm.py — PyTorch LSTM architecture for price prediction.

LIFECYCLE OF THIS MODEL:
  1. Architecture defined here (no weights — just layer definitions)
  2. Instantiated + trained by:  pipeline/dags/train_model.py → train_lstm task
  3. Logged to MLflow by:        pipeline/dags/train_model.py → log_to_mlflow task
                                  mlflow.pytorch.log_model(model, "model")
                                  Artifact stored in Docker volume: mlflow-artifacts
  4. Loaded for inference by:    ml-service/app/model/load.py → load_model(run_id)
  5. Called during prediction:   ml-service/app/routes/predict.py → predict()

INPUT TENSOR:
  Shape: (batch_size, sequence_length, input_size)
  input_size = OHLCV (5 cols) + indicators from ml-service/app/features.py
               e.g. RSI_14(1) + MACD_12_26_9(3) + BBands(3) ≈ 12 features total
  Data sourced from MySQL crypto_db.prices (written by pipeline/dags/fetch_prices.py)

OUTPUT TENSOR:
  Shape: (batch_size, output_size)
  Predicted closing price(s) for the next output_size timesteps
"""
import torch
import torch.nn as nn


class LSTMModel(nn.Module):
    """
    Skeleton LSTM model for time-series price prediction.

    input_size  : number of features per timestep (e.g. OHLCV + indicators)
    hidden_size : LSTM hidden state dimensionality
    num_layers  : number of stacked LSTM layers
    output_size : number of future timesteps to predict
    """

    def __init__(
        self,
        input_size: int = 12,
        hidden_size: int = 64,
        num_layers: int = 2,
        output_size: int = 24,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers, batch_first=True, dropout=0.2
        )
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, seq_len, input_size)
        out, _ = self.lstm(x)
        # Take the last timestep's output
        return self.fc(out[:, -1, :])
