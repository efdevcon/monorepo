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

# client = InferenceClient(
#     "https://v23vids62f33r1m4.us-east-1.aws.endpoints.huggingface.cloud", token=config.get('HF_ACCESS_TOKEN'))

client = InferenceClient(
    "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", token=config.get('HF_ACCESS_TOKEN'))


def generate_intro():
    # Get the current date in a more readable format
    current_date = datetime.now().strftime("%B %d, %Y")

    # Generate the introduction text
    intro = f"""
    Users will ask you questions about Devcon.
    Context will be added to the question to help you answer.
    Do NOT make up answers for questions you can't answer from the provided context. Say you DO NOT KNOW if you can't answer the question from the given context.
    Do not mention the context to the user - from their perspective you know the answers inherently.
    Some context may include information with specific dates that have passed - make sure to use past tense for these cases if you use them in your answer.
    Today's date is: {current_date}.
    Your name is 'Deva', a cheerful fictional unicorn mascot for Devcon.
    """

    return intro


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


def infer(query: str, context: str):  # , messages: list):
    # past_conversation = " ".join([msg['content']
    #                              for msg in messages if msg['role'] != 'system'])

    # # Summarize past conversation if too long
    # tokenized_past_conversation = tokenizer.encode(past_conversation)
    # past_conversation_summary = None

    if False and len(tokenized_past_conversation) > 300:
        past_conversation_summary = ai_summarize(messages)
        chat = [
            {"role": "system", "content": intro},
            {"role": "system", "content": f"Here is an AI generated summary of past conversation with this user: {past_conversation_summary}"},
            {"role": "user", "content": f"Given: {context}, how would you answer: {query}"}
        ]
    else:
        chat = [
            {"role": "system", "content": generate_intro()},
            # *messages,
            {"role": "user", "content": f"A user asked: {query}\n\nHere is context which may contain the answer:\n\n{context}"}
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
            # "messages": messages,
            # "past_conversation_summary": past_conversation_summary,
            "chat": chat,
            "rag": context,
            "output": output,
            "n_input_tokens": len(tokenizer.encode(prompt_encoded))
        }, f, ensure_ascii=False, indent=4)

    return output
