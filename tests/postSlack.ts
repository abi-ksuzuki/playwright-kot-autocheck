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

function postSectionFifth(post){
    return{
        "type": "section",
        "fields": [
            {
                "type": "plain_text",
                "text": post[0] + " " + post[1]
            },
            {
                "type": "plain_text",
                "text": post[2] + " " + post[3] + "\n" + post[4]
            }
        ]
    };
}

export async function postSlackAbiWork( errorList: string[][], tsvFile:Buffer<ArrayBuffer> ){
    /*
        slack通知
    */
    try{
        console.log('==== postSlack Start ====');

        let today = new Date();
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}`;
        let blocks: blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":information_source: *" + formattedDate + " KOT におけるABI業務をお知らせします。* :information_source:"
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
                            "text": "*社員番号 名前 日付*"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*打刻種別 打刻時刻 備考*"
                        }
                    ]
                }
            )
            blocks.push({"type": "divider"});
            errorList.forEach(line =>{
                blocks.push(postSectionFifth(line));
                blocks.push({"type": "divider"});
            })
        }else{
            // 打刻エラーがない場合
            blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":exclamation: 締め作業済です :exclamation:"
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
            channel_id: process.env.SLACK_ATTACHMENTS_CHANNEL_ID as string,
            initial_comment: 'ABI業務TSVファイル',
            file: tsvFile,
            filename: 'abiWork.tsv',
        });

    }catch(error){
        console.error('postSlack Error:',error);
    }finally{
        console.log('==== postSlack End ====');
    }
}
