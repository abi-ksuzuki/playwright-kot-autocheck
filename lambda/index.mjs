import { checkKotErrorStamp } from "./checkKotErrorStamp.mjs";
import { checkKotNoStamp } from "./checkKotNoStamp.mjs";
import { checkKotLastMonthErrorStamp } from "./checkKotLastMonthErrorStamp.mjs";
import { checkKotLastMonthNoStamp } from "./checkKotLastMonthNoStamp.mjs";
import { postSlack } from "./postSlack.mjs";
import { getNextBusinessDay } from "./dateUtils.mjs";

export const handler = async () => {
    try{

        console.log('==== test Start ====');
        let errorList = []
        const loginIds = process.env.KOT_LOGIN_ID.split(',');
        const loginPasswords = process.env.KOT_LOGIN_PASSWORD.split(',');

        const nowDate = new Date();
        const nowMonthFirst = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        const dayToAdd = process.env.DAY_TO_ADD;
        const nextBusinessDay = getNextBusinessDay(nowMonthFirst, dayToAdd);

        // 指定した営業日まで先月を出力する
        if(nowDate <= nextBusinessDay){
          console.log('先月の打刻出力');
          // 各グループの認証情報ごと
          for (let i = 0; i < loginIds.length; i += 1) {
            // 打刻エラー確認
            const checkKotLastMonthErrorStampResult = await checkKotLastMonthErrorStamp(loginIds[i],loginPasswords[i]);
            if(checkKotLastMonthErrorStampResult){
              errorList = errorList.concat(checkKotLastMonthErrorStampResult);
            }else{
              throw new Error("checkKotLastMonthErrorStamp result is undefined")
            }

            // 打刻なし/スケジュールあり確認
            const checkKotLastMonthNoStampResult = await checkKotLastMonthNoStamp(loginIds[i],loginPasswords[i]);
            if(checkKotLastMonthNoStampResult){
              errorList = errorList.concat(checkKotLastMonthNoStampResult);
            }else{
              throw new Error("checkKotLastMonthNoStamp result is undefined")
            }
          }
        }

        // 各グループの認証情報ごと
        for (let i = 0; i < loginIds.length; i += 1) {
          let groupErrorList = [];
          // 打刻エラー確認
          const checkKotErrorStampResult = await checkKotErrorStamp(loginIds[i],loginPasswords[i]);
          if(checkKotErrorStampResult){
            groupErrorList = groupErrorList.concat(checkKotErrorStampResult);
          }else{
            throw new Error("checkKotErrorStamp result is undefined")
          }

          // 打刻なし/スケジュールあり確認
          const checkKotNoStampResult = await checkKotNoStamp(loginIds[i],loginPasswords[i]);
          if(checkKotNoStampResult){
            groupErrorList = groupErrorList.concat(checkKotNoStampResult);
          }else{
            throw new Error("checkKotNoStamp result is undefined")
          }

          // 社員番号順に並び変える
          groupErrorList = groupErrorList.sort((a, b) => a[0].localeCompare(b[0], 'ja'));
          errorList = errorList.concat(groupErrorList);
        }
        await postSlack(errorList);
    
      }catch(error){
        console.error('test Error:',error);
      }finally{
        console.log('==== test End ====');
      }
};

handler();