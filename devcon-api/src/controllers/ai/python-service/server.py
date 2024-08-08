from flask import Flask, request, jsonify
import asyncio
from rag import initialize_retriever, get_website_content_for_query
from inference import infer
import json

app = Flask(__name__)

# Initialize the retriever when the server starts
loop = asyncio.get_event_loop()
loop.run_until_complete(initialize_retriever())

# Can remove this, just for easier dev

# Load questions from the JSON file


def load_questions():
    with open('questions.json', 'r') as file:
        questions = json.load(file)
    return questions[:20]  # Get the first 10 questions


@app.route('/rag-test', methods=['GET'])
def rag():
    questions = load_questions()
    responses = []  # To store answers for each question

    # print(questions, 'questions')

    for question in questions:
        content = get_website_content_for_query(question)
        answer = infer(question, content)
        responses.append({'question': question, 'answer': answer})

    return jsonify(responses)

    questions = load_questions()

    query = 'What are the Devcon tracks?'

    content = get_website_content_for_query(query)

    answer = infer(query, content)

    return jsonify(answer)


@app.route('/process', methods=['POST'])
def process():
    data = request.json
    query = data['query']
    messages = data['messages']

    content = get_website_content_for_query(query)

    return jsonify(content)

    answer = infer(query, content, messages)

    print('hello')

    return jsonify(answer)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=4777)
