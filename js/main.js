let dialog, snackbar;
const setting = require('electron-settings')
const path = require('path')
let unregistedUserList = []
let his
let pause = false
let userCount = 0
let change_id

function fto(url, options, timeout = 500) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout)
        )
    ]);
}

function numFormat(variable) {
    variable = Number(variable).toString();
    if (Number(variable) < 10 && variable.length == 1) variable = "0" + variable;
    return variable;
}

function openRegister() {
    if (dialog.isOpen) return;
    document.getElementById('name').value = ''
    dialog4.close()
    dialog.open()
}


function userSeen(v, time = new Date(), force = false, regHis = true) {
    id=v[0]
    temp=v[1]
    if (!setting.getSync(`user.u${id}`)) {
        unregistedUserList.push(id)
        return
    }
    if (setting.getSync(`user.u${id}.rem`)) return
    if ((time - new Date(setting.getSync(`user.u${id}.lastTime`)) < 3000) && !force) return;
    setting.setSync(`user.u${id}.lastTime`, time)
    let timeStr = `${time.getFullYear()}년 ${time.getMonth() + 1}월 ${time.getDate()}일 ${numFormat(time.getHours())}:${numFormat(time.getMinutes())}:${numFormat(time.getSeconds())}`
    let li = document.createElement('ul')
    li.className = 'mdc-list-item ripple'
    li.innerHTML = `<span class="mdc-list-item__ripple"></span>
                <span class="mdc-list-item__text" ${temp>37.5?'style="color:red;"':''}>
                  <span class="mdc-list-item__primary-text">${setting.getSync(`user.u${id}.name`)} / ${temp}도</span>
                  <span class="mdc-list-item__secondary-text">${timeStr}</span>
                </span>`
    new mdc.ripple.MDCRipple(li)
    document.getElementById('list').prepend(li)
    if (regHis) {
        his.push({ 'id': v, time: time })
        setting.setSync('history', his)
        setTimeout(() => {
            if(temp>37.5) {
                document.getElementById('li-err').innerHTML = `
                <span class="mdc-list-item__graphic" aria-hidden="true">
                    <img src="http://localhost:5000/face/${id}" style="height: 45px;border-radius: 100px;">
                </span>
                <span class="mdc-list-item__ripple"></span>
                <span class="mdc-list-item__text">
                  <span class="mdc-list-item__primary-text">${setting.getSync(`user.u${id}.name`)}</span>
                  <span class="mdc-list-item__secondary-text">${temp}도</span>
                </span>`
                dialog7.open()
            }
            else showSnackbar(setting.getSync(`user.u${id}.name`)+'님 정상체온 확인되었습니다.')
        }, 100)
        
    }
}

function showSnackbar(str) {
    document.getElementById('snackbar-text').innerText = str
    snackbar.close()
    snackbar.open()
}

function register() {
    dialog.close()
    dialog2.open()
    setting.setSync(`user.u${userCount}.name`, document.getElementById('name').value)
    userCount += 1
    pg.determinate = true
    pause = true
    reg(0, userCount - 1)
}

function add_data(id) {
    dialog4.close()
    dialog2.open()
    pg.determinate = true
    pause = true
    reg(0, id)
}

function req_change_name(id) {
    change_id = id
    document.getElementById('cname').value = ''
    dialog4.close()
    dialog5.open()
}

function change_name() {
    dialog5.close()
    dialog6.open()
    setTimeout(() => {
        setting.setSync(`user.u${change_id}.name`, document.getElementById('cname').value)
        document.getElementById('list').innerHTML = ''
        for (let i of his) {
            userSeen(i.id, new Date(i.time), true, false)
        }
        dialog6.close()
    }, 300)
}

const rcnt = 15

function reg(cnt, id) {
    takePicture((blob) => {
        fetch('http://127.0.0.1:5000/add/' + id, {
            method: 'POST',
            body: blob
        }).then(async (res) => {
            r = await res.text()
            pg.progress = (cnt + 1) / rcnt
            if (cnt >= rcnt) {
                pg.determinate = false
                fetch('http://127.0.0.1:5000/train').then(() => {
                    pause = false
                    setting.setSync('userCount', userCount)
                    dialog2.close()
                    process()
                })
                return
            }
            if (r == "1") reg(cnt + 1, id)
            else reg(cnt, id)
        })
    })
}

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
  
    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

function process() {
    takePicture((blob) => {
        fetch('http://127.0.0.1:5000/people', {
            method: 'POST',
            body: blob
        }).then(res => res.json()).then(res => {
            let li = res.user
            for (let i = 0; i < li.length; i++) {
                userSeen(li[i])
            }
            let img=b64toBlob(res.img, 'image/jpeg')
            const blobUrl = URL.createObjectURL(img);
            document.getElementById('temp').src=blobUrl
        }).finally(() => {
            if (!pause) process()
        })
    })
}

function takePicture(cb) {
    let canvas = document.getElementById('canv')
    var video = document.querySelector("#videoElement");
    width = video.videoWidth
    height = video.videoHeight
    var context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob(cb, 'image/png');
}


function wait(cb) {
    it = setInterval(() => {
        fto('http://127.0.0.1:5000/ping').then(() => {
            cb()
            clearInterval(it)
        })
    }, 500)
}

function showUser() {
    document.getElementById('li-add').innerHTML = ''
    for (let i = 0; i < userCount; i++) {
        if (setting.getSync(`user.u${i}.rem`)) continue
        document.getElementById('li-add').innerHTML += `<li class="mdc-list-item ripple">
        <span class="mdc-list-item__graphic" aria-hidden="true">
            <img src="http://localhost:5000/face/${i}" style="height: 45px;border-radius: 100px;">
        </span>
        <span class="mdc-list-item__text">${setting.getSync(`user.u${i}.name`)}</span>
        <span class="mdc-list-item__meta material-icons" aria-hidden="true" onclick="req_change_name(${i});">edit</span>
        <span class="mdc-list-item__meta material-icons" aria-hidden="true" style="margin-left:10px;" onclick="add_data(${i});">add</span>
        <span class="mdc-list-item__meta material-icons" aria-hidden="true" style="margin-left:10px;" onclick="del_user(${i});">delete</span>
    </li>`
    }
    setTimeout(()=>{
        document.getElementById('li-add').querySelectorAll('.ripple').forEach(el=>{
            new mdc.ripple.MDCRipple(el)
        })
    }, 100)
    document.getElementById('li-add').innerHTML += `<li class="mdc-list-item ripple" onclick="openRegister();">
        <span class="mdc-list-item__text">사용자 추가</span>
        <span class="mdc-list-item__meta material-icons" aria-hidden="true">add</span>
    </li>`
    dialog4.open()
}

function del_user(id) {
    pause = true
    dialog6.open()
    dialog4.close()
    setting.setSync(`user.u${id}.name`, '')
    setting.setSync(`user.u${id}.rem`, true)

    let p = 0

    setTimeout(() => {
        document.getElementById('list').innerHTML = ''
        for (let i of his) {
            userSeen(i.id, new Date(i.time), true, false)
        }
        p += 1
        if (p == 2) {
            pause = false
            process()
            dialog6.close()
            showSnackbar('사용자를 삭제했어요.')
        }
    }, 300)
    fetch('http://127.0.0.1:5000/del/' + id).then(() => {
        p += 1
        if (p == 2) {
            pause = false
            process()
            dialog6.close()
            showSnackbar('사용자를 삭제했어요.')
        }
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    await setting.reset()
    his = setting.getSync('history')
    userCount = setting.getSync('userCount')
    if (!userCount) userCount = 0
    if (!his) his = []
    list = new mdc.list.MDCList(document.querySelector('.mdc-list'));
    dialog = new mdc.dialog.MDCDialog(document.querySelector('.mdc-dialog'))
    dialog2 = new mdc.dialog.MDCDialog(document.getElementById('dialog2'))
    dialog3 = new mdc.dialog.MDCDialog(document.getElementById('dialog3'))
    dialog4 = new mdc.dialog.MDCDialog(document.getElementById('dialog4'))
    dialog5 = new mdc.dialog.MDCDialog(document.getElementById('dialog5'))
    dialog6 = new mdc.dialog.MDCDialog(document.getElementById('dialog6'))
    dialog7 = new mdc.dialog.MDCDialog(document.getElementById('dialog7'))
    dialog3.open()
    dialog2.escapeKeyAction = "";
    dialog2.scrimClickAction = "";
    dialog3.escapeKeyAction = "";
    dialog3.scrimClickAction = "";
    dialog6.escapeKeyAction = "";
    dialog6.scrimClickAction = "";
    pg = new mdc.linearProgress.MDCLinearProgress(document.querySelector('.mdc-linear-progress'))
    pg2 = new mdc.linearProgress.MDCLinearProgress(document.getElementById('prog2'))
    pg3 = new mdc.linearProgress.MDCLinearProgress(document.getElementById('prog3'))
    pg2.determinate = false
    pg3.determinate = false

    setTimeout(() => {
        for (let i of his) {
            userSeen(i.id, new Date(i.time), true, false)
        }
    }, 500)

    var video = document.querySelector("#videoElement");

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                video.srcObject = stream;
            })
            .catch(function (err0r) {
                console.log("Something went wrong!");
            });
    }
    wait(() => {
        dialog3.close()
        mdc.textField.MDCTextField.attachTo(document.getElementById('name-container'))
        mdc.textField.MDCTextField.attachTo(document.getElementById('cname-container'))
        snackbar = new mdc.snackbar.MDCSnackbar(document.querySelector('.mdc-snackbar'))
        document.getElementById('name').addEventListener('keydown', (e) => {
            console.log(e.key)
            if (e.key === 'Enter') {
                dialog.close()
                register()
            }
        })
        document.getElementById('cname').addEventListener('keydown', (e) => {
            console.log(e.key)
            if (e.key === 'Enter') {
                dialog.close()
                change_name()
            }
        })
        let ripples = document.querySelectorAll('.ripple')
        for (let el of ripples) {
            new mdc.ripple.MDCRipple(el)
        }
        process()
    })
})
