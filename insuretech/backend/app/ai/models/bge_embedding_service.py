import os


MODEL_NAME = "BAAI/bge-base-en-v1.5"
_model = None


def get_model():
    global _model
    if _model is None:
        import torch
        from sentence_transformers import SentenceTransformer

        # Optimize CPU parallelism for PyTorch only when the model is needed.
        if "OMP_NUM_THREADS" not in os.environ:
            torch.set_num_threads(min(2, os.cpu_count() or 2))
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def generate_embedding(text: str) -> list[float]:
    model = get_model()
    return model.encode(text).tolist()


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    return model.encode(texts, show_progress_bar=True, batch_size=64).tolist()
