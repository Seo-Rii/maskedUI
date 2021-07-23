const { app, ipcMain, Notification, BrowserWindow } = require('electron')
const path = require('path')
const setting = require('electron-settings')
const { spawn } = require('child_process');


let mainWindow, ls

function getFramePath() {
    return `file://${__dirname}/index.html`
}

function createMainWindow() {
    if (mainWindow) {
        mainWindow.focus()
        return
    }
    mainWindow = new BrowserWindow({
        width: 900, height: 600, minWidth: 650, minHeight: 300, vibrancy: 'appearance-based', webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            enableRemoteModule: true,
            contextIsolation: false
        }, icon: path.join(__dirname, 'res/logo.ico'), frame: false
    })
    mainWindow.setMenu(null)
    mainWindow.loadURL(getFramePath())

    //mainWindow.webContents.openDevTools({ mode: "detach" })

    mainWindow.on('closed', () => {
        mainWindow = null
        app.exit()
    })
}

function init() {
    createMainWindow()

    //ls = spawn('python', [path.join(__dirname, 'CheckMask', 'main.py')])
}

app.on('ready', init)


app.on('window-all-closed', (e) => {
    //e.preventDefault()
    app.exit()
})

function sendNotification(title, msg) {
    if (setting.getSync('nalert')) return
    const myNotification = new Notification({
        title: title,
        icon: path.join(__dirname, 'res/logo.ico'),
        body: msg
    })
    myNotification.show()
}
