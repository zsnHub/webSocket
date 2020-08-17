if (typeof console == "undefined") {
    this.console = { log: function (msg) { } };
}
// 如果浏览器不支持websocket，会使用这个flash自动模拟websocket协议，此过程对开发者透明
WEB_SOCKET_SWF_LOCATION = "./websocket/WebSocketMain.swf";
// 开启flash的websocket debug
WEB_SOCKET_DEBUG = true;

var ws;
var lockReconnect = false; //避免重复连接
var obj = {};
var timer;

//连接
function Connect() {
    if (lockReconnect) return;
    lockReconnect = true;

    $("input[type='button']").removeClass("active");

    ws = new WebSocket("ws://" + $("#ip").val() + ":" + $("#port").val());

    console.log(getNowFormatDate() + "    连接状态    " + ws.readyState);
    addmessage(getNowFormatDate() + "  连接状态  " + ws.readyState);

    ws.onopen = function () {
        console.log(getNowFormatDate() + "    连接状态    " + ws.readyState);
        addmessage(getNowFormatDate() + "  连接状态  " + ws.readyState);

        console.log(getNowFormatDate() + "    " + "建立连接");
        addmessage(getNowFormatDate() + "    " + "建立连接");
        //心跳检测重置
        heartCheck.reset().start();

        cls = 0;
        $(".Login").addClass("active");
        $("#close").removeAttr("disabled");
        $("#conn").attr("disabled", "disabled");
        $("#connmsg").text("");
        $("#msg").text("");
    };
    //接收到消息的回调方法
    ws.onmessage = function (evt) {
        //如果获取到消息，心跳检测重置
        //拿到任何消息都说明当前连接是正常的
        heartCheck.reset().start();

        console.log(getNowFormatDate() + "  receive  " + evt.data);
        addmessage(getNowFormatDate() + "  receive  " + evt.data);

        var data = JSON.parse(evt.data)[0];
        if (data) {
            var rlt = data.Result;
            if (rlt == true) {
                var type = data.Type;
                switch (type.toLowerCase()) {
                    //case "heart": HeartBack(); break;//心跳
                    case "login":
                        LoginBack();
                        break; //签入
                    case "logout":
                        LogoutBack();
                        break; //签出
                    case "dropcall":
                        DropCallBack();
                        break; //挂断
                    case "setstate":
                        SetState(data);
                        break; //置忙置闲
                    case "incoming":
                        IncomingBack(data);
                        break; //来电
                    case "subscribe":
                        SubScribeBack();
                        break; //监测
                    case "subscribecancel":
                        SubScribeCancelBack();
                        break; //停止监测
                    case "agentstate":
                        AgentStateBack(data);
                        break; //坐席状态
                    case "linestate":
                        LineStateBack(data);
                        break; //线路状态
                    case "motorsetstate":
                        SayFreeBack();
                        break; //班长置闲
                    case "linestateagent":
                        LineStateAgentBack(data);
                        break; //线路状态通知
                    case "agentstateagent":
                        AgentStateAgentBack(data);
                        break; //坐席状态通知
                    //case "callid":
                    //    CallIDBack(data);
                    //    break; //获取callid
                    //case "recordpath":
                    //    RecordPathBack(data);
                    //    break; //录音返回
                }
            } else {
                if (rlt == false) {
                    $("#msg").text('操作失败！');
                } else {
                    $("#msg").text(rlt);
                }
            }
        }
    };
    //连接关闭的回调方法
    ws.onclose = function (evt) {
        console.log(getNowFormatDate() + "    连接状态    " + ws.readyState);
        addmessage(getNowFormatDate() + "  连接状态  " + ws.readyState);

        $("#msg").text('连接关闭！');
        $("input[type='button']").removeClass("active");

        heartCheck.reset();
        $("#conn").removeAttr("disabled");
        $("#close").attr("disabled", "disabled");

        $("#start").attr("disabled", "disabled");
        $("#stop").attr("disabled", "disabled");

        console.log(getNowFormatDate() + "   连接关闭   " );
        addmessage(getNowFormatDate() + "   连接关闭   ");

        lockReconnect = false;
        clearInterval(timer);
    };
    //连接发生错误的回调方法
    ws.onerror = function (evt) {
        console.log(getNowFormatDate() + "    连接状态    " + ws.readyState);
        addmessage(getNowFormatDate() + "  连接状态  " + ws.readyState);

        //产生异常
        $("#msg").text('连接出现异常！');
        console.log(getNowFormatDate() + "    连接错误    " );
        addmessage(getNowFormatDate() + "  连接错误  " );

        lockReconnect = false;
        clearInterval(timer);
    };
}

//发送
function Send() {
    if (ws.readyState != ws.OPEN) {
        Connect();
    }
    if (ws.readyState == ws.OPEN) {
        console.log(getNowFormatDate() + "  send  " + JSON.stringify(obj));
        addmessage(getNowFormatDate() + "  send  " + JSON.stringify(obj));

        ws.send(JSON.stringify(obj));
    }
}
//心跳检测
var heartCheck = {
    timeout: 25000, //25秒
    timeoutObj: null,
    serverTimeoutObj: null,
    reset: function () {
        clearTimeout(this.timeoutObj);
        clearTimeout(this.serverTimeoutObj);
        return this;
    },
    start: function () {
        var self = this;
        this.timeoutObj = setTimeout(function () {
            //这里发送一个心跳，后端收到后，返回一个心跳消息，
            //onmessage拿到返回的心跳就说明连接正常
            obj.Type = "Heart";
            Send();
            self.serverTimeoutObj = setTimeout(function () { //如果超过一定时间还没重置，说明后端主动断开了
                ws.close(); //如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
            }, self.timeout)
        }, this.timeout)
    }
}

//签入
function LoginBack() {
    $("input[type='button']").removeClass("active");
    $(".Logout").addClass("active");
    $(".SayBusy").addClass("active");
    $("#start").removeAttr("disabled");
    $("#stop").attr("disabled", "disabled");
    $("#msg").text('');
}
//签出
function LogoutBack() {
    $("input[type='button']").removeClass("active");
    $(".Login").addClass("active");
    //$("#msg").text('');

    $(".bzbtn").attr("disabled", "disabled");
    $("#stop").attr("disabled", "disabled");
    $("#start").attr("disabled", "disabled");
}
//来电
function IncomingBack(data) {

}
//挂断
function DropCallBack() {
    $("input[type='button']").removeClass("active");
    $(".Logout").addClass("active");
    $(".SayBusy").addClass("active");
}
//线路状态通知
function LineStateAgentBack(data) {
    $("#msg").text(GetStateName(data.AgentState, data.State));
}
//坐席状态通知
function AgentStateAgentBack(data) {
    $("#msg").text(GetStateName(data.AgentState, data.State));
}
//置忙置闲
function SetState(obj) {
    
}
//置忙
function SayBusyBack() {
    $(".SayBusy").removeClass("active");
    $(".SayFree").addClass("active");
}
//置闲
function SayFreeBack() {
    $(".SayBusy").addClass("active");
    $(".SayFree").removeClass("active");
}
//监测
function SubScribeBack() {
    $("#stop").removeAttr("disabled");
    $("#start").attr("disabled", "disabled");
}
//取消监测
function SubScribeCancelBack() {
    clearInterval(timer);

    $("#start").removeAttr("disabled");
    $("#stop").attr("disabled", "disabled");
}
//班长监测返回状态
//坐席状态
function AgentStateBack(data) {
    var sts = GetAgentState(data.State);
    if (data.State == '2') {
        sts = GetLineState(data.ExtenState);
    }
    var agentobjs = $("." + data.AgentID + "state");
    if (agentobjs.length > 0) {
        var agentobj = $(agentobjs[0]);
        agentobj.text(sts);
        agentobj.parent().attr("zx_item", data.State); 
        agentobj.parent().attr("xl_item", data.ExtenState); 

        if (data.AgentID == obj.TargetAgentID) {
            UpdateSelState(data.AgentID, data.State, data.ExtenState);
        }
    }
    $("." + data.AgentID + "time").addClass("sj");
    $("." + data.AgentID + "time").attr("num", "0");
    $("." + data.AgentID + "time").text("00:00:00");
    $("." + data.AgentID + "extno").text(data.ExtenID);
    if (data.Caller && data.Callee) {
        $("." + data.AgentID + "callinnum").text(data.Caller);
        $("." + data.AgentID + "calloutnum").text(data.Callee);
    }
}
//线路状态
function LineStateBack(data) {
    var sts = GetLineState(data.State);

    var agentobjs = $("." + data.AgentID + "state");
    if (agentobjs.length > 0) {
        var agentobj = $(agentobjs[0]);
        agentobj.text(sts);
        agentobj.parent().attr("xl_item", data.State);

        if (data.AgentID == obj.TargetAgentID) {
            UpdateSelState(data.AgentID, agentobj.parent().attr("zx_item"), data.State );
        }
    }
}
//录音返回
function RecordPathBack(data) {Caller

}
//坐席状态
function GetAgentState(state) {
    var strr = '';
    switch (state + "") {
        case "0":
            strr = "离线";
            break; //离线
        case "1":
            strr = "登录中";
            break; //登录中
        case "2":
            strr = "空闲";
            break; //空闲
        case "3":
            strr = "通话中";
            break; //通话中
        case "4":
            strr = "话后处理中";
            break; //话后处理中
        case "5":
            strr = "忙碌";
            break; //小休
        case "6":
            strr = "振铃";
            break; //被请求
        case "7":
            strr = "注销";
            break; //注销
    }
    return strr;
}
//线路状态
function GetLineState(state) {
    var strr = '';
    switch (state + "") {
        case "0":
            strr = "分机不可用";
            break; //分机不可用
        case "1":
            strr = "空闲";
            break; //空闲
        case "2":
            strr = "摘机等待拨号";
            break; //摘机等待拨号
        case "3":
            strr = "正在拨号";
            break; //正在拨号
        case "4":
            strr = "呼出振铃";
            break; //呼出振铃
        case "5":
            strr = "来电振铃";
            break; //来电振铃
        case "6":
            strr = "通话中";
            break; //通话中
        case "7":
            strr = "播放忙音中";
            break; //播放忙音中
        case "8":
            strr = "移除IP分机";
            break; //移除IP分机
        case "9":
            strr = "通话保持中";
            break; //通话保持中
    }
    return strr;
}
//获取状态
function GetStateName(agentstate, linestate) {
    if (linestate == '1') {
        $("input[type='button']").removeClass("active");
        $(".Logout").addClass("active");
        $(".SayBusy").addClass("active");
        $(".MakeCall").addClass("active");
    }
    if (linestate == '6') {
        $("input[type='button']").removeClass("active");
        $(".DropCall").addClass("active");
    }
    if (agentstate == '5') {
        $(".SayBusy").removeClass("active");
        $(".SayFree").addClass("active");
    }
    if (agentstate == '2') {
        $(".SayBusy").addClass("active");
        $(".SayFree").removeClass("active");
        return GetLineState(linestate);
    }
    else {
        return GetAgentState(agentstate);
    }
}

//班长坐席操作按钮
function UpdateSelState(usercode,zxState, xlState) {
    $(".bzbtn").attr("disabled", "disabled");
    if (usercode != obj.AgentID) {
        if (zxState == '5' && xlState == '1') {
            $("#ForceAgentState").removeAttr("disabled");
        }
        if (zxState == '3' && xlState == '6') {
            $("#Listen").removeAttr("disabled");
            $("#Insert").removeAttr("disabled");
            $("#Intercept").removeAttr("disabled");
            $("#Break").removeAttr("disabled");
        }
        if (zxState == '2' && xlState == '5') {
            $("#Instead").removeAttr("disabled");
        }
    }
}

//关闭连接
function closeWebSocket() {
    if (ws.readyState == ws.OPEN) {
        //obj.Type = 'Logout';
        //Send();
        ws.onclose();
    }
}
//新增记录
function addmessage(msg) {
    $("<p class='log'>" + msg + "</p>").insertBefore($("#cont p:first"));
    $("#content").val($("#content").val() + "\n" + msg);
}

//获取当前的日期时间 格式“yyyy-MM-dd HH:mm:ss”
function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    if (hour >= 1 && hour <= 9) {
        hour = "0" + hour;
    }
    if (minute >= 0 && minute <= 9) {
        minute = "0" + minute;
    }
    if (second >= 0 && second <= 9) {
        second = "0" + second;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate +
        " " + hour + seperator2 + minute +
        seperator2 + second;
    return currentdate;
}

function addsj() {
    $(".sj").each(function (i, n) {
        var num = $(n).attr("num");
        if (!num) { num = "0"; }
        num = num * 1 + 1;
        $(n).attr("num", num);

        var h = parseInt(num / 60 / 60);
        h = h < 10 ? "0" + h : "" + h;
        var m = parseInt(num / 60 % 60);
        m = m < 10 ? "0" + m : "" + m;
        var s = parseInt(num % 60);
        s = s < 10 ? "0" + s : "" + s;
        $(this).text(h + ":" + m + ":" + s);
    })
}

$(document).ready(function () {
    if (!window.WebSocket) {
        alert("此浏览器不支持");
    }

    $("#conn").click(function () {
        if ($("#ip").val() && $("#port").val()) {
            if (lockReconnect) return;
            Connect();
        }
        else {
            $("#connmsg").text("请输入ip和端口");
        }
    })
    $("#close").click(function () {
        closeWebSocket();
    })

    $("#start").click(function () {
        $("tbody").empty();
        for (var i = 8001; i <= 8020; i++) {
            var html = '<tr dataid="' + i + '" zx_item="0" xl_item="0">'
                + '<td class="' + i + 'state" ></td>' //状态
                + '<td class="' + i + 'time" ></td>' //时间
                + '<td>' + i + '</td>' //工号
                + '<td class="' + i + 'extno"></td>' //分机号
                + '<td class="' + i + 'callinnum"></td>' //主叫号码
                + '<td class="' + i + 'calloutnum"></td>' //被叫号码
                + '</tr>';
            $(html).appendTo($("tbody")).click(function () {
                $(this).parent().find("tr").removeClass("tractive");
                $(this).addClass("tractive");

                var usercode = $(this).attr("dataid");
                var zxstate = $(this).attr("zx_item");
                var xlstate = $(this).attr("xl_item");
                obj.TargetAgentID = usercode;
                UpdateSelState(usercode, zxstate, xlstate);
            });

            obj.Type = "SubScribe";
            obj.SubParmer = i;
            obj.SubType = "0"; //根据工号订阅坐席状态
            Send();
            //obj.SubType = "1"; //根据工号订阅线路状态
            //Send();
        }
        clearInterval(timer);
        timer = setInterval("addsj()", 1000);
    })
    $("#stop").click(function () {
        obj.Type = "SubScribeCancel";
        obj.SubParmer = "-1";
        obj.SubType = "0"; //根据工号取消订阅坐席状态
        Send();
        //obj.SubType = "1"; //根据工号取消订阅线路状态
        //Send();
    })

    $("input[type='button']").click(function () {
        if ($(this).hasClass("active")) {
            var fun = $(this).attr("datafun");
            obj.Type = fun;
            switch (fun) {
                case "Login":
                    if ($("#usercode").val() && $("#extno").val()) {
                        obj.AgentID = $("#usercode").val();
                        obj.AgentExten = $("#extno").val();
                        obj.AgentGroup = "364";
                        obj.AgentType = "0";
                        Send();
                    }
                    else {
                        $("#msg").text("请输入工号和分机");
                    }
                    break; //签入
                default:
                    Send();
                    break;

            }
        }
    });

    $(".bzbtn").click(function () {
        var fun = $(this).attr("datafun");
        obj.Type = fun;
        Send();
    })

    $("#copy").click(function () {
        var e = document.getElementById("content");
        e.select();
        document.execCommand("Copy", "false", null);
    })

    $("#clear").click(function () {
        $(".log").remove();
        $("#content").val("");
    })
})

