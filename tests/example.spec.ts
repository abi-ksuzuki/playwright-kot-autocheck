import { test } from "@playwright/test";
import { checkKotErrorStamp } from "./checkKotErrorStamp";
import { checkKotNoStamp } from "./checkKotNoStamp";
import { postSlack } from "./postSlack";
import { checkKotLastMonthErrorStamp } from "./checkKotLastMonthErrorStamp";
import { checkKotLastMonthNoStamp } from "./checkKotLastMonthNoStamp";

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
    console.log("errorList",errorList)
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
    console.log("errorList",errorList)
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

test("先月のKOT打刻エラー確認とslack送信", async ({ page }) => {
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
    const errorList = await checkKotLastMonthErrorStamp({ page });
    console.log("errorList",errorList)
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

test("先月のKOT打刻なし/スケジュールあり確認とslack送信", async ({ page }) => {
 test.setTimeout(600000);
  try{

    console.log('==== test Start ====');
    const errorList = await checkKotLastMonthNoStamp({ page });
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
