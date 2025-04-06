import { checkKotErrorStamp } from "./checkKotErrorStamp.mjs";
import { checkKotNoStamp } from "./checkKotNoStamp.mjs";
import { postSlack } from "./postSlack.mjs";

export const handler = async () => {
    try{

        console.log('==== test Start ====');
        let errorList = []
        const loginIds = process.env.KOT_LOGIN_ID.split(',');
        const loginPasswords = process.env.KOT_LOGIN_PASSWORD.split(',');
        // 各グループの認証情報ごと
        for (let i = 0; i < loginIds.length; i += 1) {
          // 打刻エラー確認
          const checkKotErrorStampResult = await checkKotErrorStamp(loginIds[i],loginPasswords[i]);
          if(checkKotErrorStampResult){
            errorList = errorList.concat(checkKotErrorStampResult);
          }else{
            throw new Error("checkKotErrorStamp result is undefined")
          }

          // 打刻なし/スケジュールあり確認
          const checkKotNoStampResult = await checkKotNoStamp(loginIds[i],loginPasswords[i]);
          if(checkKotNoStampResult){
            errorList = errorList.concat(checkKotNoStampResult);
          }else{
            throw new Error("checkKotNoStamp result is undefined")
          }
        }
        await postSlack(errorList);
    
      }catch(error){
        console.error('test Error:',error);
      }finally{
        console.log('==== test End ====');
      }
};