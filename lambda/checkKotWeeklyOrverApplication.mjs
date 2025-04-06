import { OVERTIME_HOURS_IN_THE_LAST_WEEK } from "./constants.mjs";

/**
 * 残業している社員の残業理由を残業申請CSVから取得して設定する
 * 
 * @param overWorkerList 残業者一覧
 * @param csvValues 残業申請一覧
 * @returns 
 */
export async function checkKotWeeklyOrverApplication(overWorkerList, csvValues){
    try{
        // 社員番号とSlackIDのマッピング
        const memberIdMap = getMemberIdMap();
        let beforeWeekOverFlg = false;

        for(const overWorker of overWorkerList){
            const memberId = overWorker[0].substring(0, 5);
            const slackId = memberIdMap.get(memberId);

            for(const value of csvValues){
                if(value.id == slackId){
                    overWorker[2] = (overWorker[2] ? overWorker[2] + "\n" :"") + value.time + " "+ value.text
                }
            }

            if(overWorker[0] === OVERTIME_HOURS_IN_THE_LAST_WEEK){
                beforeWeekOverFlg = true;
            }

            if(beforeWeekOverFlg){
                // 先々週の対象者は残業申請CSVから除外
                overWorker[2] = " "
            } else if(!overWorker[2]){
                overWorker[2] = "残業申請なし"
            }
        }
        return overWorkerList;
    }catch(error){
        console.error('checkKotWeeklyOver Error:',error);
    }finally{
        console.log('==== checkKotWeeklyOver End ====');
    }
}

/**
 * 社員番号とSlackIDのマップを作成
 * 
 * @returns 社員番号、SlackIDのマップ
 */
function getMemberIdMap() {
    const map = new Map();
    const memberIds = process.env.MEMBER_IDS;
    const slackIds = process.env.SLACK_IDS;
    const memberIdArrays = memberIds.split(",");
    const slackIdArrays = slackIds.split(",");
    
    for (let i = 0; i < memberIdArrays.length; i++) {
        map.set(memberIdArrays[i], slackIdArrays[i]);
    }
  
    return map;
  }