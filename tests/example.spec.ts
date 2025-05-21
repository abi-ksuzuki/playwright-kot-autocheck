import { test } from "@playwright/test";
import { postSlackAbiWork } from "./postSlack";
import { checkKotAbiWork } from "./checkKotAbiWork";
import { createTsv } from "./createTsv";

test("ABI業務時間算出とslack送信", async ({ page }) => {
  test.setTimeout(1200000);
   try{
 
    console.log('==== test Start ====');
    // ABI業務の対象一覧
    const overTimeList = await checkKotAbiWork({ page });
    if(!overTimeList){
      console.log('==== ABI業務の対象者なし ====');
      return;
    }
    
    // TSVファイルの作成
    const tsvFile = createTsv(overTimeList);
    if(!tsvFile){
      throw new Error("checkKot tsvFile is undefined")
    }

    if(overTimeList){
      await postSlackAbiWork(overTimeList, tsvFile);
    }else{
      throw new Error("checkKot errorList is undefined")
    }
 
   }catch(error){
     console.error('test Error:',error);
   }finally{
     console.log('==== test End ====');
   }
 });