import os
import requests
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from dotenv import dotenv_values

config = dotenv_values("./.env")

# Load the tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    'meta-llama/Meta-Llama-3-8B-Instruct', token=config.get('HF_ACCESS_TOKEN'))

intro = """Your name is 'Deva', a fictional unicorn that represents Devcon. You are witty and cheerful, and care deeply about Devcon's ability to promote Ethereum. You often make jokes and generally want to spread joy and excitement. You are a website search assistant, tasked to help users answer practical questions about Devcon. Devcon is not about price talk, it is about promoting the Ethereum blockchain and the values it stands for."""

# def summarize_past_conversation(past_conversation):
#     if len(past_conversation) > 300:
#         return ai_summarize(past_conversation)
#     return past_conversation

# past_conversation = summarize_past_conversation(conversation_history)
# total_tokens = len(system_message) + len(past_conversation) + len(current_query) + len(rag_content)

# if total_tokens <= 2048:
#     # Proceed with generating the response
# else:
#     # Handle token overflow


# def ai_summarize(past_conversation):
#     pass


# Load a summarization model and pipeline
# summarizer = pipeline("summarization", model="meta-llama/Meta-Llama-3-8B-Instruct",
#                       tokenizer="meta-llama/Meta-Llama-3-8B-Instruct", token=config.get('HF_ACCESS_TOKEN'))


def ai_summarize(past_conversation):
    # past_conversation_with_instructions = f"A user had a conversation with an AI chatbot, but it contains too many tokens. You need to summarize what the user is asking about so the AI chatbot can keep the conversation going. What you say will be given as a system prompt to the AI. Here is the conversation: '{past_conversation}'"

    chat = [
        # {"role": "system", "content": intro},
        {"role": "system",
            "content": 'A user had the following conversation with an AI chatbot, but it is becoming too long. You need to summarize what the user is asking about so the AI chatbot can keep the conversation going, while keeping useful context in the summary (from the perspective of the chatbot). What you say will be given as a system prompt to the AI chatbot. Here is the conversation: '},
        *past_conversation,
    ]

    formatted_input = tokenizer.apply_chat_template(chat, tokenize=False)

    # Prepare the request payload
    payload = {
        "inputs": formatted_input,
    }

    response = requests.request('POST',
                                f"https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
                                headers={
                                    "Content-Type": "application/json",
                                    "Authorization": f"Bearer {config.get('HF_ACCESS_TOKEN')}",
                                },
                                json=payload
                                )
    # Parse the response
    response_data = response.json()

    # Extract the assistant's response
    full_text = response_data[0]['generated_text']

    # Find the start of the assistant's response
    split_text = full_text.split("<|eot_id|>assistant")

    # Extract the assistant's response
    if len(split_text) > 1:
        assistant_response = split_text[1].strip()
    else:
        assistant_response = "No valid response from assistant"
    return assistant_response if assistant_response else "No valid response from assistant"

    # return response_data.pop()

    # summary = summarizer(past_conversation_with_instructions, max_length=300,
    #                      min_length=30, do_sample=False)
    # return summary[0]['summary_text']


def infer(query: str, context: str, messages: list):
    past_conversation = " ".join([msg['content']
                                 for msg in messages if msg['role'] != 'system'])

    # Summarize past conversation if too long
    tokenized_past_conversation = tokenizer.encode(past_conversation)

    if len(tokenized_past_conversation) > 300:
        past_conversation_summary = ai_summarize(messages)

        print(past_conversation_summary, 'past convo summary')

        chat = [
            {"role": "system", "content": intro},
            {"role": "system", "content": f"Summary of past conversation with this user: {past_conversation_summary}"},
            {"role": "user", "content": f"Given: {context}, how would you answer: {query}"}
        ]
    else:
        chat = [
            {"role": "system", "content": intro},
            *messages,
            {"role": "user", "content": f"Given: {context}, how would you answer: {query}"}
        ]

    # Format the input using the chat template
    formatted_input = tokenizer.apply_chat_template(chat, tokenize=False)

    # Prepare the request payload
    payload = {
        "inputs": formatted_input,
    }

    # Send the request to the Hugging Face API
    response = requests.request('POST',
                                f"https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
                                headers={
                                    "Content-Type": "application/json",
                                    "Authorization": f"Bearer {config.get('HF_ACCESS_TOKEN')}",
                                },
                                json=payload
                                )

    response_data = response.json()

    if ('error' in response_data and response_data['error']):
        raise Exception(response_data['error'])

    # Extract the assistant's response
    full_text = response_data[0]['generated_text']

    # Find the start of the assistant's response
    split_text = full_text.split("<|eot_id|>assistant")

    # Extract the assistant's response
    if len(split_text) > 1:
        assistant_response = split_text[1].strip()
    else:
        assistant_response = "No valid response from assistant"

    return assistant_response if assistant_response else "No valid response from assistant"

    # Parse the response

    return response_data.pop()
