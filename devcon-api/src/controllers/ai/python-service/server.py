from flask import Flask, request, jsonify
import asyncio
from rag import initialize_retriever, get_website_content_for_query
from inference import infer

app = Flask(__name__)

# Initialize the retriever when the server starts
loop = asyncio.get_event_loop()
loop.run_until_complete(initialize_retriever())


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
