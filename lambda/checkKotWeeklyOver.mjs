import { chromium as playwright } from "playwright";
import { expect } from "@playwright/test";
import chromium from '@sparticuz/chromium';
import { convertWeek, formatTime } from "./dateUtils.mjs";
import { OVERTIME_HOURS_IN_THE_LAST_WEEK } from "./constants.mjs";

/**
 * KOTの週4時間以上を確認し、文字列のリストを返します
 * 4時間以上が存在する場合：[氏名, 残業時間, 残業理由]
 * 4時間以上が存在しない場合：空のリスト
 * 
 * @param loginId ログインID 
 * @param loginPassword パスワード
 * @returns 先週/先々週の残業者一覧
 */
export async function checkKotWeeklyOver(loginId, loginPassword){
    try{
        // KOTの初回表示ガイドが表示されないようにする
        console.log('==== checkKotWeeklyOver Start ====');

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

        // 月別データ勤務のリンクをクリック
        const errorKinmu = await page.$("#montyl_working_summary_link");
        await errorKinmu?.click();

        await page.waitForLoadState("domcontentloaded");
        console.log('==== 月別データ勤務画面遷移完了 ====')

        // 右上の表示ボタンの出現を待機
        await page.waitForSelector("input#display_button");

        // 週別のラジオをクリック
        const radioWeek = await page.$("#radio_change_data_selection_type_week");
        await radioWeek?.click();
        await page.waitForLoadState("domcontentloaded");

        // 1週間前を取得して、変更する
        const lastWeek = convertWeek(1);
        // 月別データ一覧を取得
        const trList = getOrverTime(page, lastWeek);

        let checkOverList = [];
        let checkOverMap = new Map();
        let checkLastWeekExcessOverMap = new Map();
        let checkBeforeWeekExcessOverMap = new Map();

        for (const tr of await trList) {
            const tdList = await tr.$$("td");

            const tmpName = (await tdList[3].textContent());
            const name = tmpName.trim();

            const totalOverDt = await getTotalOverDt(tdList);
            const formatOverDt = formatTime(totalOverDt);

            checkOverMap.set(name, formatOverDt);

            // 4時間以上チェック
            if(totalOverDt < 4){
                // 4時間未満の場合はスキップ
                console.log(`==== 4時間未満のためスキップ ${name} 残業時間：${totalOverDt} ====`);
                continue;
            }

            console.log("先週が4時間以上:", name, formatOverDt);
            checkLastWeekExcessOverMap.set(name, formatOverDt);
        }

        // 2週間前を取得して、変更する
        const weekBeforeLast = convertWeek(2);
        // 月別データ一覧を取得
        const weekBeforeTrLast = getOrverTime(page, weekBeforeLast);
        for(const weekBeforeTr of await weekBeforeTrLast){
            const tdList = await weekBeforeTr.$$("td");

            const tmpName = (await tdList[3].textContent());
            const name = tmpName.trim();

            const totalOverDt = await getTotalOverDt(tdList);
            const formatOverDt = formatTime(totalOverDt);

            // 先々週の残業時間を設定
            const excessOver = checkLastWeekExcessOverMap.get(name);
            if(excessOver){
                checkLastWeekExcessOverMap.set(name, formatOverDt + " " + excessOver);
            }

            // 先々週が4時間以上
            if(totalOverDt >= 4){
                const lastWeekOver = checkOverMap.get(name);
                console.log(OVERTIME_HOURS_IN_THE_LAST_WEEK, name, formatOverDt + " " + lastWeekOver);
                checkBeforeWeekExcessOverMap.set(name, formatOverDt + " " + lastWeekOver);
            }
        }

        checkLastWeekExcessOverMap.forEach(
            (value, key) => {
                checkOverList.push([key, value]);
            }
        );
        checkOverList.push([OVERTIME_HOURS_IN_THE_LAST_WEEK, " "]);
        checkBeforeWeekExcessOverMap.forEach(
            (value, key) => {
                checkOverList.push([key, value]);
            }
        );

        return checkOverList;
    }catch(error){
        console.error('checkKotWeeklyOver Error:',error);
    }finally{
        console.log('==== checkKotWeeklyOver End ====');
    }
}

/*
  残業時間を取得
*/
export async function getOrverTime(page, lastWeek){
    // カレンダーをクリック
    const calendarPicker = await page.$("#select_year_month_week_picker");
    await calendarPicker?.click();

    // inputタグに値を設定
    if (calendarPicker) {
        await calendarPicker.evaluate((element, value) => {
            element.value = value;
            // changeイベントを発火
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }, lastWeek);
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

/*
  残業時間を加算
*/
export async function getTotalOverDt(tdList){
    const tmpName = (await tdList[3].textContent());
    const name = tmpName.trim();
    // 残業時間
    const tmpOverDt = (await tdList[33].textContent());
    const overDt = Number(tmpOverDt.trim());
    // 割増残業
    const tmpAddOverDt = (await tdList[34].textContent());
    const addOverDt = Number(tmpAddOverDt.trim());
    // 深夜所定外
    const tmpExtraNightDt = (await tdList[36].textContent());
    const extraNightDt = Number(tmpExtraNightDt.trim());
    // 深夜残業
    const tmpOverNightDt = (await tdList[37].textContent());
    const overNightDt = Number(tmpOverNightDt.trim());
    // 割増深夜残業
    const tmpAddOverNightDt = (await tdList[38].textContent());
    const addOverNightDt = Number(tmpAddOverNightDt.trim());
    // 法定休日所定外
    const tmpExtraBankHolidayDt = (await tdList[40].textContent());
    const extraBankHolidayDt = Number(tmpExtraBankHolidayDt.trim());
    // 法定休日残業
    const tmpBankHolidayOverDt = (await tdList[41].textContent());
    const bankHolidayOverDt = Number(tmpBankHolidayOverDt.trim());
    // 法定休日深夜所定外
    const tmpExtraBankHolidayNightDt = (await tdList[43].textContent());
    const extraBankHolidayNightDt = Number(tmpExtraBankHolidayNightDt.trim());
    // 法定休日深夜残業
    const tmpExtraBankHolidayOverNightDt = (await tdList[44].textContent());
    const extraBankHolidayoverNightDt = Number(tmpExtraBankHolidayOverNightDt.trim());
    // 法定外休日所定外
    const tmpExtraNonstatutoryHolidayDt = (await tdList[46].textContent());
    const extraNonstatutoryHolidayDt = Number(tmpExtraNonstatutoryHolidayDt.trim());
    // 法定外休日残業
    const tmpNonstatutoryHolidayOverDt = (await tdList[47].textContent());
    const nonstatutoryHolidayOverDt = Number(tmpNonstatutoryHolidayOverDt.trim());
    // 法定外休日深夜所定外
    const tmpExtraNonstatutoryHolidayNightDt = (await tdList[49].textContent());
    const extraNonstatutoryHolidayNightDt = Number(tmpExtraNonstatutoryHolidayNightDt.trim());
    // 法定外休日深夜残業
    const tmpExtraNonstatutoryHolidayOverNightDt = (await tdList[50].textContent());
    const extraNonstatutoryHolidayoverNightDt = Number(tmpExtraNonstatutoryHolidayOverNightDt.trim());

    const totalOverDt = overDt + addOverDt + extraNightDt + overNightDt + addOverNightDt 
    + extraBankHolidayDt + bankHolidayOverDt + extraBankHolidayNightDt + extraBankHolidayoverNightDt
    + extraNonstatutoryHolidayDt + nonstatutoryHolidayOverDt + extraNonstatutoryHolidayNightDt + extraNonstatutoryHolidayoverNightDt;

    console.log("残業時間:", name, overDt, addOverDt, extraNightDt, overNightDt, addOverNightDt, 
        extraBankHolidayDt, bankHolidayOverDt, 
        extraBankHolidayNightDt, extraBankHolidayoverNightDt, 
        extraNonstatutoryHolidayDt, nonstatutoryHolidayOverDt, 
        extraNonstatutoryHolidayNightDt, extraNonstatutoryHolidayoverNightDt);
    return totalOverDt;
}