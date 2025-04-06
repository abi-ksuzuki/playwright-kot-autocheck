import { WebClient } from '@slack/web-api';
import axios from 'axios';
import csvParser from 'csv-parser';

/**
 * 残業申請CSVを取得する
 * 
 * @returns 残業申請CSV
 */
export async function checkOverApplication() {
  try {
    const client = new WebClient(process.env.SLACK_ATTACHMENTS_TOKEN);
  
    // チャンネルの履歴を取得
    const result = await client.conversations.history({
      channel: process.env.ATTACHMENTS_SLACK_CHANNEL_ID,
    });

    if (result.messages) {
      // メッセージ内の添付ファイルを抽出
      const attachments = result.messages.flatMap(message => message.files || []);
      console.log('添付ファイル:', attachments[0]);
   
      const fileUrl = attachments[0].url_private
      if (!fileUrl) {
        throw new Error('ファイルURLが見つかりませんでした。');
      }
      
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${process.env.SLACK_ATTACHMENTS_TOKEN}` },
        responseType: 'stream',
      });
      
      // CSVの内容を解析
      const csvValues = await attachmentsCsv(response);

      return csvValues;
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

export async function attachmentsCsv(response) {
  const rows = []; // CSVの内容を保存する配列

  return new Promise((resolve, reject) => {
    response.data.pipe(csvParser())
      .on('data', (row) => {
        rows.push(row); // 各行を配列に保存
      })
      .on('end', () => {
        console.log('CSV解析が完了しました！');
        resolve(rows); // 完了後に解析結果を返す
      })
      .on('error', (error) => {
        console.error('CSV解析中にエラーが発生:', error);
        reject(error); // エラー発生時はPromiseをreject
      });
  });
}