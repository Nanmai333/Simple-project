/**
 * emos 整合脚本 (Egern 最终版)
 * 1. 捕获 Token 并发送成功/重复通知
 * 2. 自动化签到并展示修仙境界
 */

var key = "emos_best_token";

// ================= 1. 获取参数逻辑 (Rewrite 触发) =================
if (typeof $request !== "undefined" && $request) {
    var auth = $request.headers["Authorization"] || $request.headers["authorization"];
    
    if (auth && auth.indexOf("Bearer") !== -1) {
        var newToken = auth.trim();
        var oldToken = $persistentStore.read(key);
        
        if (!oldToken || oldToken !== newToken) {
            $persistentStore.write(newToken, key);
            $notification.post("emos 签到", "✅ 新 Token 获取成功", "凭证已更新，开始修仙！");
        } else {
            // 确保即便 Token 重复也会弹窗提醒，确认脚本运行正常
            $notification.post("emos 签到", "ℹ️ 重复 Token 提醒", "凭证一致，无需重复操作。");
        }
    } else {
        // 如果没拿到 Token，在日志里记录原因，方便排查
        console.log("emos: 未发现有效的 Authorization 请求头");
    }
    $done({});
} 

// ================= 2. 自动化签到逻辑 (Cron 触发) =================
else {
    var levels = [
        { n: "👤凡人期", max: 9 }, { n: "💨练气期·一层", max: 19 }, { n: "💨练气期·二层", max: 29 },
        { n: "🏛️筑基期", max: 999 }, { n: "👑真仙期", max: Infinity }
    ];

    function getLv(c) {
        for (var i = 0; i < levels.length; i++) {
            if (c <= levels[i].max) return levels[i].n;
        }
        return "未知";
    }

    var savedToken = $persistentStore.read(key);
    if (!savedToken) {
        $notification.post("emos 签到", "❌ 失败", "未找到 Token，请先登录网页触发获取");
        $done();
    } else {
        var headers = { "Authorization": savedToken, "Content-Type": "application/json" };
        $httpClient.get({ url: "https://emos.best/api/user", headers: headers }, function(err, resp, data) {
            if (err) { $done(); return; }
            try {
                var uObj = JSON.parse(data);
                var today = new Date().toISOString().substring(0, 10);
                var isSigned = (uObj.sign && uObj.sign.sign_at && uObj.sign.sign_at.indexOf(today) !== -1);
                
                if (isSigned) {
                    $notification.post("emos 签到", "✨ 仙途长青", "当前境界: [" + getLv(uObj.carrot) + "]\n修为: " + uObj.carrot + " 🥕");
                    $done();
                } else {
                    $httpClient.put({ url: "https://emos.best/api/user/sign?content=" + encodeURIComponent("滴滴打卡"), headers: headers }, function(sErr, sResp, sData) {
                        var res = JSON.parse(sData);
                        $notification.post("emos 签到", "✅ 突破成功", "获得: +" + res.earn_point + " 🥕\n境界: " + getLv(uObj.carrot + res.earn_point));
                        $done();
                    });
                }
            } catch (e) { $done(); }
        });
    }
}
