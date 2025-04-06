import { expect } from "@playwright/test";
import { getNextBusinessDay } from "./getNextBusinessDay";

export async function checkQuestionnaire({ page }){
    /*
        デスクネッツのアンケートを確認し、未回答者のリストを返します
        未回答者が存在する場合：
            [アンケート表題, 期限, 未回答者（改行付き）]
        未回答者が存在しない場合：
            空のリスト
    */
    try{
        console.log('==== checkQuestionnaire Start ====');

        // デスクネッツのログイン画面経由でアンケート画面に遷移する
        await page.goto("https://abi.dn-cloud.com/cgi-bin/dneo/zenquete.cgi?cmd=enqindex&log=on");
        
        // HTMLタイトルの確認
        await expect(page).toHaveTitle(/desknet's NEO/);
        
        // ログインID入力
        const loginId = await page.$("input[name=UserID]");
        expect(loginId).not.toBeNull();
        loginId?.fill(process.env.LOGIN_ID as string);
        
        // パスワード入力
        const loginPassword = await page.$("input[name=_word]");
        expect(loginPassword).not.toBeNull();
        loginPassword?.fill(process.env.LOGIN_PASSWORD as string);
        
        // ログインボタンクリック
        const loginButton = await page.$("#login-btn");
        expect(loginButton).not.toBeNull();
        await loginButton?.click();

        await page.waitForLoadState("domcontentloaded");
        console.log('==== ログイン完了 ====')

        // アンケート一覧の出現を待つ
        await page.waitForSelector("#listfrm");

        // 未回答のアンケートを確認
        const questionnaireList = await questionnaireUnansweredList(page);

        // 回答済を指定
        const questionnaireType = await page.locator('#enq-list-type-sel');
        await questionnaireType.selectOption('2');
        await page.waitForLoadState("domcontentloaded");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 回答済のアンケートを確認
        const answeredList = await questionnaireUnansweredList(page);
        questionnaireList.push(...answeredList);

        return questionnaireList;
    }catch(error){
        console.error('checkQuestionnaire Error:',error);
    }finally{
        console.log('==== checkQuestionnaire End ====');
    }
}

/*
  アンケートをチェック
*/
async function questionnaireUnansweredList(page){
    
    const alreadyAnswered = await page.$$(
        "div.enq-recv > table > tbody > tr"
    );

    let questionnaireList: string[][] = [];
    let lineArr: string[] = [];
    let i = 1;
    for (const tr of alreadyAnswered) {
        const tdList = await tr.$$("td");

        const status = (await tdList[2].textContent()) as string;
        const tmpTitle = (await tdList[3].textContent()) as string;
        const title = tmpTitle.trim() + "\n";
        const tmpLimit = (await tdList[7].textContent()) as string;
        const limit = tmpLimit.trim();
        const limitList = limit.split(" ");
        const convLimitDate = converteDate(limitList[0]);
        const convLimitList = [convLimitDate, limitList[1], limitList[2]];
        const tmpCreate = (await tdList[5].textContent()) as string;
        const create = converteDate(tmpCreate.trim());

        // 作成日が3ヶ月以降のアンケートは処理終了する
        const targetLimitDate = new Date();
        targetLimitDate.setMonth(targetLimitDate.getMonth() - 3);
        if(new Date(create) < targetLimitDate){
            return questionnaireList;
        }

        // 状態が完了の場合、処理終了
        if(status == "完了"){
            console.log("完了となったアンケート", title);
            i++;
            continue;
        }

        // 5営業日後を取得
        const limitDate = getNextBusinessDay(new Date(), 5);
        // 締切が5営業日より未来日の場合スキップ
        if(new Date(convLimitDate) > limitDate){
            console.log("締切が5営業日より未来日なのでスキップ。", "表題：", title, "締切日：", convLimitDate);
            // await clickBackButton(page);
            i++;
            continue;
        }

        // 表題のリンクをクリック
        const updatedTitleLink = await page.waitForSelector('tr:nth-child(' + i + ') td:nth-child(4) > a', { state: 'visible' });
        await updatedTitleLink?.click();
        await page.waitForLoadState("domcontentloaded");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 回答履歴をクリック
        const answerHistoryButton = await page.$("li.jenq-tab-route > a");
        // 回答履歴が非表示の場合スキップ
        if(!answerHistoryButton){
            lineArr = [title, convLimitList.join(" "), "回答履歴がないため、各自確認をお願いします。"];
            questionnaireList.push(lineArr);
            await clickBackButton(page);
            i++;
            continue;
        }

        await answerHistoryButton?.click();
        await page.waitForLoadState("domcontentloaded");

        // 未回答を指定
        const select = await page.locator('select[name=srchanswer]');
        await select.selectOption('2');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ページングをしていく
        const unansweredList = await pagingAanswerList(page);
        lineArr = [title, convLimitList.join(" "), unansweredList.join(" ")];
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
async function pagingAanswerList(page){
    let unansweredList: string[] = [];
    for (let i = 0; i < 1000 ; i++) {
        let unanswered = await getNoAanswerList(page);
        unansweredList.push(...unanswered);
         const nextPage = await page.$("li.co-page-next > a");
         if(!nextPage){
             // 次ページがないので終了
             break;
         }
         await nextPage?.click();
         await new Promise(resolve => setTimeout(resolve, 1000));
     }

     return unansweredList;
}

/*
  未回答者を情報を取得
*/
async function getNoAanswerList(page){
    let unAnsweredList: string[] = [];
    // 回答履歴を取得
    const answerList = await page.$$(
            "div.enq-view-answers > table > tbody > tr"
    );

    for (const tr of answerList) {
        const tdList = await tr.$$("td");
        
        const tmpDepartment = (await tdList[1].textContent()) as string;
        const department = tmpDepartment.trim();

        // SI部か否かを判定
        if(!department.includes(process.env.TARGET_DEPARTMENT as string)){
            continue;
        }

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

        unAnsweredList.push(name + "\n");
    }
    return unAnsweredList;
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