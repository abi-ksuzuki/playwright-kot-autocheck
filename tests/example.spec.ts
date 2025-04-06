import { Page, test } from "@playwright/test";
import { postSlack } from "./postSlack";
import { checkQuestionnaire } from "./checkQuestionnaire";
import { checkReport } from "./checkReport";
import { getTargetMembers } from "./getTargetMembers";

test("デスクネッツの対象抽出", async ({ page }) => {
  /*
    想定されるテストケース
      1. そもそも打刻エラー一覧のdivが存在しない打刻エラーなし
        月初など
      2. 打刻エラー一覧が存在し、全て申請済みのため打刻エラーなし
      3. 打刻エラーあり
      4. その他エラーケース
  */
 test.setTimeout(600000);
  try{

    console.log('==== test Start ====');
    const targetMemberList = await getTargetMembers({ page });
    console.log("対象者一覧:", targetMemberList);
    const post: string[][] = [];
    if(targetMemberList){
      for(const member of targetMemberList){
        post.push([member, " ", " "]);
      }
      await postSlack(post);
    }else{
      throw new Error("checkKot errorList is undefined");
    }
  }catch(error){
    console.error('test Error:',error);
  }finally{
    console.log('==== test End ====');
  }
});

test("デスクネッツアンケート確認とslack送信", async ({ page }) => {
 test.setTimeout(600000);
  try{

    console.log('==== test Start ====');
    const unansweredList = await checkQuestionnaire({ page });
    console.log("アンケート未回答結果:", unansweredList);
    if(unansweredList){
      await postSlack(unansweredList);
    }else{
      throw new Error("checkKot errorList is undefined");
    }
  }catch(error){
    console.error('test Error:',error);
  }finally{
    console.log('==== test End ====');
  }
});

test("デスクネッツ回覧・レポート確認とslack送信", async ({ page }) => {
 test.setTimeout(600000);
  try{

    console.log('==== test Start ====');
    // 対象を取得
    const targetMemberList = await getTargetMembers({ page });

    const unansweredList = await checkReport({ page, targetMemberList });
    console.log("回覧・レポート未回答結果:", unansweredList);
    if(unansweredList){
      await postSlack(unansweredList);
    }else{
      throw new Error("checkKot errorList is undefined");
    }
  }catch(error){
    console.error('test Error:',error);
  }finally{
    console.log('==== test End ====');
  }
});
