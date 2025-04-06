import { test } from "@playwright/test";
import { checkKotErrorStamp } from "./checkKotErrorStamp";
import { checkKotNoStamp } from "./checkKotNoStamp";
import { postLastMonthOvertimeSlack, postSlack, postSlackOverTime } from "./postSlack";
import { checkKotWeeklyOver } from "./checkKotWeeklyOver";
import { checkOverApplication } from "./checkOverApplication";
import { checkKotWeeklyOrverApplication } from "./checkKotWeeklyOrverApplication";
import { checkKotLastMonthOver } from "./checkKotLastMonthOver";

test("KOT打刻エラー確認とslack送信", async ({ page }) => {
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
    const errorList = await checkKotErrorStamp({ page });
    if(errorList){
      await postSlack(errorList);
    }else{
      throw new Error("checkKot errorList is undefined")
    }

  }catch(error){
    console.error('test Error:',error);
  }finally{
    console.log('==== test End ====');
  }
});

test("KOT打刻なし/スケジュールあり確認とslack送信", async ({ page }) => {
 test.setTimeout(600000);
  try{

    console.log('==== test Start ====');
    const errorList = await checkKotNoStamp({ page });
    if(errorList){
      await postSlack(errorList);
    }else{
      throw new Error("checkKot errorList is undefined")
    }

  }catch(error){
    console.error('test Error:',error);
  }finally{
    console.log('==== test End ====');
  }
});

test("KOT残業時間4時間以上とslack送信", async ({ page }) => {
  test.setTimeout(600000);
   try{
 
    console.log('==== test Start ====');
    // 残業時間4時間以上の対象一覧
    const overTimeList = await checkKotWeeklyOver({ page });
    if(!overTimeList){
      console.log('==== 4時間以上残業の対象者なし ====');
      return;
    }

    // 出力したCSVの取得
    const csvValues = await checkOverApplication();
  
    // 残業時間4時間以上の残業申請理由を設定
    const resonOrverTimeList = await checkKotWeeklyOrverApplication(overTimeList, csvValues);
    if(resonOrverTimeList){
      await postSlackOverTime(resonOrverTimeList);
    }else{
      throw new Error("checkKot errorList is undefined")
    }
 
   }catch(error){
     console.error('test Error:',error);
   }finally{
     console.log('==== test End ====');
   }
 });

 test("KOT月毎の残業時間とslack送信", async ({ page }) => {
  test.setTimeout(600000);
   try{
 
    console.log('==== test Start ====');
    // 先月の残業時間の一覧
    const overTimeList = await checkKotLastMonthOver({ page });
    if(overTimeList !== undefined && overTimeList){
      await postLastMonthOvertimeSlack(overTimeList);
    }else{
      throw new Error("checkKot errorList is undefined")
    }
 
   }catch(error){
     console.error('test Error:',error);
   }finally{
     console.log('==== test End ====');
   }
 });