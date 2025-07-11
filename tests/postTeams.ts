export async function postTeams(errorList: string[][]) {
  /*
        slack通知
    */
  try {
    console.log('==== postTeams Start ====');

    const webhookUrl = process.env.TEAMS_URL as string;

    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    // Adaptive Cardのコンポーネント型（必要に応じて詳細化可能）
    type AdaptiveCardElement = {
      type: string;
      [key: string]: any;
    };
    const body: AdaptiveCardElement[] = [];

    body.push({
      type: 'ColumnSet',
      columns: [
        { type: 'Column', width: '3', items: [{ type: 'TextBlock', text: '**社員番号 名前**', wrap: true }] },
        { type: 'Column', width: '2', items: [{ type: 'TextBlock', text: '**日付**', wrap: true }] },
        { type: 'Column', width: '5', items: [{ type: 'TextBlock', text: '**エラー内容**', wrap: true }] },
      ],
    });

    // データ行を追加
    for (const item of errorList) {
      body.push({
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: '3',
            items: [{ type: 'TextBlock', text: item[0], wrap: true }],
          },
          {
            type: 'Column',
            width: '2',
            items: [{ type: 'TextBlock', text: item[1], wrap: true }],
          },
          {
            type: 'Column',
            width: '5',
            items: [{ type: 'TextBlock', text: item[2], wrap: true }],
          },
        ],
      });
    }

    const payload = {
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.2',
            body: body,
          },
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log('メッセージが送信されました');
    } else {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${text}`);
    }
  } catch (error) {
    console.error('postTeams Error:', error);
  } finally {
    console.log('==== postTeams End ====');
  }
}
