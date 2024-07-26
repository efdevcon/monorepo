import os
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.node_parser import (
    SentenceSplitter,
    SemanticSplitterNodeParser,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from transformers import AutoTokenizer
from dotenv import dotenv_values
import json

config = dotenv_values("./.env")

# Embedding model setup
Settings.embed_model = HuggingFaceEmbedding(
    model_name='BAAI/bge-small-en-v1.5'
)

# Settings.embed_model.client.tokenizer.pad_token = '<|eot_id|>'


# https://medium.com/the-ai-forum/semantic-chunking-for-rag-f4733025d5f5 <--- need semantic chunking I think, results are too bad

tokenizer = AutoTokenizer.from_pretrained(
    "meta-llama/Meta-Llama-3-8B-Instruct")

# splitter = SemanticSplitterNodeParser(
#     buffer_size=1, breakpoint_percentile_threshold=95, embed_model=Settings.embed_model
# )

splitter = SemanticSplitterNodeParser(
    buffer_size=5, breakpoint_percentile_threshold=95, embed_model=Settings.embed_model
)

# also baseline splitter
base_splitter = SentenceSplitter(chunk_size=258)

def save_nodes_to_json(nodes, output_dir="nodes_output"):
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Iterate over the nodes and save each one to a JSON file
    for i, node in enumerate(nodes):
        node_dict = node.to_dict()  # Convert node to dictionary if necessary
        file_path = os.path.join(output_dir, f"node_{i}.json")
        with open(file_path, "w", encoding="utf-8") as json_file:
            json.dump(node_dict, json_file, ensure_ascii=False, indent=4)

async def setup_vector_store():
    reader = SimpleDirectoryReader(input_dir="../formatted-content/")
    documents = reader.load_data()
    # nodes = splitter.get_nodes_from_documents(documents)
    nodes = splitter.get_nodes_from_documents(documents)

    save_nodes_to_json(nodes)

    index = VectorStoreIndex(nodes)

    # index = VectorStoreIndex.from_documents(documents=documents)

    retriever = index.as_retriever()
    retriever.similarity_top_k = 10
    # retriever.similarity_threshold = 0.2 # confirm this works?
    return retriever

retriever = None


async def initialize_retriever():
    global retriever
    retriever = await setup_vector_store()


def get_website_content_for_query(query: str, max_tokens: int = 4096):
    if not retriever:
        return 'No context yet'

    nodes = retriever.retrieve(query)
    text = ''
    total_tokens = 0

    for node in nodes:
        file_path = node.metadata.get('file_path')
        node_text = ''

        # Get parent file 
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as file:
                node_text = file.read()
        else:   
            node_text = node.get_text()

        node_tokens = tokenizer.encode(node_text)

        if total_tokens + len(node_tokens) > max_tokens:
            break

        text += node_text + '\n\n'
        total_tokens += len(node_tokens)

    return text
