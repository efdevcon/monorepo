import os
import json
import requests
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from huggingface_hub import InferenceClient
from dotenv import dotenv_values

config = dotenv_values("./.env")

# meta-llama/Meta-Llama-3-8B-Instruct

# Load the tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    'meta-llama/Meta-Llama-3-8B-Instruct', token=config.get('HF_ACCESS_TOKEN'))

client = InferenceClient("https://v23vids62f33r1m4.us-east-1.aws.endpoints.huggingface.cloud", token=config.get('HF_ACCESS_TOKEN'))

intro = """You are a website search assistant hosted for devcon.org. tasked to help users answer practical questions about Devcon. Your name is 'Deva', a cheerful fictional unicorn mascot for Devcon. Our system may add some RAG context to the user's query to help you answer questions about Devcon - the existence of this context should obviously not be communicated to the user; from their point of view you just know things. If there is no answer to the user query, politely say you aren't sure, rather than making up an answer that may be wrong."""

def ai_summarize(past_conversation):
    # past_conversation_with_instructions = f"A user had a conversation with an AI chatbot, but it contains too many tokens. You need to summarize what the user is asking about so the AI chatbot can keep the conversation going. What you say will be given as a system prompt to the AI. Here is the conversation: '{past_conversation}'"

    chat = [
        # {"role": "system", "content": intro},
        {"role": "system",
            "content": 'A user had a conversation with an AI chatbot, but it is becoming too long for the AI to handle. You need to summarize the important exchanges in the conversation so the AI chatbot can keep the conversation going, while keeping useful context intact. What you say will be given as a system prompt to the AI chatbot. Here are the AI chatbot guidelines: "{intro}". The next messages will be the past conversation.'},
        *past_conversation,
        {"role": "system",
            "content": 'Please generate the summary.'},
    ]

    prompt_encoded = tokenizer.apply_chat_template(chat, tokenize=False)

    output = client.text_generation(prompt_encoded, max_new_tokens=2048)

    return output

def infer(query: str, context: str, messages: list):
    past_conversation = " ".join([msg['content'] for msg in messages if msg['role'] != 'system'])

    # Summarize past conversation if too long
    tokenized_past_conversation = tokenizer.encode(past_conversation)
    past_conversation_summary = None

    if len(tokenized_past_conversation) > 300:
        past_conversation_summary = ai_summarize(messages)
        chat = [
            {"role": "system", "content": intro},
            {"role": "system", "content": f"Here is an AI generated summary of past conversation with this user: {past_conversation_summary}"},
            {"role": "user", "content": f"Given: {context}, how would you answer: {query}"}
        ]
    else:
        chat = [
            {"role": "system", "content": intro},
            *messages,
            {"role": "user", "content": f"RAG Context:\n\n{context}\n\n---\n\nUser Query:\n\n{query}"}
        ]

    # Format the input using the chat template
    prompt_encoded = tokenizer.apply_chat_template(chat, tokenize=False)

    output = client.text_generation(prompt_encoded, max_new_tokens=2048)
    
    # Create the 'queries' directory if it does not exist
    if not os.path.exists('queries'):
        os.makedirs('queries')

    # Create a unique file name based on the current timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_path = os.path.join('queries', f"query_{timestamp}.json")

    # Write details to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump({
            "query": query,
            "messages": messages,
            "past_conversation_summary": past_conversation_summary,
            "chat": chat,
            "rag": context,
            "output": output,
            "n_input_tokens": len(tokenizer.encode(prompt_encoded))
        }, f, ensure_ascii=False, indent=4)

    return output
