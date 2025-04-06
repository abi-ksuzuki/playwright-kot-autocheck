import { expect } from "@playwright/test";
import { getNextBusinessDay } from "./getNextBusinessDay";
import { parse } from "date-fns";

export async function checkReport({ page, targetMemberList}){
    /*
        デスクネッツの回覧・レポートを確認し、未確認者のリストを返します
        未回答者が存在する場合：
            [アンケート表題, 期限, 未回答者（改行付き）]
        未回答者が存在しない場合：
            空のリスト
    */
    try{
        console.log('==== checkReport Start ====');

        // デスクネッツのログイン画面経由でアンケート画面に遷移する
        await page.goto("https://abi.dn-cloud.com/cgi-bin/dneo/zcreport.cgi?cmd=creportindex&log=on");
        
        // HTMLタイトルの確認
        await expect(page).toHaveTitle(/desknet's NEO/);
        
        // ログインID入力
        // const loginId = await page.$("input[name=UserID]");
        // expect(loginId).not.toBeNull();
        // loginId?.fill(process.env.LOGIN_ID as string);
        
        // // パスワード入力
        // const loginPassword = await page.$("input[name=_word]");
        // expect(loginPassword).not.toBeNull();
        // loginPassword?.fill(process.env.LOGIN_PASSWORD as string);
        
        // // ログインボタンクリック
        // const loginButton = await page.$("#login-btn");
        // expect(loginButton).not.toBeNull();
        // await loginButton?.click();

        // await page.waitForLoadState("domcontentloaded");
        console.log('==== ログイン完了 ====')

        // レポート一覧の出現を待つ
        await page.waitForSelector("div.ui-layout-pane-center");

        // 新着/未確認のレポートを確認
        const questionnaireList = await reportUnchekerList(page, targetMemberList, false);

        // 確認済を指定
        const confirmed = await page.locator('a.co-listview-item-inside').filter({ hasText: '確認済み' });
        confirmed?.click();
        await page.waitForLoadState("domcontentloaded");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 確認済のアンケートを確認
        const answeredList = await reportUnchekerList(page, targetMemberList, true);
        questionnaireList.push(...answeredList);

        return questionnaireList;
    }catch(error){
        console.error('checkReport Error:',error);
    }finally{
        console.log('==== checkReport End ====');
    }
}

/*
  レポートをチェック
*/
async function reportUnchekerList(page, targetMemberList: string[], isChecked){
    
    const alreadyAnswered = await page.$$(
        "div.co-listview-scroll > table > tbody > tr"
    );

    let questionnaireList: string[][] = [];
    let lineArr: string[] = [];
    let i = 1;
    
    let titleNum = 3;
    let createNum = 4;
    let linkNum = 4;

    if(isChecked){
        titleNum = 5;
        createNum = 6;
        linkNum = 6;
    }

    // 5営業日後を取得
    const displayDate = getNextBusinessDay(new Date(), 100);

    for (const tr of alreadyAnswered) {
        const tdList = await tr.$$("td");

        const status = isChecked ? (await tdList[4].textContent()) as string : "";
    
        const tmpTitle = (await tdList[titleNum].textContent()) as string;
        const title = tmpTitle.trim() + "\n";
        const tmpCreate = (await tdList[createNum].textContent()) as string;
        const createDate = tmpCreate.trim();
        const convCreateDate = converteDate(createDate);

        // 状態が完了の場合、処理終了
        if(status == "完了"){
            console.log("完了となったアンケート", (await tdList[titleNum].textContent()));
            i++;
            continue;
        }

        // 作成日が3ヶ月以降のアンケートは処理終了する
        const targetLimitDate = new Date();
        targetLimitDate.setMonth(targetLimitDate.getMonth() - 3);
        if(new Date(convCreateDate) < targetLimitDate){
            return questionnaireList;
        }

        // 表題のリンクをクリック
        const updatedTitleLink = await page.waitForSelector('tr:nth-child(' + i + ') td:nth-child(' + linkNum + ') > a', { state: 'visible' });
        await updatedTitleLink?.click();
        await page.waitForLoadState("domcontentloaded");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 締切日を取得
        const limitVisible = await page.locator("span.creport-disp-period").isVisible();
        if(limitVisible){
            const tmpLimitDate = (await page.locator("span.creport-disp-period").textContent()) as string;
            const limitDateAndRemaining = tmpLimitDate.trim();

            // 締切日が設定されている場合、チェック
            if(tmpLimitDate){

                const limitList = limitDateAndRemaining.split(" ");
                const limit = limitList[0].replace(/（.*?）|\(.*?\)/g, "");
                const limitDate = parse(limit, "yyyy年MM月dd日", new Date());

               // 締切が5営業日より未来日の場合スキップ
                if(new Date(limitDate) > displayDate){
                    console.log("締切が5営業日より未来日なのでスキップ。", "表題：", title, "締切日：", tmpLimitDate);
                    await clickBackButton(page);
                    i++;
                    continue;
                }
            }
        }

        // 未確認を指定
        const select = await page.locator('select.jcreport-comments-filter');
        await select.selectOption('nocheck');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ページングをしていく
        const unansweredList = await pagingAanswerList(page, targetMemberList);
        // lineArr = [title, convLimitList.join(" "), unansweredList.join(" ")];
        
        lineArr = [title, "", unansweredList.join(" ")];
        console.log(lineArr.join(" "));
        questionnaireList.push(lineArr);

        // 戻るボタンをクリック
        await clickBackButton(page);
        i++;
    }
    return questionnaireList;
}

/*
  回答履歴をページングして確認する
*/
async function pagingAanswerList(page, targetMemberList: string[]){
    let unansweredList: string[] = [];
    for (let i = 0; i < 1000 ; i++) {
        let bleakFlg = false;
        let unanswered = await getNoCheckerList(page, targetMemberList);
        unansweredList.push(...unanswered);
         const nextPages = await page.$$("#creport-view-comment > div > div > ul.co-paging > li.co-page-next > a");
         for (const element of nextPages) {
            const isBlock = await element.evaluate(el => window.getComputedStyle(el).display === 'block');
            if (isBlock) {
                await element.click();
                bleakFlg = true;
                break; // 最初に見つかった要素のみクリック（不要なら削除）
            }
        }

        if(!bleakFlg){
            break;
        }

         await new Promise(resolve => setTimeout(resolve, 1000));
     }

     return unansweredList;
}

/*
  未確認者を情報を取得
*/
async function getNoCheckerList(page, targetMemberList: string[]){
    let unCheckersList: string[] = [];
    // 確認履歴を取得
    const answerList = await page.$$(
            "table.co-table-list creport-tos-table > tbody > tr"
    );

    for (const tr of answerList) {
        const tdList = await tr.$$("td");

        const tmpName = (await tdList[0].textContent()) as string;
        const name = tmpName.trim();

        // 休職者か否かを判定
        let passEmployees: string[] = [];
        if(process.env.PASS_EMPLOYEE !== undefined){
            passEmployees = process.env.PASS_EMPLOYEE.split(',');
        }
        if(passEmployees.includes(name)){
            console.log(`==== 休職中の社員のためスキップ ${name} ====`);
            continue;
        }

        // 対象社員の場合設定する
        if(targetMemberList.includes(name)){
            unCheckersList.push(name + "\n");
        }
    }
    return unCheckersList;
}

/*
  年がない日付をyyyy/MM/ddに変換
*/
function converteDate(date: string){
    const regex = new RegExp(date, "g"); // ターゲット文字列にマッチする正規表現
    const matches = "/".match(regex); // マッチ結果を取得
    const matchNum = matches ? matches.length : 0; 
    if(matchNum == 2){
        return date;
    }

    const convertDate = new Date().getFullYear() + "/" + date;
    return convertDate;
}

/*
  戻るボタンをクリック
*/
async function clickBackButton(page){
    const backButton = await page.$("a.co-pageback");
    await backButton?.click();
    await page.waitForLoadState("domcontentloaded");
}