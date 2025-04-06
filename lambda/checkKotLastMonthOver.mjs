import { expect } from "@playwright/test";
import { formatMonth, formatTime, getMonthAgo } from "./dateUtils";

/**
 * 先月の残業時間を算出する
 * 
 * @param loginId ログインID 
 * @param loginPassword パスワード
 * @returns 先月の残業時間の一覧
 */
export async function checkKotLastMonthOver(loginId, loginPassword){
    try{
        // KOTの初回表示ガイドが表示されないようにする
        console.log('==== checkKotLastMonthOver Start ====');
        await page.context().addInitScript(() => {
            // @ts-ignore
            window.localStorage.setItem("intro", "checked");
        });
        
        // KOT勤怠管理のログイン画面表示
        await page.goto("https://s2.ta.kingoftime.jp/admin");
        
        // HTMLタイトルの確認
        await expect(page).toHaveTitle(/KING OF TIME/);
        
        // ログインID入力
        const loginIdPage = await page.$("input#login_id");
        expect(loginIdPage).not.toBeNull();
        loginIdPage?.fill(loginId);
        
        // パスワード入力
        const loginPasswordPage = await page.$("input#login_password");
        expect(loginPasswordPage).not.toBeNull();
        loginPasswordPage?.fill(loginPassword);
        
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
        
        // 月別データ勤務のリンクをクリック
        const errorKinmu = await page.$("#montyl_working_summary_link");
        await errorKinmu?.click();

        await page.waitForLoadState("domcontentloaded");
        console.log('==== 月別データ勤務画面遷移完了 ====')
        
        // 右上の表示ボタンの出現を待機
        await page.waitForSelector("input#display_button");

        // 前月を取得して、変更する
        const lastMonth = formatMonth(getMonthAgo(1), "/");
        // 月別データ一覧を取得
        const trList = getOrverTime(page, lastMonth);

        let checkOverList = [];
        let checkOverMap = new Map();

        for (const tr of await trList) {
            const tdList = await tr.$$("td");
        
            const tmpName = (await tdList[3].textContent());
            const name = tmpName.trim();
            const tmpOverDt = (await tdList[34].textContent());
            const overDt = Number(tmpOverDt.trim());
            const formatOverDt = formatTime(overDt);
            checkOverMap.set(name, overDt);
            console.log("先月の残業時間:", name, formatOverDt);
        }
        
        const sortedArray = [...checkOverMap].sort((a, b) => b[1] - a[1]);

        sortedArray.forEach(
            (value, key) => {
                checkOverList.push([value[0].toString(), formatTime(value[1])]);
            }
        );

        return checkOverList;
    }catch(error){
        console.error('checkKotLastMonthOver Error:',error);
    }finally{
        console.log('==== checkKotLastMonthOver End ====');
    }
}

/*
  残業時間を取得
*/
export async function getOrverTime(page, lastMonth){
    // カレンダーをクリック
    const calendarPicker = await page.$("#select_year_month_picker");
    await calendarPicker?.click();

    // inputタグに値を設定
    if (calendarPicker) {
        await calendarPicker.evaluate((element, value) => {
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
    const errorKinmuDiv = await page.$("div.htBlock-adjastableTableF_inner")
        
    const trList = await page.$$(
        "div.htBlock-adjastableTableF_inner > table > tbody > tr"
    );

    return trList;
}