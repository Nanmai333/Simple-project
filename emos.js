/**
 * emos 整合脚本 (Egern 规范版)
 * 1. 捕获 Token (引用自 emos获取参数.js)
 * 2. 自动化签到 (引用自 emos签到.js，严格保留原始境界)
 */

const key = "emos_best_token";

// ================= 1. 获取参数逻辑 (Rewrite) =================
if (typeof $request !== "undefined" && $request) {
    const auth = $request.headers["Authorization"] || $request.headers["authorization"];
    
    if (auth && auth.indexOf("Bearer") !== -1) {
        const newToken = auth.trim();
        const oldToken = $persistentStore.read(key);
        
        if (!oldToken || oldToken !== newToken) {
            $persistentStore.write(newToken, key);
            // 严格执行原始通知文案
            $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
        } else {
            // 严格执行原始通知文案
            $notification.post("emos 签到", "ℹ️ 重复 Token 提醒", "凭证一致，无需重复操作。");
        }
    }
    $done({});
} 

// ================= 2. 自动化签到逻辑 (Cron) =================
else {
    const savedToken = $persistentStore.read(key);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录网页触发获取");
        $done();
    } else {
        // --- 严格保留您原始脚本的境界体系，不做任何修改 ---
        const levels = [{ n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 }, { n: "💨练气期·三层", max: 39 }, { n: "💨练气期·四层", max: 49 }, { n: "💨练气期·五层", max: 59 }, { n: "💨练气期·六层", max: 69 }, { n: "💨练气期·七层", max: 79 }, { n: "💨练气期·八层", max: 89 }, { n: "💨练气期·九层", max: 99 }, { n: "🏛️筑基期·初期", max: 149 }, { n: "🏛️筑基期·中期", max: 299 }, { n: "🏛️筑基期·后期", max: 599 }, { n: "🏛️筑基期·圆满", max: 999 }, { n: "💎结丹期·初期", max: 1999 }, { n: "💎结丹期·中期", max: 3499 }, { n: "💎结丹期·后期", max: 5999 }, { n: "💎结丹期·圆满", max: 9999 }, { n: "👶元婴期·初期", max: 19999 }, { n: "👶元婴期·中期", max: 34999 }, { n: "👶元婴期·后期", max: 59999 }, { n: "👶元婴期·圆满", max: 99999 }, { n: "✨化神期", max: 499999 }, { n: "🌌炼虚期", max: 999999 }, { n: "🔗合体期", max: 9999999 }, { n: "🌟大乘期", max: 99999999 }, { n: "👑真仙期", max: Infinity }];

        const getLv = (c) => {
            let min = 0;
            for (let l of levels) {
                if (c <= l.max) {
                    let ratio = l.max === Infinity ? 1 : (c - min) / (l.max - min + 1);
                    let bar = "■".repeat(Math.floor(ratio * 10)).padEnd(10, "□");
                    return { n: l.n, bar: bar, per: (ratio * 100).toFixed(1) };
                }
                min = l.max + 1;
            }
        };

        const headers = { "Authorization": savedToken, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" };
        
        // 使用 Egern $httpClient API
        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, (err, resp, data) => {
            if (err) { $done(); return; }
            try {
                const uObj = JSON.parse(data);
                const today = new Date().toISOString().substring(0, 10);
                const isSigned = (uObj.sign && uObj.sign.sign_at && uObj.sign.sign_at.indexOf(today) !== -1);
                
                if (isSigned) {
                    const lv = getLv(uObj.carrot);
                    $notification.post("emos 签到", "✨ 仙途长青", `境界: [${lv.n}]\n修为: ${uObj.carrot} 🥕\n进度: [${lv.bar}] ${lv.per}%`);
                    $done();
                } else {
                    $httpClient.put({ 
                        url: "https://emos.best/api/user/sign?content=" + encodeURIComponent("滴滴打卡"), 
                        headers: headers 
                    }, (sErr, sResp, sData) => {
                        const res = JSON.parse(sData);
                        const lvNow = getLv(uObj.carrot + (res.earn_point || 0));
                        $notification.post("emos 签到", "✅ 突破成功", `获得: +${res.earn_point || 0} 🥕\n当前境界: ${lvNow.n}`);
                        $done();
                    });
                }
            } catch (e) { $done(); }
        });
    }
}
