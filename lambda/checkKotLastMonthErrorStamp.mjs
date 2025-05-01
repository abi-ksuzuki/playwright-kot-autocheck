import { chromium as playwright } from "playwright";
import { expect } from "@playwright/test";
import chromium from '@sparticuz/chromium';
import { converteLastMonth, converteLastYear } from "./dateUtils.mjs";

export async function checkKotLastMonthErrorStamp(loginId, loginPassword){
    /*
        KOTの未申請の打刻エラーを確認し、文字列のリストを返します
        打刻エラーが存在する場合：
            [氏名, 日付, エラー理由]
        打刻エラーが存在しない場合：
            空のリスト
    */
    try{
        // KOTの初回表示ガイドが表示されないようにする
        console.log('==== checkKotLastMonthErrorStamp Start ====');

        const browser = await playwright.launch({
            args: chromium.args, // ライブラリ提供
            headless: true,
            executablePath: await chromium.executablePath() // ライブラリ提供(Chromium配置場所)
        });
        const page = await browser.newPage();
        page.setDefaultTimeout(60000);

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
        
        const errorKinmu = await page.$("li#in_complete_working > a");
        // await errorKinmu?.isVisible(); を使用すると
        // errorKinmuがNullの場合undefinedが返り打刻エラー勤務画面遷移完了してから
        // 再評価されて"打刻エラーはありません"となり処理が中断されてしまうことがある
        let errorKinmuVisible = false;
        if(errorKinmu){
            errorKinmuVisible = await errorKinmu.isVisible();
            if (!errorKinmuVisible) {
            console.log("打刻エラーはありません");
            return [];
            }
        }else{
            console.log("打刻エラーはありません");
            return [];
        }
        
        // 打刻エラー勤務のリンクをクリック
        await errorKinmu?.click();
        await page.waitForLoadState("domcontentloaded");
        console.log('==== 打刻エラー勤務画面遷移完了 ====')
        
        // 右上の表示ボタンの出現を待機
        await page.waitForSelector("input#display_button");
    
        // 先月分の取得
        const month = await page.$('input[type="hidden"]#month');
        if (month) {
            const thisMonth = await month.evaluate(input => input.value);
            const lastMonth = converteLastMonth(thisMonth);
            // 去年を取得
            if(lastMonth === '12'){
                const year = await page.$('input[type="hidden"]#year');
                if(year){
                    const thisYear = await year.evaluate(input => input.value);
                    const lastYear = converteLastYear(thisYear);
                    // 値を設定
                    await year.evaluate((input, value) => {
                        input.value = value;
                    }, lastYear);
                }
            }
            // 値を設定
            await month.evaluate((input, value) => {
                input.value = value;
            }, lastMonth);
        }
        
        const dispBtn = await page.$("input#display_button");
        await dispBtn?.click();
        await page.waitForLoadState("domcontentloaded");
        
        // 打刻エラーの一覧の枠のdivが表示されるまで待機
        const errorKinmuDiv = await page.$("div.htBlock-adjastableTableF_inner")
        // 月初など打刻エラーが存在しない場合はdivが表示されないことがある
        if(!errorKinmuDiv){
            console.log("打刻エラーはありません");
            return [];
        }
        
        const trList = await page.$$(
            "div.htBlock-adjastableTableF_inner > table > tbody > tr"
        );

        let errorList = [];
        let lineArr = [];
        for (const tr of trList) {
            const tdList = await tr.$$("td");
        
            const tmpName = (await tdList[2].textContent());
            const name = tmpName.trim();
            const tmpDt = (await tdList[6].textContent());
            const dt = tmpDt.trim();
            const tmpErrorReason = (await tdList[9].textContent());
            const errorReason = tmpErrorReason.trim();
        
            // 申請有無判定
            const shinseiIcon = await tdList[9].$("span.specific-requested");
            if (shinseiIcon) {
                // 申請済みの場合はスキップ
                console.log(`==== 申請済みのためスキップ ${name} ${dt} ====`);
                continue;
            }
        
            lineArr = [name, dt, errorReason];
            console.log(lineArr.join(" "));
            errorList.push(lineArr)
        }
        return errorList;
    }catch(error){
        console.error('checkKotLastMonthErrorStamp Error:',error);
    }finally{
        console.log('==== checkKotLastMonthErrorStamp End ====');
    }
}