import cv2
import numpy as np
import os
import face_recognition
from tensorflow import keras
from tensorflow.keras.utils import to_categorical
import pickle
from temperature import readT
import base64
import io
from PIL import Image
from PIL import ImageDraw


class Face:
    def __init__(self):
        self.faces = []
        self.pic = None

    def add_face(self, face):
        # add face
        self.faces.append(face)

    def main_face(self, pic):
        self.pic = pic

    def calculate_average_encoding(self):
        if len(self.faces) == 0:
            return None
        else:
            return np.average(self.faces, axis=0)


filedir = os.path.dirname(os.path.realpath(__file__))
os.chdir(filedir)
faceList = []

face_cascade = cv2.CascadeClassifier('db/haarcascade_frontalface_alt.xml')
eye_cascade = cv2.CascadeClassifier('db/haarcascade_eye.xml')
smile_cascade = cv2.CascadeClassifier('db/haarcascade_mcs_mouth.xml')


def save():
    model.save('kmodel')
    with open('model.txt', 'wb') as f:
        pickle.dump(faceList, f)


def train():
    global model

    model = keras.Sequential([
        keras.layers.Dense(256, activation='relu', input_dim=128),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.Dense(len(faceList), activation='softmax')
    ])

    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])

    X = []
    Y = []

    for i in range(len(faceList)):
        X += faceList[i].faces
        Y += ([i]*len(faceList[i].faces))

    X = np.array(X)
    Y = np.array(Y)

    model.fit(X, Y, epochs=200)
    save()


try:
    with open('model.txt', 'rb') as f:
        faceList = pickle.load(f)
        model = keras.models.load_model('kmodel')
except:
    faceList = []
    try:
        train()
    except:
        pass


def detectFace(encoding):
    return model.predict(np.array([encoding]))[0].argmax()


def main(img):
    encoded_img = np.fromstring(img, dtype=np.uint8)
    frame = cv2.imdecode(encoded_img, cv2.IMREAD_COLOR)
    frame = cv2.flip(frame, 1)

    face = face_cascade.detectMultiScale(frame, scaleFactor=1.2, minNeighbors=5, minSize=(25, 25))

    li = []
    temp=readT()

    if len(face):
        for (x, y, w, h) in face:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

            roi_frame = frame[y:y + h, x:x + w]

            eye = eye_cascade.detectMultiScale(roi_frame)
            smile = smile_cascade.detectMultiScale(roi_frame)
            min_eye_pos = y + h
            for (ex, ey, ew, eh) in eye:
                if min_eye_pos > ey + eh / 2:
                    min_eye_pos = ey + eh / 2
            for (sx, sy, sw, sh) in smile:
                if sy > min_eye_pos:
                    try:
                        t = face_recognition.face_encodings(roi_frame)[0]
                        a = temp[0]
                        li.append([detectFace(t), a])
                    except:
                        pass
    
    lis=temp[1]
    im2 = Image.new("RGB", (81,81))
    draw = ImageDraw.Draw(im2)
    for t in range(64):
        (x, y)=divmod(t, 8)
        color=(min(int(lis[t]*20-400), 255),255-min(int(lis[t]*20-400), 255),0)
        draw.rectangle((((7-x)*10, y*10), ((7-x)*10+10, y*10+10)), fill=color)

    buf = io.BytesIO()
    im2.save(buf, format="JPEG")
    buf.seek(0)
    bs=base64.b64encode(buf.getvalue()).decode()
    return '{"user":' + str(li) + ', "img":"'+bs+'"}'


def add(img, id):
    id = int(id)
    encoded_img = np.fromstring(img, dtype=np.uint8)
    frame = cv2.imdecode(encoded_img, cv2.IMREAD_COLOR)
    frame = cv2.flip(frame, 1)

    face = face_cascade.detectMultiScale(frame, scaleFactor=1.2, minNeighbors=5, minSize=(25, 25))

    li = []

    if len(face) == 1:
        for (x, y, w, h) in face:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

            roi_frame = frame[y:y + h, x:x + w]

            eye = eye_cascade.detectMultiScale(roi_frame)
            smile = smile_cascade.detectMultiScale(roi_frame)
            min_eye_pos = y + h
            for (ex, ey, ew, eh) in eye:
                if min_eye_pos > ey + eh / 2:
                    min_eye_pos = ey + eh / 2
            for (sx, sy, sw, sh) in smile:
                if sy > min_eye_pos:
                    try:
                        t = face_recognition.face_encodings(roi_frame)[0]
                        while len(faceList)-1 < id:
                            faceList.append(Face())
                        faceList[id].add_face(t)

                        if faceList[id].pic == None:
                            is_success, buffer = cv2.imencode(
                                ".jpg", roi_frame)
                            faceList[id].main_face(buffer.tobytes())
                    except:
                        pass

        return '1'
    else:
        return str(len(face))


def user(i):
    return faceList[int(i)].pic


def remove(i):
    faceList[int(i)] = Face()
    train()
