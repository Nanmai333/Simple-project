/**
 * emos 整合脚本 (Egern 增强版)
 * 修正：确保异步请求下通知能正常弹出，增强日志输出
 */

const key = "emos_best_token";

// ================= 1. 获取参数逻辑 (Rewrite) =================
if (typeof $request !== "undefined") {
    console.log("emos: 检测到请求，开始尝试获取 Token...");
    const auth = $request.headers["Authorization"] || $request.headers["authorization"];
    
    if (auth && auth.indexOf("Bearer") !== -1) {
        const newToken = auth.trim();
        const oldToken = $persistentStore.read(key);
        
        if (oldToken !== newToken) {
            $persistentStore.write(newToken, key);
            console.log("emos: Token 已更新");
            $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
        } else {
            console.log("emos: Token 未变化");
            // 如需静默，可注释掉下面这行
            $notification.post("emos 签到", "ℹ️ 凭证检查", "Token 一致，无需更新");
        }
    } else {
        console.log("emos: 未在 Header 中找到 Bearer Token");
    }
    $done({}); // 重写模式必须立即执行 $done
} 

// ================= 2. 自动签到逻辑 (Cron) =================
else {
    console.log("emos: 开始定时签到任务...");
    const savedToken = $persistentStore.read(key);
    
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录网页");
        console.log("emos: 错误 - 本地存储中无 Token");
        $done();
    } else {
        // --- 境界数据 (引自 emos签到.js) ---
        const levels = [{ n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 }, { n: "💨练气期·三层", max: 39 }, { n: "💨练气期·四层", max: 49 }, { n: "💨练气期·五层", max: 59 }, { n: "💨练气期·六层", max: 69 }, { n: "💨练气期·七层", max: 79 }, { n: "💨练气期·八层", max: 89 }, { n: "💨练气期·九层", max: 99 }, { n: "🏛️筑基期·初期", max: 149 }, { n: "🏛️筑基期·中期", max: 299 }, { n: "🏛️筑基期·后期", max: 599 }, { n: "🏛️筑基期·圆满", max: 999 }, { n: "💎结丹期·初期", max: 1999 }, { n: "💎结丹期·中期", max: 3499 }, { n: "💎结丹期·后期", max: 5999 }, { n: "💎结丹期·圆满", max: 9999 }, { n: "👶元婴期·初期", max: 19999 }, { n: "👶元婴期·中期", max: 34999 }, { n: "👶元婴期·后期", max: 59999 }, { n: "👶元婴期·圆满", max: 99999 }, { n: "✨化神期", max: 499999 }, { n: "🌌炼虚期", max: 999999 }, { n: "🔗合体期", max: 9999999 }, { n: "🌟大乘期", max: 99999999 }, { n: "👑真仙期", max: Infinity }];

        const getLv = (carrot) => {
            let min = 0;
            for (let l of levels) {
                if (carrot <= l.max) {
                    let ratio = l.max === Infinity ? 1 : (carrot - min) / (l.max - min + 1);
                    let bar = "■".repeat(Math.floor(ratio * 10)).padEnd(10, "□");
                    return { n: l.n, bar: bar, per: (ratio * 100).toFixed(1), next: l.max === Infinity ? 0 : l.max - carrot + 1 };
                }
                min = l.max + 1;
            }
        };

        const headers = { "Authorization": savedToken, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" };
        
        // 执行签到流程
        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, (err, resp, data) => {
            if (err) {
                console.log("emos: 请求失败 - " + err);
                $done();
                return;
            }
            try {
                const u = JSON.parse(data);
                const today = new Date().toISOString().split('T')[0];
                if (u.sign && u.sign.sign_at && u.sign.sign_at.includes(today)) {
                    const info = getLv(u.carrot);
                    $notification.post("emos 签到", "✨ 仙途长青", `境界: [${info.n}]\n修为: ${u.carrot} 🥕\n进度: [${info.bar}] ${info.per}%`);
                    $done();
                } else {
                    const content = (typeof $argument !== "undefined" && $argument.comment) ? $argument.comment : "签到,我要🥕";
                    const pool = content.split(/[,，]/);
                    const txt = pool[Math.floor(Math.random() * pool.length)].trim();
                    
                    $httpClient.put({ url: `https://emos.best/api/user/sign?content=${encodeURIComponent(txt)}`, headers: headers }, (sErr, sResp, sData) => {
                        const res = JSON.parse(sData);
                        const infoNow = getLv(u.carrot + (res.earn_point || 0));
                        $notification.post("emos 签到", "✅ 突破成功", `获得: +${res.earn_point} 🥕\n当前境界: ${infoNow.n}`);
                        $done();
                    });
                }
            } catch (e) {
                console.log("emos: 解析错误 - " + e);
                $done();
            }
        });
    }
}
