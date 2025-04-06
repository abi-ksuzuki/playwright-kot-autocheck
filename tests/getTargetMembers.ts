import { expect } from "@playwright/test";
import { getNextBusinessDay } from "./getNextBusinessDay";

export async function getTargetMembers({ page }){
    /*
        デスクネッツのアンケートを確認し、未回答者のリストを返します
        未回答者が存在する場合：
            [アンケート表題, 期限, 未回答者（改行付き）]
        未回答者が存在しない場合：
            空のリスト
    */
    try{
        console.log('==== getTargetMembers Start ====');

        // デスクネッツのログイン画面経由でアンケート画面に遷移する
        await page.goto("https://abi.dn-cloud.com/cgi-bin/dneo/dneo.cgi?cmd=usetindex&log=on");
        
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

        // 組織選択をクリック
        await page.locator('input.jco-sel-btn').waitFor();
        await page.locator('input.jco-sel-btn').click();

        // 対象の所属をクリック
        const department = process.env.TARGET_DEPARTMENT as string;
        await page.locator('a:has-text("' + department + '")').first().waitFor();
        await page.locator('a:has-text("' + department + '")').first().click();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 対象の社員を取得
        const memberList = await pagingGetMemberList(page);
        return memberList;
    }catch(error){
        console.error('getTargetMembers Error:',error);
    }finally{
        console.log('==== getTargetMembers End ====');
    }
}

/*
  対象者をページングして確認する
*/
async function pagingGetMemberList(page){
    let memberList: string[] = [];
    for (let i = 0; i < 1000 ; i++) {
        let members = await getMember(page);
        memberList.push(...members);
         const nextPage = await page.$("li.co-page-next > a");
         if(!nextPage){
             // 次ページがないので終了
             break;
         }
         await nextPage?.click();
         await new Promise(resolve => setTimeout(resolve, 1000));
     }

     return memberList;
}

/*
  対象者を取得
*/
async function getMember(page){
    
    const membersTable = await page.$$(
        "table.co-table-list > tbody > tr"
    );

    let memberList: string[] = [];
    for (const tr of membersTable) {
        const tdList = await tr.$$("td");

        const tmpName = (await tdList[0].textContent()) as string;
        const name = tmpName.trim();
        memberList.push(name);
    }
    return memberList;
}
