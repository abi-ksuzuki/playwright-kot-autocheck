import { OVERTIME_HOURS_IN_THE_LAST_WEEK } from "./constants";

/**
 * 残業している社員の残業理由を残業申請CSVから取得して設定する
 * 
 * @param overWorkerList 残業者一覧
 * @param csvValues 残業申請一覧
 * @returns 
 */
export async function checkKotWeeklyOrverApplication(errorList: string[][], csvValues) {
    try{
        // 社員番号とSlackIDのマッピング
        const memberIdMap = getMemberIdMap();
        let beforeWeekOverFlg = false;

        for(const error of errorList){
            const memberId = error[0].substring(0, 5);
            const slackId = memberIdMap.get(memberId);

            for(const value of csvValues){
                if(value.id == slackId){
                    error[2] = (error[2] ? error[2] + "\n" :"") + value.time + " "+ value.text
                }
            }

            if(error[0] === OVERTIME_HOURS_IN_THE_LAST_WEEK){
                beforeWeekOverFlg = true;
            }

            if(beforeWeekOverFlg){
                error[2] = " "
            } else if(!error[2]){
                error[2] = "残業申請なし"
            }
        }
        return errorList;
    }catch(error){
        console.error('checkKotWeeklyOver Error:',error);
    }finally{
        console.log('==== checkKotWeeklyOver End ====');
    }
}


function getMemberIdMap() {
    const map = new Map<string, string>();
    const memberIds = process.env.MEMBER_IDS as String;
    const slackIds = process.env.SLACK_IDS as String;
    const memberIdArrays = memberIds.split(",");
    const slackIdArrays = slackIds.split(",");
    
    for (let i = 0; i < memberIdArrays.length; i++) {
        map.set(memberIdArrays[i], slackIdArrays[i]);
    }
  
    return map;
  }