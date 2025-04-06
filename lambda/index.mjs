import { checkKotWeeklyOver } from "./checkKotWeeklyOver.mjs";
import { checkOverApplication } from "./checkOverApplication.mjs";
import { checkKotWeeklyOrverApplication } from "./checkKotWeeklyOrverApplication.mjs";
import { postSlackOverTime } from "./postSlack.mjs";

export const handler = async () => {
    try{

      console.log('==== test Start ====');
            console.log('==== test Start ====');
                  console.log('==== test Start ====');
      const loginId = process.env.KOT_LOGIN_ID;
      const loginPassword = process.env.KOT_LOGIN_PASSWORD;

      // 残業4時間以上チェック
      checkOverTime(loginId, loginPassword);
      
      // 先月残業時間取得
      getLastMonthOverTime(loginId, loginPassword);

    }catch(error){
      console.error('test Error:',error);
    }finally{
      console.log('==== test End ====');
    }
};

handler();

export const checkOverTime = async (loginId, loginPassword) => {
  // 残業時間4時間以上の対象一覧
  const overTimeList = await checkKotWeeklyOver(loginId, loginPassword);
  if(!overTimeList){
    console.log('==== 4時間以上残業の対象者なし ====');
    await postSlackOverTime(overTimeList);
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
}

export const getLastMonthOverTime = async (loginId, loginPassword) => {
  // 先月の残業時間の一覧
  const overTimeList = await checkKotLastMonthOver({ page });
  if(overTimeList !== undefined && overTimeList){
    await postLastMonthOvertimeSlack(overTimeList);
  }else{
    throw new Error("checkKot errorList is undefined")
  }
}