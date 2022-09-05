import createHandler from "github-webhook-handler";
import { createServer } from "http";
import axios from "axios"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import dayjs, { Dayjs } from "dayjs"

const CONFIG_DIR = path.join(homedir(), ".config")
const CONFIG_PATH = path.join(CONFIG_DIR, "github-webhook-handler.json")
var log = (...info: string[]) => {
    console.log(dayjs().format(), ...info)
}
var config: any = {
    port: 4999,
    refreshInterval: 30 * 60 * 1000,
    secret: "github",
    listener: {
        "*": [
            "localhost:123"
        ],
        "test": [
        ]
    }
}
// 初始化文件
if (!existsSync(CONFIG_PATH)) {
    log("未发现配置文件，正在创建默认配置文件")
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR)
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config))
}


// 读取配置内容
function readConfig() {
    log("正在读取配置文件")
    config = JSON.parse(readFileSync(CONFIG_PATH).toString())
    log("读取文件成功")
    setTimeout(readConfig, config.refreshInterval);
}
readConfig()



log("创建服务器....")
var handler = createHandler({ path: '/', secret: config.secret })
createServer(function (req, res) {
    handler(req, res, function (err) {
        res.statusCode = 404
        res.end('no such location')
    })
}).listen(config.port)
log(`创建成功，服务器正在监听端口号${config.port}`)

handler.on('error', function (err) {
    console.error('Error:', err.message)
})

handler.on("*", event => {
    const name = event.payload.repository.full_name
    log(`收到 ${event.repository} 的 ${event.action} 事件`)
    const listeners = config.listener["*"]
    listeners.push(config.listener[name] || [])
    listeners.forEach((url: string) => {
        axios.post(url, event).then(() => {
            log(`已将事件发送给 ${url}`)
        }).catch(() => {
            log(`发送事件到 ${url} 失败！请检查问题`)
        })
    })
})
