from serial import Serial
import numpy as np

port = 'COM3'
BaudRate = 115200
ARD = Serial(port, BaudRate)


def Decode(A):
    try:
        A = A.decode()
    except:
        return False
    A = str(A)
    if A[0] == 'Q':
        return A[1:]
    else:
        return False


def Ardread():
    ARD.flushInput()
    while True:
        if ARD.readable():
            LINE = ARD.readline()
            code = Decode(LINE)
            if code == False:
                continue
            return (code)
        else:
            pass


def readT():
    while True:
        try:
            res = Ardread()
            li = res.split(',')
            li.pop()
            tli=[]
            ma = 0
            for i in li:
                ma = max(ma, float(i))
                tli.append(float(i))
            return [ma*3-53, tli]
        except:
            pass
