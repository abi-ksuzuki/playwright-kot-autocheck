import { WebClient } from "@slack/web-api";

// 各要素によってネストを変えたいのでtypeを定義
type blocks = [
    {
        "type": string,
        "text"?: {}
        "fields"?: {
            "type": string,
            "text": string
        }[]
    }
]

function postSection(post){
    return{
        "type": "section",
        "fields": [
            {
                "type": "plain_text",
                "text": post[0]
            },
            {
                "type": "plain_text",
                "text": post[1]
            }
        ]
    };
}

function postSectionTriad(post){
    return{
        "type": "section",
        "fields": [
            {
                "type": "plain_text",
                "text": post[0] + " " + post[1]
            },
            {
                "type": "plain_text",
                "text": post[2]
            }
        ]
    };
}

/**
 * 打刻エラー用Slack通知
 * 
 * 氏名 日付 | エラー理由
 * 
 * @param errorList エラー一覧 
 */
export async function postSlack( errorList: string[][] ){
    /*
        slack通知
    */
    try{
        console.log('==== postSlack Start ====');

        let today = new Date();
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let blocks: blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":information_source: *" + formattedDate + " KOT における未申請の打刻エラーをお知らせします。* :information_source:"
                }
            }
        ];
        if(errorList.length > 0){
            // 打刻エラーがある場合
            blocks.push(
                {
                    "type": "section",
                    // 本当はfieldsを3列にしたかったけど
                    // slack-api section fieldsは2列までしか無理だった
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*氏名 日付*"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*エラー理由*"
                        }
                    ]
                }
            )
            blocks.push({"type": "divider"});
            errorList.forEach(line =>{
                blocks.push(postSectionTriad(line));
                blocks.push({"type": "divider"});
            })
        }else{
            // 打刻エラーがない場合
            blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":tada: 未申請の打刻エラーはありませんでした。 :tada:"
                    }
                }
            )
            blocks.push({"type": "divider"});
        }

        const chunkSize = 50;
        console.log(blocks);
        const client = new WebClient(process.env.SLACK_BOT_TOKEN as string)

        for (let i = 0; i < blocks.length; i += chunkSize) {
            const chunk = blocks.slice(i, i + chunkSize);
            await client.chat.postMessage({
              text: "KOT における未申請の打刻エラーをお知らせします。",
              channel: process.env.SLACK_CHANNEL as string,
              blocks: chunk
            })
        }

    }catch(error){
        console.error('postSlack Error:',error);
    }finally{
        console.log('==== postSlack End ====');
    }
}

/**
 * 残業時間用Slack通知
 * 
 * 社員番号 氏名 残業時間（先々週、先週） | エラー理由
 * 
 * @param errorList エラー一覧 
 */
export async function postSlackOverTime( errorList: string[][], tsvFile:Buffer<ArrayBuffer> ){
    /*
        slack通知
    */
    try{
        console.log('==== postSlackOverTime Start ====');

        let today = new Date();
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let blocks: blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":information_source: *" + formattedDate + " KOT における残業時間4時間以上をお知らせします。* :information_source:"
                }
            }
        ];
        if(errorList.length > 0){
            // 打刻エラーがある場合
            blocks.push(
                {
                    "type": "section",
                    // 本当はfieldsを3列にしたかったけど
                    // slack-api section fieldsは2列までしか無理だった
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*社員番号 氏名 残業時間（先々週、先週）*"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*エラー理由*"
                        }
                    ]
                }
            )
            blocks.push({"type": "divider"});
            errorList.forEach(line =>{
                blocks.push(postSectionTriad(line));
                blocks.push({"type": "divider"});
            })
        }else{
            // 打刻エラーがない場合
            blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":tada: 残業時間4時間以上はありませんでした。 :tada:"
                    }
                }
            )
            blocks.push({"type": "divider"});
        }

        const chunkSize = 50;
        console.log(blocks);
        const client = new WebClient(process.env.SLACK_BOT_TOKEN as string)

        for (let i = 0; i < blocks.length; i += chunkSize) {
            const chunk = blocks.slice(i, i + chunkSize);
            await client.chat.postMessage({
              text: "KOT における残業時間4時間以上をお知らせします。",
              channel: process.env.SLACK_CHANNEL as string,
              blocks: chunk
            })
        }

        const attacheClient = new WebClient(process.env.SLACK_ATTACHMENTS_TOKEN as string)
        // 添付ファイル付与
        const result = await attacheClient.filesUploadV2({
            channel_id: process.env.SLACK_CHANNEL_ID as string,
            initial_comment: '残業時間TSVファイル',
            file: tsvFile,
            filename: 'overTime.tsv',
        });

        console.log('File uploaded:', result.files);

    }catch(error){
        console.error('postSlackOverTime Error:',error);
    }finally{
        console.log('==== postSlackOverTime End ====');
    }
}

/**
 * 前月の残業時間用Slack通知
 * 
 * 氏名 | 残業時間
 * 
 * @param overWorkList エラー一覧 
 */
export async function postLastMonthOvertimeSlack( overWorkList: string[][] ){
    /*
        slack通知
    */
    try{
        console.log('==== postLastMonthOvertimeSlack Start ====');

        let today = new Date();
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let blocks: blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":information_source: *" + formattedDate + " KOT における先月残業時間をお知らせします。* :information_source:"
                }
            }
        ];
        if(overWorkList.length > 0){
            // 打刻エラーがある場合
            blocks.push(
                {
                    "type": "section",
                    // 本当はfieldsを3列にしたかったけど
                    // slack-api section fieldsは2列までしか無理だった
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*氏名*"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*残業時間*"
                        }
                    ]
                }
            )
            blocks.push({"type": "divider"});
            overWorkList.forEach(line =>{
                blocks.push(postSection(line));
                blocks.push({"type": "divider"});
            })
        }else{
            // 打刻エラーがない場合
            blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":tada: 残業時間の取得が出来ませんでした。 :tada:"
                    }
                }
            )
            blocks.push({"type": "divider"});
        }

        const chunkSize = 50;
        console.log(blocks);
        const client = new WebClient(process.env.SLACK_BOT_TOKEN as string)

        for (let i = 0; i < blocks.length; i += chunkSize) {
            const chunk = blocks.slice(i, i + chunkSize);
            await client.chat.postMessage({
              text: "KOT における先月の残業時間をお知らせします。",
              channel: process.env.SLACK_CHANNEL as string,
              blocks: chunk
            })
        }

    }catch(error){
        console.error('postLastMonthOvertimeSlack Error:',error);
    }finally{
        console.log('==== postLastMonthOvertimeSlack End ====');
    }
}