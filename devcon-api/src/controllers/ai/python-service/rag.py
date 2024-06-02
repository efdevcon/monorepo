import os
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from transformers import AutoTokenizer

# Embedding model setup
Settings.embed_model = HuggingFaceEmbedding(
    model_name='BAAI/bge-small-en-v1.5'
)

tokenizer = AutoTokenizer.from_pretrained(
    "meta-llama/Meta-Llama-3-8B-Instruct")


async def setup_vector_store():
    reader = SimpleDirectoryReader(input_dir="../formatted-content/")
    documents = reader.load_data()
    index = VectorStoreIndex.from_documents(documents=documents)

    retriever = index.as_retriever()
    retriever.similarity_top_k = 4
    return retriever

retriever = None


async def initialize_retriever():
    global retriever
    retriever = await setup_vector_store()


def get_website_content_for_query(query: str, max_tokens: int = 10000):
    if not retriever:
        return 'No context yet'

    nodes = retriever.retrieve(query)
    text = ''
    total_tokens = 0

    for node in nodes:
        node_text = node.get_text()
        node_tokens = tokenizer.encode(node_text)
        if total_tokens + len(node_tokens) > max_tokens:
            break

        text += node_text + '\n'
        total_tokens += len(node_tokens)

    return text
