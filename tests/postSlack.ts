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
                "text": post[0] + " " + post[1]
            },
            {
                "type": "plain_text",
                "text": post[2]
            }
        ]
    };
}

export async function postSlack( errorList: string[][] ){
    /*
        slack通知
    */
    try{
        console.log('==== postSlack Start ====');

        let result = false;
        let today = new Date();
        let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let blocks: blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":information_source: *" + formattedDate + " デスクネッツにおける期限が5営業日以内のアンケート未回答をお知らせします。* :information_source:"
                }
            }
        ];
        if(errorList.length > 0){
            // 未回答がある場合
            blocks.push(
                {
                    "type": "section",
                    // 本当はfieldsを3列にしたかったけど
                    // slack-api section fieldsは2列までしか無理だった
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*アンケート 期限*"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*未回答者*"
                        }
                    ]
                }
            )
            blocks.push({"type": "divider"});
            await errorList.forEach(line =>{
                blocks.push(postSection(line));
                blocks.push({"type": "divider"});
            })
        }else{
            // 未回答がない場合
            result = true;
            blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":tada: 未回答はありませんでした。 :tada:"
                    }
                }
            )
            blocks.push({"type": "divider"});
        }

        const chunkSize = 50;
        console.log(blocks);
        const client = new WebClient(process.env.SLACK_BOT_TOKEN as string)

        let channelName = process.env.SLACK_CHANNEL as string;
        if(result){
            // 未回答者がいない場合、起動確認用のチャンネルに通知する
            channelName = process.env.DEBUG_SLACK_CHANNEL as string;
        }

        for (let i = 0; i < blocks.length; i += chunkSize) {
            const chunk = blocks.slice(i, i + chunkSize);
            await client.chat.postMessage({
              text: "デスクネッツにおける期限が5営業日以内のアンケート未回答をお知らせします。",
              channel: channelName,
              blocks: chunk
            })
        }

    }catch(error){
        console.error('postSlack Error:',error);
    }finally{
        console.log('==== postSlack End ====');
    }
}