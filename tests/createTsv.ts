/**
 * TSVファイルを作成する
 * 
 * @param inputList 対象一覧
 * @returns tsvファイル（バッファ）
 */
export function createTsv(inputList): Buffer<ArrayBuffer> {
    const exportList: string[][] = [];

    // ヘッダ情報
    exportList.push(["名前", "日付", "打刻種別", "打刻時刻", "備考"]);
    for(const input of inputList){
        const name = input[0].substring(6);
        exportList.push([name, input[1], input[2], input[3], input[4]]);

    }
    // メモリ上でTSVデータを作成
    const tsvContent = exportList.map(row => row.join('\t')).join('\n');
    return Buffer.from(tsvContent, 'utf-8');
}