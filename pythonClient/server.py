from flask import Flask, send_file, request, jsonify
from flask_cors import CORS
import zipfile
import requests


def create_zip_file():
    with open('test.txt', 'w') as f:
        f.write("This is a test file")

    with zipfile.ZipFile('test.zip', 'w') as zip_file:
        zip_file.write('test.txt')


app = Flask(__name__)
CORS(app)

@app.route('/')
def hello_world():
    return "Hello World"


def hex_dump(data):
    return ' '.join(f'{byte:02x}' for byte in data)

count = 0

@app.route('/start-receive')
def start_receive():
    create_zip_file()
    zip_path = 'test.zip'
    global count
    unique_id = f"unique_id_{str(count)}"
    count += 1

    files = {'file': open(zip_path, 'rb')}
    data = {'unique_id': unique_id}

    # print(hex_dump(files))

    response = requests.post('http://localhost:3000/receive-zip', files=files, data=data)

    print(response)

    return jsonify(response.json())

@app.route('/start-forward')
def start_forward():
    create_zip_file()
    zip_path = 'test.zip'
    global count
    unique_id = f"unique_id_{str(count)}"
    count += 1

    files = {'file': open(zip_path, 'rb')}
    data = {'unique_id': unique_id}

    # print(hex_dump(files))

    response = requests.post('http://localhost:3000/forward-zip', files=files, data=data)

    print(response)

    return jsonify(response.json())

if __name__ == '__main__':
    app.run(debug=True)