import { expect } from "@playwright/test";
import { convertWeek, formatTime, getMonthAgo, formatMonth } from "./dateUtils";

export async function checkKotAbiWork({ page }){
    /*
        ABI業務申請を確認し、文字列のリストを返します
        ABI業務申請が存在する場合：
            [社員番号 社員名, 日付, 打刻種別, 打刻時刻, 備考]
        ABI業務申請が存在しない場合：
            空のリスト
    */
    try{
        // KOTの初回表示ガイドが表示されないようにする
        console.log('==== checkKotAbiWork Start ====');
        await page.context().addInitScript(() => {
            // @ts-ignore
            window.localStorage.setItem("intro", "checked");
        });
        
        // KOT勤怠管理のログイン画面表示
        await page.goto("https://s2.ta.kingoftime.jp/admin");
        
        // HTMLタイトルの確認
        await expect(page).toHaveTitle(/KING OF TIME/);
        
        // ログインID入力
        const loginId = await page.$("input#login_id");
        expect(loginId).not.toBeNull();
        loginId?.fill(process.env.KOT_LOGIN_ID as string);
        
        // パスワード入力
        const loginPassword = await page.$("input#login_password");
        expect(loginPassword).not.toBeNull();
        loginPassword?.fill(process.env.KOT_LOGIN_PASSWORD as string);
        
        // ログインボタンクリック
        const loginButton = await page.$("input#login_button");
        expect(loginButton).not.toBeNull();
        await loginButton?.click();
        
        await page.waitForLoadState("domcontentloaded");
        console.log('==== ログイン完了 ====')
        
        // 勤怠管理ボタンの出現を待つ
        await page.waitForSelector("button#button_50");
        
        // 勤怠管理ボタンをクリックすると表示されるconfirmダイアログを通過する
        page.on("dialog", (dialog) => dialog.accept());
        
        // 勤怠管理ボタンクリック
        const kintaiKanriBtn = await page.$("button#button_50");
        expect(kintaiKanriBtn).not.toBeNull();
        await kintaiKanriBtn?.click();
        await page.waitForLoadState("domcontentloaded");
        console.log('==== 勤怠管理画面遷移完了 ====')
        
        // 左上の「対応が必要な処理」の出現を待機
        await page.waitForSelector("h3.htTopTitle");
    
        // 月別データ勤務に遷移
        await monthlyWorkScreenTransition(page);

        // 前月を取得して、変更する
        // const lastMonth = formatMonth(getMonthAgo(1), "/");
        const lastMonth = "2025/06";

        // 月別データ一覧を取得
        let memberTrList = await getOrverTime(page, lastMonth);

        // [社員番号 社員名, 日付, 打刻種別, 打刻時刻, 備考]のリスト
        const abiWorkList: string[][] = [];
        let reloadFlg = false;

        // 社員単位でのループ
        for (let i:number = 0; i < memberTrList.length; i++) {
            // 日別データ再取得
            if(reloadFlg){
                memberTrList = await getOrverTime(page, lastMonth);
            }
            const tdList = await memberTrList[i].$$("td");
        
            // 社員名
            const tmpName = (await tdList[3].textContent()) as string;
            const name = tmpName.trim();
        
            // ABI業務申請対象者
            let abiWorkTargetMembers: string[] = [];
            if(process.env.ABI_WORK_TARGET_MEMBERS !== undefined){
                abiWorkTargetMembers = process.env.ABI_WORK_TARGET_MEMBERS.split(',');
            }

            if(!abiWorkTargetMembers.includes(name.substring(0,5))){
                console.log("対象外のためスキップ", name);
                reloadFlg = false;
                continue;
            }
            reloadFlg = true;
            console.log("対象のため確認", name);
            // タイムカード
            const timeCard = await tdList[4];
            await timeCard?.click();
            
            // 日別データ
            const dateTrList = await getDateTrList(page);

            // ヘッダのソート
            await getDateHeaderTrList(page);
            // 日単位でのループ
            for (let i:number = 0; i < dateTrList.length; i++) {
                // 日別データ再取得
                const reDateTrList = await getDateTrList(page);
                const tdList = await reDateTrList[i].$$("td");
        
                // 日付
                const tmpDate = (await tdList[1].textContent()) as string;
                const date = tmpDate.trim().replace(/（[^）]+）/, "");;
                console.log("対象日付", name, date);


                // 勤務日種別
                const tmpWorkDateType = (await tdList[5].textContent()) as string;
                const workDateType = tmpWorkDateType.trim();
                if(workDateType == ''){
                    console.log("日付の確認完了");
                    break;
                }
        
                // 出勤日
                const tmpWork = (await tdList[6].textContent()) as string;
                const work = tmpWork.trim();
                if(work == ''){
                    console.log("休みの為、スキップ", date);
                    // await getDateHeaderTrList(page);
                    continue;
                }

                // 編集
                const edit = await tdList[0];
                const form = await edit.$$("form");
                if(form.length === 0){
                    console.log("編集不可の為、スキップ", date);
                    break;
                }
                await edit?.click();
                await page.waitForLoadState("domcontentloaded");

                // 打刻データ
                const stampDataTrList = await page.$$(
                    "div.htBlock-normalTable > table > tbody > tr"
                );

                let abiWorkFlg = false;

                const dailyAbiWorkList: string[][] = [];

                // 打刻データ単位でのループ
                for (const tr of await stampDataTrList) {
                    const tdList = await tr.$$("td");     
                    // 打刻種別
                    const tmpWorkType = (await tdList[0].textContent()) as string;
                    const workType = tmpWorkType.trim();
        
                    // 打刻時間
                    const tmpWorkDatetime = (await tdList[2].textContent()) as string;
                    const workDatetime = converteDateTime(tmpWorkDatetime);
        
                    // 打刻所属
                    const tempDepartment = (await tdList[3].textContent()) as string;
                    const department = tempDepartment.trim();
                    if(department != 'ABI業務'){
                        console.log("打刻所属がABI業務ではない 打刻時間", workDatetime, "打刻所属", department)
                        continue;
                    }

                    abiWorkFlg = true;
                    dailyAbiWorkList.push([name, date, workType, workDatetime]);
                }
                
                // スケジュール編集
                const editScheduleTrList = await page.$$(
                    "div.specific-mainTable > table > tbody > tr"
                );

                
                if(abiWorkFlg){
                    // 打刻データ単位でのループ
                    for (const tr of await editScheduleTrList) {
                        const th = await tr.$("th");
                        if(th === null){
                            continue;
                        }
                        const tmpHeader = (await th.textContent()) as string;
                        const header = tmpHeader.trim();
                        if(header != '備考'){
                            continue;
                        }
                        const td = await tr.$("td");
                        const tmpRemarks = (await td.textContent()) as string;
                        const remarks = tmpRemarks.trim();
                        dailyAbiWorkList.forEach((row) => {
                            abiWorkList.push([row[0], row[1], row[2], row[3], remarks]);
                        });
                        break;
                    }
                }

                // 戻るボタンクリック
                const back = await page.locator("#header_menu_back_button a");
                await back.click();
                await page.waitForLoadState("domcontentloaded");
                // ヘッダのソート
                await getDateHeaderTrList(page);
            }

            // ホームボタン
            const homeButton = await page.$(
                "div.htBlock-header_homeButton a "
            );
            await homeButton?.click();
            await page.waitForLoadState("domcontentloaded");

            // 月別データ勤務に遷移
            await monthlyWorkScreenTransition(page);
        }

        return abiWorkList;
    }catch(error){
        console.error('checkKotAbiWork Error:',error);
    }finally{
        console.log('==== checkKotAbiWork End ====');
    }
}

/**
 * 月別データ勤務に遷移
 */
export async function monthlyWorkScreenTransition(page){
    // 月別データ勤務のリンクをクリック
    const errorKinmu = await page.$("#montyl_working_summary_link");
    await errorKinmu?.click();

    await page.waitForLoadState("domcontentloaded");
    console.log('==== 月別データ勤務画面遷移完了 ====')
    
    // 右上の表示ボタンの出現を待機
    await page.waitForSelector("input#display_button");
}

/*
  残業時間を取得
*/
export async function getOrverTime(page, lastMonth: string){
    // カレンダーをクリック
    const calendarPicker = await page.$("#select_year_month_picker");
    await calendarPicker?.click();

    // inputタグに値を設定
    if (calendarPicker) {
        await calendarPicker.evaluate((element: HTMLInputElement, value) => {
            element.value = value;
            // changeイベントを発火
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }, lastMonth);
    }

    // 表示ボタンをクリック
    const dispBtn = await page.$("input#display_button");
    await dispBtn?.click();
    await page.waitForLoadState("domcontentloaded");
        
    // 勤怠の一覧の枠のdivが表示されるまで待機
    await page.$("div.htBlock-adjastableTableF_inner")

    const trList = await page.$$(
        "div.htBlock-adjastableTableF_inner > table > tbody > tr"
    );

    return trList;
}


/*
  日別データを取得
*/
export async function getDateHeaderTrList(page){

    // 日別データ（ヘッダ）
    const headerTrList = await page.$$(
        "div.htBlock-adjastableTableF_inner > table > thead > tr"
    );
    
    // 日付でソート
    for (const tr of await headerTrList) {
        const tdList = await tr.$$("th");
        const dateEle = await tdList[1];
        await dateEle.click();
    }
    await page.waitForLoadState("domcontentloaded");
    // await page.waitForTimeout(1000);
}

/*
  日別データを取得
*/
export async function getDateTrList(page){

    // 日別データ
    const dateTrList = await page.$$(
        "div.htBlock-adjastableTableF_inner > table > tbody > tr"
    );

    return dateTrList;
}

/*
  yyyy年MM月dd日HH時mm分 -> yyyy/MM/dd HH:mm
*/
function converteDateTime(datetime:string){
    const convDatetime = datetime.trim().replaceAll('\n','');
    const year = convDatetime.slice(0, 4);
    const month = convDatetime.slice(5, 7);
    const day = convDatetime.slice(8, 10);
    const hour = convDatetime.slice(11, 13);
    const minute = convDatetime.slice(14, 16);
    const formatted = `${year}/${month}/${day} ${hour}:${minute}`;
    return formatted;
}