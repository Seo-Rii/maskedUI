from typing import ChainMap
from flask import Flask, render_template, Response, request
import mask_detector
from temperature import readT
import io
from PIL import Image
from PIL import ImageDraw

app = Flask(__name__)




@app.route('/people', methods=['POST'])
def people():
    return Response(mask_detector.main(request.get_data()))

@app.route('/add/<id>', methods=['POST'])
def add(id):
    return Response(mask_detector.add(request.get_data(), id))


@app.route('/face/<id>')
def face(id):
    return Response((mask_detector.user(id)), mimetype='image/jpeg')

@app.route('/del/<id>')
def remove(id):
    return Response((mask_detector.remove(id)))

@app.route('/train')
def train():
    return Response((mask_detector.train()))

@app.route('/ping')
def ping():
    return Response('0')


if __name__ == '__main__':
    app.run(host='0.0.0.0')
