/*
今日头条极速版
IOS/安卓: 今日头条极速版
普通版定时： 1-59/15 6-23 * * *
激进版定时： 1-59/5 * * * *
多用户跑的时间会久一点，自己看着改定时吧
自定义UA：捉包拿到自己的UA，填到变量jrttjsbUA里，不填默认用安卓UA
自定义每次运行阅读文章的数量：填到变量jrttjsbReadNum，不填默认10篇
农场和种树任务：默认做，变量jrttjsbFarm填为 1 做 0 不做
感谢原作者提供的脚本 https://raw.githubusercontent.com/my51/jb/main/jrttjsb.js
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
============Quantumultx===============
[task_local]
#今日头条极速版
1-59/15 6-23 * * * https://raw.githubusercontent.com/my51/jb/main/jrttjsb.js, tag=今日头条极速版, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxcfd.png, enabled=true

================Loon==============
[Script]
cron "1-59/15 6-23 * * *" script-path=https://raw.githubusercontent.com/my51/jb/main/jrttjsb.js,tag=今日头条极速版

===============Surge=================
今日头条极速版 = type=cron,cronexp="1-59/15 6-23 * * *",wake-system=1,timeout=3600,script-path=https://raw.githubusercontent.com/my51/jb/main/jrttjsb.js

============小火箭=========
今日头条极速版 = type=cron,script-path=https://raw.githubusercontent.com/my51/jb/main/jrttjsb.js, cronexpr="1-59/15 6-23 * * *", timeout=3600, enable=true
*/
const $ = new Env('今日头条极速版');
const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const logDebug = 0
//const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = ''
let rndtime = "" //毫秒
let httpResult //global buffer
let host = 'i.snssdk.com'
let hostname = 'https://' + host
let userAgent = ($.isNode() ? process.env.jrttjsbUA : $.getdata('jrttjsbUA')) || 'Dalvik/2.1.0 (Linux; U; Android 10; Mi 10 MIUI/V11.0.25.0.QJBCNXM) NewsArticle/8.7.6 cronet/TTNetVersion:f2a033a5 2021-11-02 QuicVersion:705d0b81 2021-08-12';
let userAgentArr = []
let userHeader = ($.isNode() ? process.env.jrttjsbHeader : $.getdata('jrttjsbHeader')) || '';
let userHeaderArr = []
let jrttjsbFarm = ($.isNode() ? process.env.jrttjsbFarm : $.getdata('jrttjsbFarm')) || 0;

let userIdx = 0
let UAcount = 0
let userStatus = []
let maxReadPerRun = ($.isNode() ? process.env.jrttjsbReadNum : $.getdata('jrttjsbReadNum')) || 0;
let readList = []

let validList = []
let adIdList = [26, 181, 186, 187, 188, 189, 190, 195, 210, 214, 216, 225, 308, 324, 327, 329]

///////////////////////////////////////////////////////////////////

!(async () => {

    if(typeof $request !== "undefined")
    {
        await GetRewrite()
    }
    else
    {
        await showUpdateMsg()

        if(!(await checkEnv())) {
            return
        }

        await initAccountInfo()
        await RunMultiUser()
    }


})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())

function showUpdateMsg() {
    console.log('\n2023.02.05 5:30 更新：增加推送奖励，修复一个UA的bug，更改默认UA为安卓\n')
}

//通知
async function showmsg() {

    notifyBody = $.name + "运行通知\n\n" + notifyStr

    if (notifyFlag != 1) {
        console.log(notifyBody);
    }

    if (notifyFlag == 1) {
        $.msg(notifyBody);
        //if ($.isNode()){await notify.sendNotify($.name, notifyBody );}
    }
}

async function GetRewrite() {
    if($request.url.indexOf('luckycat/lite/v1/task/page_data') > -1) {
        let userCK = $request.headers.Cookie

        if(userHeader) {
            if(userHeader.indexOf(userCK) == -1) {
                userHeader = userHeader + '@' + userCK
                $.setdata(userHeader, 'jrttjsbHeader');
                ckList = userHeader.split('@')
                $.msg($.name+` 获取第${ckList.length}个jrttjsbHeader成功: ${userCK}`)
            }
        } else {
            $.setdata(userCK, 'jrttjsbHeader');
            $.msg($.name+` 获取第1个jrttjsbHeader成功: ${userCK}`)
        }
    }
}

async function checkEnv() {
    if(userHeader) {
        userHeaderArr = userHeader.split('@')
    } else {
        console.log('未找到jrttjsbHeader')
        return false
    }
    if(userHeaderArr.length == 0) {
        console.log('未找到有效的jrttjsbHeader')
        return false
    }

    if(userAgent) {
        userAgentArr = userAgent.split('@')
    } else {
        console.log('未找到userAgent')
        return false
    }
    UAcount = userAgentArr.length

    console.log(`共找到${userHeaderArr.length}个用户，${UAcount}个UA`)
    return true
}

async function initAccountInfo() {
    for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
        userStatus.push(true)
    }
}

async function RunMultiUser() {
    for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
        //任务页
        await QueryUserInfo(1)
        if(userStatus[userIdx]==true) {
            //await GetNewTabs()
            await QuerySleepStatus()
            //await QueryWalkInfo()
            //await DoneEat()

            for(let adId of adIdList) await ExcitationAd(adId)
            //console.log(validList)

        }
    }

    //await ReadArticles()

    for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
        if(userStatus[userIdx]==true) await QueryUserInfo(0)
    }

    if(jrttjsbFarm) {
        for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
            if(userStatus[userIdx]==true) {
                //农场
                //await EnterFarm()
                //await $.wait(1500)
                //await QueryFarmThreeGift()
                //await QueryFarmInfo()
                //await QueryFarmLandStatus()
                //await QueryFarmSignStatus()
                //await QueryFarmTask()

                //种树
                await QueryTreeChallenge()
                await QueryTreeSignStatus()
                await QueryTreeThreeGift()
                await QueryTreeWaterTask()
                await QueryTreeStatus()
            }
        }
    }

}

//阅读列表
async function ListArts() {
    let caller = printCaller()
    let url = `${hostname}/api/news/feed/v47/?last_ad_show_interval=-1&cached_item_num=0&ad_ui_style=%7B%22van_package%22%3A1%7D&concern_id=6286225228934679042&refer=1&session_refresh_idx=1&refresh_reason=1&count=20&min_behot_time=1650319183&last_refresh_sub_entrance_interval=1650393788&cp=67245ef2082bcq1&plugin_enable=4&tt_from=pull&client_extra_params=%7B%22ad_download%22%3A%7B%7D%2C%22last_ad_position%22%3A-1%2C%22playparam%22%3A%22codec_type%3A7%2Cresolution%3A1080*2120%2Cttm_version%3A875000%2Ccdn_type%3A6%2Cenable_dash%3A0%2Cunwatermark%3A1%22%2C%22access_token%22%3A%22%22%2C%22sec_uid%22%3A%22%22%2C%22recommend_enable%22%3A1%7D&os=android&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&abflag=3&_rticket=1650393788053&sa_enable=0&dq_param=1&plugin_state=139681997156381&isTTWebView=1&session_id=4ee8e1f9-562f-4353-aaa7-732dbc4c7e9a&host_abi=arm64-v8a&`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.message=='success') {
        for(let item of result.data) {
            let content = JSON.parse(item.content)
            if(content.group_id) {
                readList.push(content.group_id)
            }
        }
    } else {
        console.log(`获取阅读列表失败：${result.message}`)
    }
}

//阅读文章
async function ReadArticles() {
    console.log(`\n开始阅读，将会阅读${maxReadPerRun}篇文章`)
    for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
        if(userStatus[userIdx]==true) {
            await ReadDouble()
            await DailyArtsReward()
            await DailyPushReward()
        }
    }
    for(let i=0; i<maxReadPerRun; i++) {
        let readFlag = 0
        for(userIdx=0; userIdx<userHeaderArr.length; userIdx++) {
            if(userStatus[userIdx]==true) {
                await ReadArtsReward()
                readFlag = 1
            }
        }
        if(readFlag ==1 && i<maxReadPerRun-1) {
            console.log('等待15秒阅读下一篇...')
            await $.wait(15100)
        }
    }
}

//阅读文章奖励
async function ReadArtsReward() {
    let caller = printCaller()
    let rndGroupId = Math.floor(Math.random()*7000000000000000000)
    let url = `${hostname}/luckycat/lite/v1/activity/done_whole_scene_task/?pass_through=default&is_pad=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&act_hash=dedbaf4265335985d5667d77ca98f8d9&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&iid=1341841701869182&device_id=720870999070232&ac=wifi&channel=lite_xiaomi_64&aid=35&app_name=news_article_lite&version_code=876&version_name=8.7.6&device_platform=android&os=android&ab_version=668903%2C3937392%2C668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&ab_group=z2&ab_feature=z1&abflag=3&ssmix=a&device_type=Mi+10&device_brand=Xiaomi&language=zh&os_api=29&os_version=10&manifest_version_code=8760&resolution=1080*2120&dpi=440&update_version_code=87610&_rticket=1650399345183&sa_enable=0&dq_param=1&plugin_state=139681997156381&isTTWebView=1&session_id=b8c0f277-2613-4326-80b9-f52e858ca64f&host_abi=arm64-v8a&tma_jssdk_version=2.8.0.16&rom_version=miui_v11_v11.0.25.0.qjbcnxm&cdid=027d4278-d6cf-4217-974b-2647a9791411&polaris_version=1.0.5&status_bar_height=32`
    let body = `{"is_golden_egg":false,"scene_key":"article_detail","group_id":"${rndGroupId}"}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        console.log(`用户${userIdx+1}阅读文章获得${result.data.score_amount}金币，今日阅读总收入：${result.data.total_score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}阅读文章失败：${result.err_tips}`)
    }
}

//每日阅读奖励
async function DailyArtsReward() {
    let caller = printCaller()
    let rndGroupId = Math.floor(Math.random()*7000000000000000000)
    let url = `${hostname}/score_task/v1/task/get_read_bonus/?aid=35&update_version_code=87610&os_version=10&device_platform=android&group_id=${rndGroupId}`
    let urlObject = populatePostUrl(url)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        console.log(`用户${userIdx+1}领取每日阅读奖励获得${result.data.score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}领取每日阅读奖励失败：${result.err_tips}`)
    }
}

//每日推送奖励
async function DailyPushReward() {
    let caller = printCaller()
    let timeInMS = Math.round(new Date().getTime())
    let rndGroupId = Math.floor(Math.random()*7000000000000000000)
    let url = `${hostname}/score_task/v1/task/get_read_bonus/?aid=35&update_version_code=87610&os_version=10&device_platform=android&group_id=${rndGroupId}&impression_type=push`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        console.log(`用户${userIdx+1}领取每日推送奖励获得${result.data.score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}领取每日推送奖励失败：${result.err_tips}`)
    }
}

//阅读翻倍
async function ReadDouble() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/activity/double_whole_scene_task/?aid=35&update_version_code=87610&os_version=10&device_platform=android`
    let body = `{}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        console.log(`用户${userIdx+1}阅读翻倍成功`)
    } else {
        console.log(`用户${userIdx+1}阅读翻倍：${result.err_tips}`)
    }
}

async function GetNewTabs() {
    let caller = printCaller()
    let url = `${hostname}/score_task/v1/user/new_tabs/?aid=35&update_version_code=87610&os_version=10&device_platform=android&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        for(let item of result.data.section) {
            if(item.key == 'mine_input_code') {
                await PostInviteCode()
                break
            }
        }
    }
}

async function PostInviteCode() {
    let caller = printCaller()
    let body = `{"invitecode" : "1173836876"}`
    let url = `${hostname}/luckycat/lite/v1/invite/post_invite_code/?aid=35&update_version_code=87610&os_version=10&device_platform=android&device_type=Mi+10`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
}

//金币收入
async function QueryCoinInfo() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/user/profit_detail/?offset=0&num=100&income_type=2&aid=`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(result.data.score_income_list)
    } else {
        console.log(`用户${userIdx+1}查询金币收入失败：${result.err_tips}`)
    }
}

//查询用户信息,任务状态
async function QueryUserInfo(doTask) {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/task/page_data/?pass_through=default&is_pad=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&act_hash=dedbaf4265335985d5667d77ca98f8d9&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&iid=1341841701869182&device_id=720870999070232&ac=wifi&channel=lite_xiaomi_64&aid=35&app_name=news_article_lite&version_code=876&version_name=8.7.6&device_platform=android&os=android&ab_version=668903%2C3937392%2C668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&ab_group=z2&ab_feature=z1&abflag=3&ssmix=a&device_type=Mi+10&device_brand=Xiaomi&language=zh&os_api=29&os_version=10&manifest_version_code=8760&resolution=1080*2120&dpi=440&update_version_code=87610&_rticket=1650399349680&sa_enable=0&dq_param=1&plugin_state=139681997156381&isTTWebView=1&session_id=b8c0f277-2613-4326-80b9-f52e858ca64f&host_abi=arm64-v8a&tma_jssdk_version=2.8.0.16&rom_version=miui_v11_v11.0.25.0.qjbcnxm&cdid=027d4278-d6cf-4217-974b-2647a9791411&polaris_version=1.0.5&status_bar_height=32&luckydog_base=L-Qs4_NsyjW98aRJyI10ipWoEeB-zVYalDVrBOR55JJJyBu7V-9t6Rs65lEoO76T9pCEaZGTk_UQ8-SlGi9Na2iUbjhGH0cr7OZ6daTUYfAcMYIOpPhMIu9ay8WRbqfbr2oFVkvds-OmN7UIdy6xg8rOAE0h1Fv_ojfvKzYSWYA&luckydog_data=pLpRmOMroS6Yruu34epx1q95m9AFI3O76Gq2bItg2GeD7Udv6q-5GvE9whReXRAXP0RKgjXP2Fh8jQ_4HPFFcw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        if(!result.data.treasure) {
            userStatus[userIdx] = false
            console.log(`用户${userIdx+1}查询状态失败，CK失效`)
            return;
        }
        if(doTask==0) {
            console.log(`\n账户信息：`)
            console.log(`金币：${result.data.user_income.score_balance}`)
            console.log(`现金：${result.data.user_income.cash_balance/100}元`)
        } else {
            if(result.data.treasure.next_treasure_time == result.data.treasure.current_time) {
                await OpenTreasureBox()
            } else {
                let cdTime = result.data.treasure.next_treasure_time - result.data.treasure.current_time
                console.log(`用户${userIdx+1}开宝箱冷却时间还有${cdTime}秒`)
            }
            if(result.data.signin_detail.today_signed == false) {
                await SignIn()
            } else {
                console.log(`用户${userIdx+1}今天已签到`)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询状态失败：${result.err_tips}`)
    }
}

//签到
async function SignIn() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/sign_in/action?manifest_version_code=8760&_rticket=1650476200251&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&iid=1341841701869182&channel=lite_xiaomi_64&isTTWebView=1&use_ecpm=0&device_type=Mi+10&language=zh&host_abi=arm64-v8a&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&is_pad=0&update_version_code=87610&dq_param=1&status_bar_height=32&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&os_api=29&abflag=3&rit=coin&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&os=android&pass_through=default&os_version=10&version_code=876&session_id=185f8bdb-8a95-4aa2-834b-e4274d7eeb26&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&ab_version=668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C3801462%2C3520490%2C3540012%2C3596061%2C3958946&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&plugin_state=139681997156381&device_platform=android&polaris_version=1.0.5&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&luckydog_base=qG0Sn8Nue65F3MxBkjB-EW7ni81H0J7NsN9QTN3x8FPllOV7mkXvfYtRAsDKMsI4WxPjyb44eb4iLTTLbXOAUohY2Zv9dI1QXtS79j_GdEBHSVv8mxCtG-mD_aUrc7Ftfw0v7Gu4lt7gnQ1BIw_42k3F1E60Q8jD7LGzqHWDFvs&luckydog_data=H_tviv5pCkhGYVzM3xlqO-Udh13I_v0l41nYVB9-BphzihqsXlF_Yilb89peZOinnXtS62jAYvu2gmlGWJjS6_Wg621ASMl_2tcKLhns2aw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let urlObject = populatePostUrl(url)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no==0) {
        console.log(`用户${userIdx+1}签到成功，获得${result.data.score_amount}金币，已连续签到${result.data.sign_times}天`)
    } else {
        console.log(`用户${userIdx+1}签到失败：${result.err_tips}`)
    }
}

//开宝箱
async function OpenTreasureBox() {
    let caller = printCaller()
    let timeInMS = Math.round(new Date().getTime())
    let url = `${hostname}/score_task/v1/task/open_treasure_box/?manifest_version_code=8760&_rticket=1650401271010&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&iid=1341841701869182&channel=lite_xiaomi_64&isTTWebView=1&use_ecpm=0&device_type=Mi+10&language=zh&host_abi=arm64-v8a&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&is_pad=0&update_version_code=87610&dq_param=1&status_bar_height=32&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&os_api=29&abflag=3&rit=coin&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&os=android&pass_through=default&os_version=10&version_code=876&session_id=3e9059c3-8d3d-420c-8f25-0f689be67c73&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&ab_version=668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&plugin_state=139681997156381&device_platform=android&polaris_version=1.0.5&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&luckydog_base=zEN9QCnx8bXqQPwrxQYlouK9T33yztCGBlg4kp3VEuZF061lMOdSAqGZRqThMb2u1cOL5EGQ90DbVUR0iV1s0bP8A_mQVSPVF73e5n5SBPjXSwOGPOzwLSN_fjmOJeH95lmALsNFPLRERf2CcewheG8Sj1fqDVRlX1Rifoq-lho&luckydog_data=Hk5Bf0ttsSfIY4UFRdE55re_uPKSgNmXs9V7p2wz6X7wZDsqUuI9hPaiZNOHQho6dCZ14pQnbEjqqbULoU6k6g&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let body = `{"open_treasure_box_enter_from":"","rit":"coin","use_ecpm":0}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}开宝箱获得${result.data.score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}开宝箱失败：${result.err_tips}`)
    }
}

//宝箱视频奖励
async function ExcitationAd(task_id) {
    let caller = printCaller()
    let timeInMS = Math.round(new Date().getTime())
    let url = `${hostname}/luckycat/lite/v1/task/done/excitation_ad?pass_through=default&is_pad=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&act_hash=dedbaf4265335985d5667d77ca98f8d9&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&iid=1341841701869182&device_id=720870999070232&ac=wifi&channel=lite_xiaomi_64&aid=35&app_name=news_article_lite&version_code=876&version_name=8.7.6&device_platform=android&os=android&ab_version=668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C3801462%2C3520490%2C3540012%2C3596061%2C3958946&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&ab_group=z2&ab_feature=z1&abflag=3&ssmix=a&device_type=Mi+10&device_brand=Xiaomi&language=zh&os_api=29&os_version=10&manifest_version_code=8760&resolution=1080*2120&dpi=440&update_version_code=87610&_rticket=1650476698414&sa_enable=0&dq_param=1&plugin_state=139681997156381&isTTWebView=1&session_id=22f3a101-f451-4506-87c2-c07ed70225db&host_abi=arm64-v8a&tma_jssdk_version=2.8.0.16&rom_version=miui_v11_v11.0.25.0.qjbcnxm&cdid=027d4278-d6cf-4217-974b-2647a9791411&polaris_version=1.0.5&status_bar_height=32&luckydog_base=qG0Sn8Nue65F3MxBkjB-EW7ni81H0J7NsN9QTN3x8FPllOV7mkXvfYtRAsDKMsI4WxPjyb44eb4iLTTLbXOAUohY2Zv9dI1QXtS79j_GdEBHSVv8mxCtG-mD_aUrc7Ftfw0v7Gu4lt7gnQ1BIw_42k3F1E60Q8jD7LGzqHWDFvs&luckydog_data=H_tviv5pCkhGYVzM3xlqO-Udh13I_v0l41nYVB9-BphzihqsXlF_Yilb89peZOinnXtS62jAYvu2gmlGWJjS6_Wg621ASMl_2tcKLhns2aw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let body = `{"ad_alias_position":"coin","task_key":"excitation_ad", "task_id" : "${task_id}"}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}看视频任务[${task_id}]获得${result.data.score_amount}金币`)
        //validList.push(task_id)
    } else {
        console.log(`用户${userIdx+1}看视频任务[${task_id}]失败：${result.err_tips}`)
        //if(result.err_tips != '网络错误') validList.push(task_id)
    }
}

//查询走路状态
async function QueryWalkInfo() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/walk/page_data/?_request_from=web&scm_build_version=1.0.0.1639&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&channel=lite_xiaomi_64&luckycat_version_code=501024&device_type=Mi+10&language=zh&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&update_version_code=87610&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&abflag=3&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&version_code=876&ab_version=668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&luckydog_base=L-Qs4_NsyjW98aRJyI10ipWoEeB-zVYalDVrBOR55JJJyBu7V-9t6Rs65lEoO76T9pCEaZGTk_UQ8-SlGi9Na2iUbjhGH0cr7OZ6daTUYfAcMYIOpPhMIu9ay8WRbqfbr2oFVkvds-OmN7UIdy6xg8rOAE0h1Fv_ojfvKzYSWYA&plugin_state=139681997156381&device_platform=android&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&manifest_version_code=8760&_rticket=1650400952247&iid=1341841701869182&isTTWebView=1&host_abi=arm64-v8a&is_pad=0&dq_param=1&status_bar_height=32&os_api=29&dpi=440&luckydog_data=pLpRmOMroS6Yruu34epx1q95m9AFI3O76Gq2bItg2GeD7Udv6q-5GvE9whReXRAXP0RKgjXP2Fh8jQ_4HPFFcw&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&os=android&pass_through=default&os_version=10&session_id=b9e651bb-be25-4e7d-815b-4c6b5adfe856&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&luckycat_version_name=5.0.1-rc.24&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&luckydog_settings_version=15&luckydog_sdk_version=5.0.1-rc.11`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        if(result.data.can_get_amount > 0) await GetWalkBonus()
    } else {
        console.log(`用户${userIdx+1}走路状态失败：${result.err_tips}`)
    }
}

//走路奖励
async function GetWalkBonus() {
    let caller = printCaller()
    let nowtime = Math.round(new Date().getTime()/1000)
    let url = `${hostname}/luckycat/lite/v1/walk/bonus/?manifest_version_code=8760&_rticket=1650401046423&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&iid=1341841701869182&channel=lite_xiaomi_64&isTTWebView=1&device_type=Mi+10&language=zh&host_abi=arm64-v8a&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&is_pad=0&update_version_code=87610&dq_param=1&status_bar_height=32&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&os_api=29&abflag=3&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&os=android&pass_through=default&os_version=10&version_code=876&session_id=e8b69790-39a5-4d40-b025-ba130ae370d2&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&ab_version=668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&version_name=8.7.6&device_brand=Xiaomi&scm_build_version=1.0.0.1639&ssmix=a&plugin_state=139681997156381&device_platform=android&polaris_version=1.0.5&aid=35&_request_from=web&rom_version=miui_v11_v11.0.25.0.qjbcnxm&luckydog_base=L-Qs4_NsyjW98aRJyI10ipWoEeB-zVYalDVrBOR55JJJyBu7V-9t6Rs65lEoO76T9pCEaZGTk_UQ8-SlGi9Na2iUbjhGH0cr7OZ6daTUYfAcMYIOpPhMIu9ay8WRbqfbr2oFVkvds-OmN7UIdy6xg8rOAE0h1Fv_ojfvKzYSWYA&luckydog_data=pLpRmOMroS6Yruu34epx1q95m9AFI3O76Gq2bItg2GeD7Udv6q-5GvE9whReXRAXP0RKgjXP2Fh8jQ_4HPFFcw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let body = `{"task_id":136,"enable_preload_exciting_video":0,"client_time":${nowtime},"rit":"","use_ecpm":0}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}领取走路奖励获得${result.data.score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}领取走路奖励失败：${result.err_tips}`)
    }
}

//吃饭补贴
async function DoneEat() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/eat/done_eat/?sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&channel=lite_xiaomi_64&device_type=Mi+10&language=zh&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&update_version_code=87610&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&abflag=3&rit=coin&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&version_code=876&ab_version=668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946%2C3801462&scm_build_version=1.0.0.1639&plugin_state=139681997156381&device_platform=android&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&manifest_version_code=8760&_rticket=1650402088312&iid=1341841701869182&isTTWebView=1&use_ecpm=0&host_abi=arm64-v8a&is_pad=0&dq_param=1&status_bar_height=32&os_api=29&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&os=android&pass_through=default&os_version=10&session_id=7b5f112a-e1d5-45e8-81de-fc04ac51e476&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&polaris_version=1.0.5&_request_from=web&luckydog_base=zEN9QCnx8bXqQPwrxQYlouK9T33yztCGBlg4kp3VEuZF061lMOdSAqGZRqThMb2u1cOL5EGQ90DbVUR0iV1s0bP8A_mQVSPVF73e5n5SBPjXSwOGPOzwLSN_fjmOJeH95lmALsNFPLRERf2CcewheG8Sj1fqDVRlX1Rifoq-lho&luckydog_data=Hk5Bf0ttsSfIY4UFRdE55re_uPKSgNmXs9V7p2wz6X7wZDsqUuI9hPaiZNOHQho6dCZ14pQnbEjqqbULoU6k6g&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let urlObject = populatePostUrl(url)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}领取吃饭补贴获得${result.data.score_amount}金币`)
    } else {
        console.log(`用户${userIdx+1}领取吃饭补贴失败：${result.err_tips}`)
    }
}

//睡觉状态
async function QuerySleepStatus() {
    let caller = printCaller()
    let curTime = new Date()
    let curHour = curTime.getHours()
    let url = `${hostname}/luckycat/lite/v1/sleep/status/?_request_from=web&scm_build_version=1.0.0.1639&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&channel=lite_xiaomi_64&luckycat_version_code=501024&device_type=Mi+10&language=zh&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&update_version_code=87610&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&abflag=3&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&version_code=876&ab_version=668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C668907%2C3937398%2C1859937%2C668908%2C3937402%2C668905%2C3937366%2C3801462%2C3520490%2C3540012%2C3596061%2C3958946&luckydog_base=qG0Sn8Nue65F3MxBkjB-EW7ni81H0J7NsN9QTN3x8FPllOV7mkXvfYtRAsDKMsI4WxPjyb44eb4iLTTLbXOAUohY2Zv9dI1QXtS79j_GdEBHSVv8mxCtG-mD_aUrc7Ftfw0v7Gu4lt7gnQ1BIw_42k3F1E60Q8jD7LGzqHWDFvs&plugin_state=139681997156381&device_platform=android&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&manifest_version_code=8760&_rticket=1650476865665&iid=1341841701869182&isTTWebView=1&host_abi=arm64-v8a&is_pad=0&dq_param=1&status_bar_height=32&os_api=29&dpi=440&luckydog_data=H_tviv5pCkhGYVzM3xlqO-Udh13I_v0l41nYVB9-BphzihqsXlF_Yilb89peZOinnXtS62jAYvu2gmlGWJjS6_Wg621ASMl_2tcKLhns2aw&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&os=android&pass_through=default&os_version=10&session_id=d3474e9f-5a53-42a7-8023-a4756ffff44b&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&luckycat_version_name=5.0.1-rc.24&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&luckydog_settings_version=15&luckydog_sdk_version=5.0.1-rc.11`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        let sleepHour = Math.floor(result.data.sleep_last_time/36)/100
        if(result.data.sleeping == true) {
            if(sleepHour>=12) {
                await SleepStop()
            } else if(result.data.sleep_unexchanged_score==result.data.max_coin && curHour >= 7) {
                let rnd = Math.random()
                if(rnd>0.95) {
                    await SleepStop()
                } else {
                    console.log(`用户${userIdx+1}随机醒来时间，本次不进行醒来，已经睡了${sleepHour}小时，可以获得${result.data.sleep_unexchanged_score}金币`)
                }
            } else {
                console.log(`用户${userIdx+1}睡眠中，已经睡了${sleepHour}小时，可以获得${result.data.sleep_unexchanged_score}金币，上限${result.data.max_coin}金币`)
            }
        } else {
            if(result.data.history_amount > 0) {
                await SleepDone(result.data.history_amount)
            }
            if(curHour >= 22 || curHour < 2) {
                await SleepStart()
            } else if(curHour >= 20) {
                let rnd = Math.random()
                if(rnd>0.95) {
                    await SleepStart()
                } else {
                    console.log(`用户${userIdx+1}随机睡眠时间，本次不进行睡眠`)
                }
            } else {
                console.log(`用户${userIdx+1}未到睡觉时间`)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询睡觉状态失败：${result.err_tips}`)
    }
}

//睡觉醒来
async function SleepStop() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/sleep/stop/?manifest_version_code=8760&_rticket=1650407780276&sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&iid=1341841701869182&channel=lite_xiaomi_64&isTTWebView=1&device_type=Mi+10&language=zh&host_abi=arm64-v8a&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&is_pad=0&update_version_code=87610&dq_param=1&status_bar_height=32&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&os_api=29&abflag=3&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&os=android&pass_through=default&os_version=10&version_code=876&session_id=aaec0b40-9584-43d8-aec5-4f8d732c42e4&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&ab_version=1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C668907%2C3937398%2C3801462%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946&version_name=8.7.6&device_brand=Xiaomi&scm_build_version=1.0.0.1639&ssmix=a&plugin_state=139681997156381&device_platform=android&polaris_version=1.0.5&aid=35&_request_from=web&rom_version=miui_v11_v11.0.25.0.qjbcnxm&luckydog_base=qG0Sn8Nue65F3MxBkjB-EW7ni81H0J7NsN9QTN3x8FPllOV7mkXvfYtRAsDKMsI4WxPjyb44eb4iLTTLbXOAUohY2Zv9dI1QXtS79j_GdEBHSVv8mxCtG-mD_aUrc7Ftfw0v7Gu4lt7gnQ1BIw_42k3F1E60Q8jD7LGzqHWDFvs&luckydog_data=H_tviv5pCkhGYVzM3xlqO-Udh13I_v0l41nYVB9-BphzihqsXlF_Yilb89peZOinnXtS62jAYvu2gmlGWJjS6_Wg621ASMl_2tcKLhns2aw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let urlObject = populatePostUrl(url)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        let sleepHour = result.data.sleep_last_time/3600
        console.log(`用户${userIdx+1}结束睡眠，本次睡了${sleepHour}小时，可以领取${result.data.history_amount}金币`)
        await SleepDone(result.data.history_amount)
    } else {
        console.log(`用户${userIdx+1}结束睡眠失败：${result.err_tips}`)
    }
}

//睡觉收金币
async function SleepDone(amount) {
    let caller = printCaller()
    let timeInMS = Math.round(new Date().getTime())
    let url = `${hostname}/luckycat/lite/v1/sleep/done_task/?sa_enable=0&act_token=6RG20vMLG99kWgP4-JPCXjH4d2MoJtxqis-UJMfVBauCrF2w7u9fyclvyNrcLtUok76I1X_av6M7TzAlj3xQew&channel=lite_xiaomi_64&device_type=Mi+10&language=zh&ab_client=a1%2Ce1%2Cf2%2Cg2%2Cf7&resolution=1080*2120&cookie_base=xxv-DM4hSZjeBbwTMG4VpEd-s8y5trhdfc9QuvXd6l-cIxOfIuAtilLYgN0_tHLBvc4HaNuqTOKX2XOA1Me9lf0C88iRwXX3h6i3vk_Udsg&update_version_code=87610&cdid=027d4278-d6cf-4217-974b-2647a9791411&ab_group=z2&abflag=3&rit=coin&ac=wifi&act_hash=dedbaf4265335985d5667d77ca98f8d9&device_id=720870999070232&version_code=876&ab_version=1859937%2C668908%2C3937402%2C668905%2C3937366%2C668906%2C3937374%2C668904%2C3937345%2C668903%2C3937392%2C668907%2C3937398%2C3801462%2C3520490%2C3540012%2C3596061%2C3936294%2C3958946&scm_build_version=1.0.0.1639&plugin_state=139681997156381&device_platform=android&aid=35&rom_version=miui_v11_v11.0.25.0.qjbcnxm&manifest_version_code=8760&_rticket=1650407871521&iid=1341841701869182&isTTWebView=1&use_ecpm=0&host_abi=arm64-v8a&is_pad=0&dq_param=1&status_bar_height=32&os_api=29&dpi=440&ab_feature=z1&cookie_data=K-5O5M5eqoUHPRzT_jWTmw&os=android&pass_through=default&os_version=10&session_id=7ea4245a-c604-40e3-ad9b-283a6b4007a0&tma_jssdk_version=2.8.0.16&app_name=news_article_lite&version_name=8.7.6&device_brand=Xiaomi&ssmix=a&polaris_version=1.0.5&_request_from=web&luckydog_base=qG0Sn8Nue65F3MxBkjB-EW7ni81H0J7NsN9QTN3x8FPllOV7mkXvfYtRAsDKMsI4WxPjyb44eb4iLTTLbXOAUohY2Zv9dI1QXtS79j_GdEBHSVv8mxCtG-mD_aUrc7Ftfw0v7Gu4lt7gnQ1BIw_42k3F1E60Q8jD7LGzqHWDFvs&luckydog_data=H_tviv5pCkhGYVzM3xlqO-Udh13I_v0l41nYVB9-BphzihqsXlF_Yilb89peZOinnXtS62jAYvu2gmlGWJjS6_Wg621ASMl_2tcKLhns2aw&luckydog_token=Rc0YYEWhEl8eoCsTBMtn7x6M-06xtV_twh3G1M8zEfPqRlfkgtsZViHX0EjkfO43kfw2p-yZHUiAkETbul6RlA&luckydog_sdk_version=5.0.1-rc.11&luckydog_settings_version=15&luckycat_version_name=5.0.1-rc.24&luckycat_version_code=501024`
    let body = `{"score_amount":${amount},"enable_preload_exciting_video":0}`
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}领取睡觉金币奖励${amount}金币成功`)
    } else {
        console.log(`用户${userIdx+1}领取睡觉金币奖励失败：${result.err_tips}`)
    }
}

//开始睡觉
async function SleepStart() {
    let caller = printCaller()
    let url = `${hostname}/luckycat/lite/v1/sleep/start/?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populatePostUrl(url)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_no == 0) {
        console.log(`用户${userIdx+1}开始睡觉，ZZZzzz...`)
        await SleepDone(result.data.history_amount)
    } else {
        console.log(`用户${userIdx+1}开始睡觉失败：${result.err_tips}`)
    }
}

//查询农场状态
async function QueryFarmInfo() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/polling_info?game_client_version_code=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        if(result.data.info.offline_production) {
            await FarmOfflineDouble()
        }
        if(result.data.info.water>=10) {
            await FarmWater()
        }
        if(result.data.info.box_num>0) {
            await FarmOpenBox()
        }
    } else {
        console.log(`用户${userIdx+1}查询农场状态失败：${result.message}`)
    }
}

//进入农场
async function EnterFarm() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/home_info?game_client_version_code=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    console.log(result)
    if(result.status_code == 0) {

    } else {
        console.log(`用户${userIdx+1}进入农场失败：${result.message}`)
    }
}

//农场-离线奖励翻倍
async function FarmOfflineDouble() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/double_reward?game_client_version_code=2&watch_ad=1&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}农场离线产量翻倍成功`)
    } else {
        console.log(`用户${userIdx+1}农场离线产量翻倍失败：${result.message}`)
    }
}

//农场-领取三餐礼包
async function RewardFarmThreeGift(gift_id) {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/three_gift/reward?gift_id=${gift_id}&watch_ad=0&double=0&device_platform=android&device_type=Mi+10&aid=35&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}领取农场三餐礼包获得${result.data.reward_num}水滴`)
    } else {
        console.log(`用户${userIdx+1}领取农场三餐礼包失败：${result.message}`)
    }
}

//农场-三餐礼包状态
async function QueryFarmThreeGift() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/gift/list?device_platform=android&aid=35&update_version_code=87610&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data) {
            if(item.status==1) {
                await RewardFarmThreeGift(item.gift_id)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询农场三餐礼包状态失败：${result.message}`)
    }
}

//查询农场任务列表
async function QueryFarmTask() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/daily_task/list?game_client_version_code=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data) {
            if(item.status==1) {
                await RewardFarmTask(item.task_id)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询农场任务列表失败：${result.message}`)
    }
}

//农场-领取任务奖励
async function RewardFarmTask(id) {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/reward/task?game_client_version_code=2&task_id=${task_id}&is_auto_reward=0&is_surprise_box_reward=0&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        let typeStr = (result.data.reward_type==1) ? '水滴' : '化肥'
        console.log(`用户${userIdx+1}领取农场任务奖励[task_id=${result.data.task_id}]获得${result.data.reward_num}${typeStr}，剩余${typeStr}数量${result.data.current_num}`)
    } else {
        console.log(`用户${userIdx+1}领取农场任务奖励失败：${result.message}`)
    }
}

//农场-浇水
async function FarmWater() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/land_water?game_client_version_code=2&tentimes=0&fivetimes=0&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}农场浇水成功，剩余水滴：${result.data.water}`)
        if(result.data.water>=10) {
            await $.wait(1500) //min time 1000
            await FarmWater()
        }
    } else {
        console.log(`用户${userIdx+1}农场浇水失败：${result.message}`)
    }
}

//农场-开宝箱
async function FarmOpenBox() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/box/open?game_client_version_code=2&enter_type=101009&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}开农场宝箱获得${result.data.incr_coin}金币`)
        if(result.data.excitation_ad_score_amount>0) await FarmOpenBoxVideo()
    } else {
        console.log(`用户${userIdx+1}开农场宝箱失败：${result.message}`)
    }
}

//农场-宝箱视频
async function FarmOpenBoxVideo() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/excitation_ad/add?game_client_version_code=2&excitation_ad_score_amount=134&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}看农场宝箱视频获得${result.data.incr_coin}金币`)
    } else {
        console.log(`用户${userIdx+1}看农场宝箱视频失败：${result.message}`)
    }
}

//农场-签到状态
async function QueryFarmSignStatus() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/sign_in/list?game_client_version_code=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data.sign) {
            if(item.status==1) {
                await FarmSign()
                break
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询签到状态失败：${result.message}`)
    }
}

//农场-签到
async function FarmSign() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/reward/sign_in?game_client_version_code=2&watch_ad=0&extra_ads_num=0&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        let str = (result.data.reward_type==1)?'水滴':'化肥'
        console.log(`用户${userIdx+1}签到获得${result.data.reward_num}${str}，剩余${str}数量${result.data.cur_reward_num}`)
    } else {
        console.log(`用户${userIdx+1}签到失败：${result.message}`)
    }
}

//农场-签到视频翻倍
async function FarmSignDouble() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/reward/double_sign_in?game_client_version_code=2&watch_ad=0&extra_ads_num=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        let str = (result.data.reward_type==1)?'水滴':'化肥'
        console.log(`用户${userIdx+1}签到翻倍获得${result.data.reward_num}{str}，剩余${str}数量${result.data.cur_reward_num}`)
    } else {
        console.log(`用户${userIdx+1}签到翻倍失败：${result.message}`)
    }
}

//农场-土地状态
async function QueryFarmLandStatus() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_farm/home_info?game_client_version_code=2&device_id=720870999070232&device_platform=android&aid=35&os_version=10&update_version_code=87610&tma_jssdk_version=2.31.1.1&sid&version_code=876&install_id=1341841701869182&app_name=news_article_lite&device_type=Mi+10&channel=lite_xiaomi_64&host_app_name=undefined&activity_id&credit_type&use_tomato=0&ios_new_version=false&SDKVersion=2.31.1&deviceScore=%5Bobject+Object%5D`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data.info.lands) {
            if(item.status==false && item.unlock_able==true) {
                await FarmUnlock(item.land_id)
                break
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询土地状态失败：${result.message}`)
    }
}

//农场-土地解锁
async function FarmUnlock(land_id) {
    let caller = printCaller()
    let url = ``
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}解锁${land_id}号土地成功`)
    } else {
        console.log(`用户${userIdx+1}解锁${land_id}号土地失败：${result.message}`)
    }
}

//种树-签到状态
async function QueryTreeSignStatus() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/sign_in/list?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        if(result.data.today == false) {
            await TreeSign()
        }
    } else {
        console.log(`用户${userIdx+1}查询种树签到状态失败：${result.message}`)
    }
}

//种树-签到
async function TreeSign() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/sign_in/reward?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}种树签到获得${result.data.reward_item.num}${result.data.reward_item.name}`)
    } else {
        console.log(`用户${userIdx+1}种树签到失败：${result.message}`)
    }
}

//种树-二选一-选项
async function QueryTreeChallenge() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/challenge/list?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        let bestChoice = 0
        let maxWater = 0
        for(let item of result.data.tasks) {
            if(item.state==0 && item.water_times>maxWater) {
                maxWater = item.water_times
                bestChoice = item.id
            }
        }
        if(bestChoice>0) await TreeChallengeChoose(bestChoice)
    } else {
        console.log(`用户${userIdx+1}查询挑战任务失败：${result.message}`)
    }
}

//种树-二选一-选择
async function TreeChallengeChoose(id) {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/challenge/choose?task_id=${id}&aid=35`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}选择浇水${result.data.red_point.times}次挑战`)
    } else {
        console.log(`用户${userIdx+1}选择浇水挑战失败：${result.message}`)
    }
}

//种树-二选一-领奖
async function TreeChallengeReward() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/challenge/reward?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}领取浇水挑战奖励获得${result.data.reward_item.num}水滴`)
    } else {
        console.log(`用户${userIdx+1}领取浇水挑战奖励失败：${result.message}`)
    }
}

//种树-化肥签到
async function TreeNutrientSign() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/nutrient/sign_in?os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        if(result.data.is_rewarded==true) {
            console.log(`用户${userIdx+1}种树化肥签到获得${result.data.reward_item.num}{result.data.reward_item.name}`)
        } else {
            console.log(`用户${userIdx+1}种树化肥签到成功`)
        }
    } else {
        console.log(`用户${userIdx+1}种树化肥签到失败：${result.message}`)
    }
}

//种树-领取三餐礼包
async function RewardTreeThreeGift(task_id) {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/three_gift/reward?task_id=${task_id}&watch_ad=2&extra_ad_num=0&os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}领取种树三餐礼包获得${result.data.reward_item.num}${result.data.reward_item.name}`)
    } else {
        console.log(`用户${userIdx+1}领取种树三餐礼包失败：${result.message}`)
    }
}

//种树-三餐礼包状态
async function QueryTreeThreeGift() {
    let caller = printCaller()
    let curTime = new Date()
    let curHour = curTime.getHours()
    let url = `${hostname}/ttgame/game_orchard/three_gift/list?os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data.gift_list) {
            if(item.rounds==1 && curHour >= item.available_time.begin && curHour < item.available_time.end) {
                await RewardTreeThreeGift(item.id)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询种树三餐礼包状态失败：${result.message}`)
    }
}

//种树-水滴任务列表
async function QueryTreeWaterTask() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/tasks/list?version=17&address_book_authorized=0&enter_type=61011&os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        for(let item of result.data.tasks_v2) {
            if(item.reward_item.state==4) {
                await TreeWaterReward(item.id)
                await $.wait(1500)
            }
        }
    } else {
        console.log(`用户${userIdx+1}查询种树水滴任务列表失败：${result.message}`)
    }
}

//种树-水滴领奖
async function TreeWaterReward(task_id) {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/tasks/reward?task_id=${task_id}&do_action=0&extra_ad_num=0&version=17&os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}领取水滴任务[id=${task_id}]获得${result.data.reward_item.num}${result.data.reward_item.name}`)
    } else {
        console.log(`用户${userIdx+1}领取水滴任务[id=${task_id}]失败：${result.message}`)
    }
}

//种树-浇水
async function TreeWater() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/tree/water?version=17&os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}种树浇水成功，剩余水滴：${result.data.kettle.water_num}`)
        if(result.data.kettle.water_num>=100) {
            await $.wait(1500) //min time 1000
            await TreeWaterTenTimes()
        } else if(result.data.kettle.water_num>=10) {
            await $.wait(1500) //min time 1000
            await TreeWater()
        }
    } else {
        console.log(`用户${userIdx+1}种树浇水失败：${result.message}`)
    }
}

//种树-浇水10次
async function TreeWaterTenTimes() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/tree/tenfold_water?times=10&aid=35`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}种树浇水10次成功，剩余水滴：${result.data.kettle.water_num}`)
        if(result.data.kettle.water_num>=100) {
            await $.wait(1500) //min time 1000
            await TreeWaterTenTimes()
        } else if(result.data.kettle.water_num>=10) {
            await $.wait(1500) //min time 1000
            await TreeWater()
        }
    } else {
        console.log(`用户${userIdx+1}种树浇水失败：${result.message}`)
    }
}

//种树-信息
async function QueryTreeStatus() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/polling_info?version=17&enter_type=61011&os_version=10&version_code=876&device_id=720870999070232&iid=1341841701869182&app_name=news_article_lite&device_platform=android&device_type=Mi+10&channel=lite_xiaomi_64&aid=35&version_name=8.7.6&update_version_code=87610`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        if(result.data.red_points.challenge && result.data.red_points.challenge.state==4) {
            await TreeChallengeReward()
        }
        if(result.data.bottle.state==1) {
            await RewardTreeWaterBottle()
        }
        if(result.data.red_points.box && result.data.red_points.box.rounds>0 && result.data.red_points.box.state==4) {
            await TreeOpenBox()
        }
        if(result.data.kettle.water_num >= 100) {
            await TreeWaterTenTimes()
        } else if(result.data.kettle.water_num>=10) {
            await TreeWater()
        }
    } else {
        console.log(`用户${userIdx+1}查询种树信息失败：${result.message}`)
    }
}

//种树-水瓶奖励
async function RewardTreeWaterBottle() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/water_bottle/reward?aid=35&update_version_code=87610&device_platform=android&&device_type=Mi+10`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}领取种树水瓶奖励获得${result.data.reward_item.num}水滴`)
    } else {
        console.log(`用户${userIdx+1}领取种树水瓶奖励失败：${result.message}`)
    }
}

//种树-开宝箱
async function TreeOpenBox() {
    let caller = printCaller()
    let url = `${hostname}/ttgame/game_orchard/box2/open?watch_ad=0&aid=35`
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.status_code == 0) {
        console.log(`用户${userIdx+1}种树开宝箱获得${result.data.incr_coin}金币`)
    } else {
        console.log(`用户${userIdx+1}种树开宝箱失败：${result.message}`)
    }
}
////////////////////////////////////////////////////////////////////
function populatePostUrl(url,reqBody=''){
    let timeInMS = Math.round(new Date().getTime())
    let timeInSecond = Math.floor(timeInMS/1000)
    let urlObject = {
        url: url,
        headers: {
            'Accept-Encoding' : 'gzip',
            'X-SS-REQ-TICKET' : timeInMS,
            'passport-sdk-version' : '30',
            'sdk-version' : '2',
            'x-vc-bdturing-sdk-version' : '2.0.0',
            'User-Agent' : userAgentArr[userIdx%UAcount],
            'Cookie' : userHeaderArr[userIdx],
            'X-Khronos' : timeInSecond,
            'Content-Type' : 'application/json; charset=utf-8',
            'Host' : host,
            'Connection' : 'Keep-Alive',
        },
        body: reqBody
    }
    return urlObject;
}

function populateGetUrl(url){
    let timeInMS = Math.round(new Date().getTime())
    let timeInSecond = Math.floor(timeInMS/1000)
    let urlObject = {
        url: url,
        headers: {
            'Accept-Encoding' : 'gzip',
            'X-SS-REQ-TICKET' : timeInMS,
            'passport-sdk-version' : '30',
            'sdk-version' : '2',
            'x-vc-bdturing-sdk-version' : '2.0.0',
            'User-Agent' : userAgentArr[userIdx%UAcount],
            'Cookie' : userHeaderArr[userIdx],
            'X-Khronos' : timeInSecond,
            'Content-Type' : 'application/json; charset=utf-8',
            'Host' : host,
            'Connection' : 'Keep-Alive',
        }
    }
    return urlObject;
}

async function httpPost(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.post(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": post请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

async function httpGet(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.get(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": get请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data,caller)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function safeGet(data,caller) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(`Function ${caller}: 未知错误`);
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`Function ${caller}: 服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function printCaller(){
    return (new Error()).stack.split("\n")[2].trim().split(" ")[1]
}

function getMin(a,b){
    return ((a<b) ? a : b)
}

function getMax(a,b){
    return ((a<b) ? b : a)
}

function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))); let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
