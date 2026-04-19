/**
 * emos 整合脚本 (Egern 最终版)
 * 功能：1. 访问网页自动捕获 Token (带通知)
 * 2. 定时自动签到并展示修仙境界
 */

const key = "emos_best_token";

// ================= 1. Token 捕获逻辑 (重写模式触发) =================
if (typeof $request !== "undefined") {
    const auth = $request.headers["Authorization"] || $request.headers["authorization"];
    if (auth && auth.indexOf("Bearer") !== -1) {
        const newToken = auth.trim();
        const oldToken = $persistentStore.read(key);
        
        // 只要执行到这里，就强制弹出一个通知，告知用户脚本正在工作
        if (!oldToken || oldToken !== newToken) {
            $persistentStore.write(newToken, key);
            $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
        } else {
            // 即使 Token 没变也弹窗提醒，方便您确认脚本生效
            $notification.post("emos 签到", "ℹ️ 凭证有效", "Token 检查完毕，无需重复更新。");
        }
    }
    $done({});
} 

// ================= 2. 自动签到逻辑 (定时任务模式触发) =================
else {
    const savedToken = $persistentStore.read(key);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录网页捕获");
        $done();
    } else {
        // 修仙境界定义
        const levels = [
            { n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 },
            { n: "💨练气期·三层", max: 39 }, { n: "💨练气期·四层", max: 49 }, { n: "💨练气期·五层", max: 59 },
            { n: "💨练气期·六层", max: 69 }, { n: "💨练气期·七层", max: 79 }, { n: "💨练气期·八层", max: 89 },
            { n: "💨练气期·九层", max: 99 }, { n: "🏛️筑基期·初期", max: 149 }, { n: "🏛️筑基期·中期", max: 299 },
            { n: "🏛️筑基期·后期", max: 599 }, { n: "🏛️筑基期·圆满", max: 999 }, { n: "💎结丹期·初期", max: 1999 },
            { n: "💎结丹期·中期", max: 3499 }, { n: "💎结丹期·后期", max: 5999 }, { n: "💎结丹期·圆满", max: 9999 },
            { n: "👶元婴期·初期", max: 19999 }, { n: "👶元婴期·中期", max: 34999 }, { n: "👶元婴期·后期", max: 59999 },
            { n: "👶元婴期·圆满", max: 99999 }, { n: "✨化神期", max: 499999 }, { n: "🌌炼虚期", max: 999999 },
            { n: "🔗合体期", max: 9999999 }, { n: "🌟大乘期", max: 99999999 }, { n: "👑真仙期", max: Infinity }
        ];

        const getCultivationInfo = (carrot) => {
            let min = 0;
            for (let l of levels) {
                if (carrot <= l.max) {
                    let nextNeed = l.max === Infinity ? 0 : l.max - carrot + 1;
                    let ratio = l.max === Infinity ? 1 : (carrot - min) / (l.max - min + 1);
                    let bar = "■".repeat(Math.floor(ratio * 10)).padEnd(10, "□");
                    return { name: l.n, bar: bar, percent: (ratio * 100).toFixed(1), nextNeed: nextNeed };
                }
                min = l.max + 1;
            }
        };

        const headers = {
            "Authorization": savedToken,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)"
        };

        // 获取状态并签到
        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, function(err, resp, data) {
            if (err) { $done(); return; }
            try {
                const uObj = JSON.parse(data);
                const today = new Date().toISOString().substring(0, 10);
                const isSignedToday = (uObj.sign && uObj.sign.sign_at && uObj.sign.sign_at.indexOf(today) !== -1);

                if (isSignedToday) {
                    const lv = getCultivationInfo(uObj.carrot);
                    $notification.post("emos 签到", "✨ 仙途长青", `境界: [${lv.name}]\n修为: ${uObj.carrot} 🥕\n进度: [${lv.bar}] ${lv.percent}%`);
                    $done();
                } else {
                    const comment = (typeof $argument !== "undefined" && $argument.comment) ? $argument.comment : "签到,我要🥕";
                    $httpClient.put({
                        url: "https://emos.best/api/user/sign?content=" + encodeURIComponent(comment),
                        headers: headers
                    }, function(sErr, sResp, sData) {
                        const res = JSON.parse(sData);
                        const lvNow = getCultivationInfo(uObj.carrot + (res.earn_point || 0));
                        $notification.post("emos 签到", "✅ 突破成功", `获得: +${res.earn_point} 🥕\n当前境界: ${lvNow.name}`);
                        $done();
                    });
                }
            } catch (e) { $done(); }
        });
    }
}
