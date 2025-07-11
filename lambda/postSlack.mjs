import { WebClient } from '@slack/web-api';

function postSection(post) {
  return {
    type: 'section',
    fields: [
      {
        type: 'plain_text',
        text: post[0] + ' ' + post[1],
      },
      {
        type: 'plain_text',
        text: post[2],
      },
    ],
  };
}

export async function postSlack(errorList) {
  /*
        slack通知
    */
  try {
    console.log('==== postSlack Start ====');

    let today = new Date();
    let formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            ':information_source: *' +
            formattedDate +
            ' KOT における未申請の打刻エラーをお知らせします。* :information_source:',
        },
      },
    ];
    if (errorList.length > 0) {
      // 打刻エラーがある場合
      blocks.push({
        type: 'section',
        // 本当はfieldsを3列にしたかったけど
        // slack-api section fieldsは2列までしか無理だった
        fields: [
          {
            type: 'mrkdwn',
            text: '*氏名 日付*',
          },
          {
            type: 'mrkdwn',
            text: '*エラー理由*',
          },
        ],
      });
      blocks.push({ type: 'divider' });
      await errorList.forEach((line) => {
        blocks.push(postSection(line));
        blocks.push({ type: 'divider' });
      });
    } else {
      // 打刻エラーがない場合
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':tada: 未申請の打刻エラーはありませんでした。 :tada:',
        },
      });
      blocks.push({ type: 'divider' });
    }

    const chunkSize = 50;
    console.log(blocks);
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);

    for (let i = 0; i < blocks.length; i += chunkSize) {
      const chunk = blocks.slice(i, i + chunkSize);
      await client.chat.postMessage({
        text: 'KOT における未申請の打刻エラーをお知らせします。',
        channel: process.env.SLACK_CHANNEL,
        blocks: chunk,
      });
    }
  } catch (error) {
    console.error('postSlack Error:', error);
  } finally {
    console.log('==== postSlack End ====');
  }
}
